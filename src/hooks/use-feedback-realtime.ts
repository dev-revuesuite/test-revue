"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Feedback, Comment } from "@/types/revue-tool"

export function useFeedbackRealtime(iterationId: string | null) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch feedbacks for the current iteration
  const fetchFeedbacks = useCallback(async () => {
    if (!iterationId) {
      setFeedbacks([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const supabase = createClient()

      const { data, error: fetchError } = await supabase
        .from("feedbacks")
        .select("*, comments(*)")
        .eq("iteration_id", iterationId)
        .order("created_at", { ascending: true })

      if (fetchError) throw fetchError

      setFeedbacks(data || [])
      setError(null)
    } catch (err) {
      console.error("Error fetching feedbacks:", err)
      setError("Failed to load feedbacks")
    } finally {
      setIsLoading(false)
    }
  }, [iterationId])

  // Set up realtime subscription
  useEffect(() => {
    if (!iterationId) return

    const supabase = createClient()

    // Subscribe to changes on feedbacks table
    const feedbackChannel = supabase
      .channel(`feedbacks:${iterationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "feedbacks",
          filter: `iteration_id=eq.${iterationId}`,
        },
        (payload) => {
          const newFeedback = payload.new as Feedback
          setFeedbacks((prev) => [...prev, { ...newFeedback, comments: [] }])
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "feedbacks",
          filter: `iteration_id=eq.${iterationId}`,
        },
        (payload) => {
          const updatedFeedback = payload.new as Feedback
          setFeedbacks((prev) =>
            prev.map((f) =>
              f.id === updatedFeedback.id
                ? { ...updatedFeedback, comments: f.comments }
                : f
            )
          )
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "feedbacks",
          filter: `iteration_id=eq.${iterationId}`,
        },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id
          setFeedbacks((prev) => prev.filter((f) => f.id !== deletedId))
        }
      )
      .subscribe()

    // Subscribe to changes on comments table
    const commentChannel = supabase
      .channel(`comments:${iterationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comments",
        },
        (payload) => {
          const newComment = payload.new as Comment
          setFeedbacks((prev) =>
            prev.map((f) =>
              f.id === newComment.feedback_id
                ? { ...f, comments: [...(f.comments || []), newComment] }
                : f
            )
          )
        }
      )
      .subscribe()

    // Initial fetch
    fetchFeedbacks()

    return () => {
      supabase.removeChannel(feedbackChannel)
      supabase.removeChannel(commentChannel)
    }
  }, [iterationId, fetchFeedbacks])

  // Add a new comment
  const addComment = useCallback(
    async (feedbackId: string, content: string, userName: string = "You") => {
      try {
        const supabase = createClient()

        const { data, error: insertError } = await supabase
          .from("comments")
          .insert({
            feedback_id: feedbackId,
            content,
            user_name: userName,
          })
          .select()
          .single()

        if (insertError) throw insertError

        // Optimistic update (realtime will also update)
        setFeedbacks((prev) =>
          prev.map((f) =>
            f.id === feedbackId
              ? { ...f, comments: [...(f.comments || []), data] }
              : f
          )
        )

        return { success: true }
      } catch (err) {
        console.error("Error adding comment:", err)
        return { success: false, error: "Failed to add comment" }
      }
    },
    []
  )

  return {
    feedbacks,
    setFeedbacks,
    isLoading,
    error,
    refetch: fetchFeedbacks,
    addComment,
  }
}
