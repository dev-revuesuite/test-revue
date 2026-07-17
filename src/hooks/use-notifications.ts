"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  mapNotificationRow,
  sortNotifications,
} from "@/lib/notifications/utils"
import type { NotificationItem, NotificationRow } from "@/types/notifications"

const NOTIFICATION_COLUMNS =
  "id,created_at,updated_at,recipient_id,organization_id,actor_id,type,title,body,link,resource_type,resource_id,group_key,count,read_at,metadata"

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

interface UseNotificationsOptions {
  previewLimit?: number
  enabled?: boolean
  /** Skip auth.getUser when the parent already knows the signed-in user */
  userId?: string | null
}

interface UseNotificationsResult {
  notifications: NotificationItem[]
  unreadCount: number
  loading: boolean
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  refresh: () => Promise<void>
}

export function useNotifications(
  organizationId: string | null | undefined,
  options: UseNotificationsOptions = {}
): UseNotificationsResult {
  const { previewLimit = 20, enabled = true, userId: userIdProp } = options
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(
    userIdProp ?? null
  )
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const notificationsRef = useRef(notifications)
  notificationsRef.current = notifications

  const userId = userIdProp ?? resolvedUserId

  useEffect(() => {
    if (userIdProp) {
      setResolvedUserId(userIdProp)
    }
  }, [userIdProp])

  const upsertFromRow = useCallback(
    (row: NotificationRow) => {
      const item = mapNotificationRow(row)
      setNotifications((prev) => {
        const idx = prev.findIndex((n) => n.id === item.id)
        const next =
          idx >= 0
            ? prev.map((n, i) => (i === idx ? item : n))
            : [item, ...prev]
        return sortNotifications(next).slice(0, previewLimit)
      })
    },
    [previewLimit]
  )

  const fetchUnreadCount = useCallback(
    async (uid: string, orgId: string) => {
      const supabase = createClient()
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", uid)
        .eq("organization_id", orgId)
        .is("read_at", null)

      if (error) {
        logSupabaseError("Failed to fetch unread notification count:", error)
        return
      }

      setUnreadCount(count ?? 0)
    },
    []
  )

  const fetchNotifications = useCallback(async () => {
    if (!enabled || !organizationId || !userId) {
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
      return
    }

    setLoading(true)
    const supabase = createClient()

    const [listResult] = await Promise.all([
      supabase
        .from("notifications")
        .select(NOTIFICATION_COLUMNS)
        .eq("recipient_id", userId)
        .eq("organization_id", organizationId)
        .order("updated_at", { ascending: false })
        .limit(previewLimit),
      fetchUnreadCount(userId, organizationId),
    ])

    if (listResult.error) {
      logSupabaseError("Failed to fetch notifications:", listResult.error)
      setNotifications([])
    } else {
      const rows = (listResult.data ?? []) as NotificationRow[]
      setNotifications(sortNotifications(rows.map(mapNotificationRow)))
    }

    setLoading(false)
  }, [
    enabled,
    organizationId,
    userId,
    previewLimit,
    fetchUnreadCount,
  ])

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
    void fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    if (!enabled || !organizationId || !userId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`notifications:${userId}:${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow
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
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow
          const oldRow = payload.old as Partial<NotificationRow>
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
        // Unread count already loaded with the list — only refetch on channel failure
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          void fetchNotifications()
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [
    enabled,
    organizationId,
    userId,
    upsertFromRow,
    fetchNotifications,
  ])

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!userId) return

      const wasUnread = notificationsRef.current.some(
        (n) => n.id === notificationId && !n.read
      )
      const readAt = new Date().toISOString()

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? {
                ...n,
                read: true,
              }
            : n
        )
      )

      if (wasUnread) {
        setUnreadCount((count) => Math.max(0, count - 1))
      }

      const supabase = createClient()
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: readAt })
        .eq("id", notificationId)
        .eq("recipient_id", userId)

      if (error) {
        logSupabaseError("Failed to mark notification as read:", error)
        void fetchNotifications()
      }
    },
    [userId, fetchNotifications]
  )

  const markAllAsRead = useCallback(async () => {
    if (!userId || !organizationId) return

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)

    const supabase = createClient()
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", userId)
      .eq("organization_id", organizationId)
      .is("read_at", null)

    if (error) {
      logSupabaseError("Failed to mark all notifications as read:", error)
      void fetchNotifications()
    }
  }, [userId, organizationId, fetchNotifications])

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  }
}
