"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { mapMessageRow, sortMessages } from "@/lib/messages/utils"
import type { MessageItem, MessageRow } from "@/types/messages"

const MESSAGE_COLUMNS =
  "id,created_at,updated_at,recipient_id,organization_id,actor_id,type,title,body,link,resource_type,resource_id,thread_key,count,read_at,metadata"

function logSupabaseError(context: string, error: unknown) {
  if (!error || typeof error !== "object") {
    console.error(context, error)
    return
  }

  const err = error as {
    message?: string
    code?: string
    details?: string
    hint?: string
  }

  console.error(context, {
    message: err.message ?? null,
    code: err.code ?? null,
    details: err.details ?? null,
    hint: err.hint ?? null,
  })
}

interface UseMessagesOptions {
  previewLimit?: number
  enabled?: boolean
  userId?: string | null
}

interface UseMessagesResult {
  messages: MessageItem[]
  unreadCount: number
  loading: boolean
  fetchError: string | null
  markAsRead: (messageId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  refresh: () => Promise<void>
}

export function useMessages(
  organizationId: string | null | undefined,
  options: UseMessagesOptions = {}
): UseMessagesResult {
  const { previewLimit = 20, enabled = true, userId: userIdProp } = options
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(
    userIdProp ?? null
  )
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  const userId = userIdProp ?? resolvedUserId

  useEffect(() => {
    if (userIdProp) {
      setResolvedUserId(userIdProp)
    }
  }, [userIdProp])

  const upsertFromRow = useCallback(
    (row: MessageRow) => {
      const item = mapMessageRow(row)
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === item.id)
        const next =
          idx >= 0
            ? prev.map((m, i) => (i === idx ? item : m))
            : [item, ...prev]
        return sortMessages(next).slice(0, previewLimit)
      })
    },
    [previewLimit]
  )

  const fetchUnreadCount = useCallback(async (uid: string, orgId: string) => {
    const supabase = createClient()
    const { count, error } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", uid)
      .eq("organization_id", orgId)
      .is("read_at", null)

    if (error) {
      logSupabaseError("Failed to fetch unread message count:", error)
      return
    }

    setUnreadCount(count ?? 0)
  }, [])

  const fetchMessages = useCallback(async () => {
    if (!enabled || !organizationId || !userId) {
      setMessages([])
      setUnreadCount(0)
      setFetchError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setFetchError(null)
    const supabase = createClient()

    const [listResult] = await Promise.all([
      supabase
        .from("messages")
        .select(MESSAGE_COLUMNS)
        .eq("recipient_id", userId)
        .eq("organization_id", organizationId)
        .order("updated_at", { ascending: false })
        .limit(previewLimit),
      fetchUnreadCount(userId, organizationId),
    ])

    if (listResult.error) {
      logSupabaseError("Failed to fetch messages:", listResult.error)
      const err = listResult.error as { message?: string }
      setFetchError(
        err.message ??
          "Could not load messages. Run the messages backfill/grants SQL in Supabase."
      )
      setMessages([])
    } else {
      const rows = (listResult.data ?? []) as MessageRow[]
      setMessages(sortMessages(rows.map(mapMessageRow)))
    }

    setLoading(false)
  }, [enabled, organizationId, userId, previewLimit, fetchUnreadCount])

  useEffect(() => {
    if (userIdProp) return

    const supabase = createClient()
    let cancelled = false

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!cancelled) {
        setResolvedUserId(user?.id ?? null)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setResolvedUserId(session?.user?.id ?? null)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [userIdProp])

  useEffect(() => {
    void fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    if (!enabled || !organizationId || !userId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`messages:${userId}:${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as MessageRow
          if (row.organization_id !== organizationId) return
          upsertFromRow(row)
          if (!row.read_at) {
            setUnreadCount((count) => count + 1)
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as MessageRow
          const oldRow = payload.old as Partial<MessageRow>
          if (row.organization_id !== organizationId) return

          upsertFromRow(row)

          const wasUnread = !oldRow.read_at
          const isUnread = !row.read_at
          if (wasUnread && !isUnread) {
            setUnreadCount((count) => Math.max(0, count - 1))
          } else if (!wasUnread && isUnread) {
            setUnreadCount((count) => count + 1)
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          void fetchMessages()
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [enabled, organizationId, userId, upsertFromRow, fetchMessages])

  const markAsRead = useCallback(
    async (messageId: string) => {
      if (!userId) return

      const wasUnread = messagesRef.current.some(
        (m) => m.id === messageId && !m.read
      )
      const readAt = new Date().toISOString()

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                read: true,
              }
            : m
        )
      )

      if (wasUnread) {
        setUnreadCount((count) => Math.max(0, count - 1))
      }

      const supabase = createClient()
      const { error } = await supabase
        .from("messages")
        .update({ read_at: readAt })
        .eq("id", messageId)
        .eq("recipient_id", userId)

      if (error) {
        logSupabaseError("Failed to mark message as read:", error)
        void fetchMessages()
      }
    },
    [userId, fetchMessages]
  )

  const markAllAsRead = useCallback(async () => {
    if (!userId || !organizationId) return

    setMessages((prev) => prev.map((m) => ({ ...m, read: true })))
    setUnreadCount(0)

    const supabase = createClient()
    const { error } = await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", userId)
      .eq("organization_id", organizationId)
      .is("read_at", null)

    if (error) {
      logSupabaseError("Failed to mark all messages as read:", error)
      void fetchMessages()
    }
  }, [userId, organizationId, fetchMessages])

  return {
    messages,
    unreadCount,
    loading,
    fetchError,
    markAsRead,
    markAllAsRead,
    refresh: fetchMessages,
  }
}
