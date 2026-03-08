import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { RevueCanvas } from "@/components/communication/communication-canvas"

interface RevuePageProps {
  searchParams: Promise<{ projectId?: string; creativeId?: string }>
}

export default async function RevuePage({ searchParams }: RevuePageProps) {
  const params = await searchParams
  const { projectId, creativeId } = params

  if (!projectId || !creativeId) {
    redirect("/studio")
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch the creative
  const { data: creative } = await supabase
    .from("creatives")
    .select("id, name, project_id, type, status, iteration")
    .eq("id", creativeId)
    .eq("project_id", projectId)
    .single()

  if (!creative) {
    redirect("/studio")
  }

  // Fetch project and client
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, client_id, workmode")
    .eq("id", projectId)
    .single()

  const { data: client } = project?.client_id
    ? await supabase
        .from("clients")
        .select("id, name, logo_url")
        .eq("id", project.client_id)
        .single()
    : { data: null }

  // Fetch iterations for this creative
  const { data: iterationsRaw } = await supabase
    .from("iterations")
    .select("id, version, name, image_url, created_by, created_at")
    .eq("creative_id", creativeId)
    .order("version", { ascending: false })

  const iterationIds = (iterationsRaw || []).map((i) => i.id)

  // Fetch feedbacks for all iterations
  const { data: feedbacksRaw } = iterationIds.length > 0
    ? await supabase
        .from("feedbacks")
        .select("id, iteration_id, number, content, x, y, resolved, source, drawing_id, user_id, created_at")
        .in("iteration_id", iterationIds)
        .order("created_at", { ascending: false })
    : { data: [] }

  // Fetch feedback replies
  const feedbackIds = (feedbacksRaw || []).map((f) => f.id)
  const { data: repliesRaw } = feedbackIds.length > 0
    ? await supabase
        .from("feedback_replies")
        .select("id, feedback_id, user_id, content, created_at")
        .in("feedback_id", feedbackIds)
        .order("created_at", { ascending: true })
    : { data: [] }

  // Fetch drawings for all iterations
  const { data: drawingsRaw } = iterationIds.length > 0
    ? await supabase
        .from("drawings")
        .select("id, iteration_id, type, data, color, stroke_width, created_by, created_at")
        .in("iteration_id", iterationIds)
    : { data: [] }

  // Fetch user profiles for all user_ids involved
  const allUserIds = new Set<string>()
  allUserIds.add(user.id)
  for (const f of feedbacksRaw || []) allUserIds.add(f.user_id)
  for (const r of repliesRaw || []) allUserIds.add(r.user_id)

  const { data: profilesRaw } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", Array.from(allUserIds))

  const profileMap: Record<string, { name: string; avatar?: string }> = {}
  for (const p of profilesRaw || []) {
    profileMap[p.id] = { name: p.full_name || "User", avatar: p.avatar_url || undefined }
  }

  // Also check organization_members for names
  const { data: orgMembersRaw } = await supabase
    .from("organization_members")
    .select("user_id, name, avatar_url")
    .in("user_id", Array.from(allUserIds))

  for (const m of orgMembersRaw || []) {
    if (m.user_id && m.name) {
      profileMap[m.user_id] = { name: m.name, avatar: m.avatar_url || profileMap[m.user_id]?.avatar }
    }
  }

  // Build reply map
  type ReplyRow = { id: string; feedback_id: string; user_id: string; content: string; created_at: string }
  const replyMap: Record<string, ReplyRow[]> = {}
  for (const r of (repliesRaw || []) as ReplyRow[]) {
    if (!replyMap[r.feedback_id]) replyMap[r.feedback_id] = []
    replyMap[r.feedback_id].push(r)
  }

  // Build feedback map per iteration
  type FeedbackRow = { id: string; iteration_id: string; number: string; content: string; x: number; y: number; resolved: boolean; source: string; drawing_id: string | null; user_id: string; created_at: string }
  const feedbackMap: Record<string, FeedbackRow[]> = {}
  for (const f of (feedbacksRaw || []) as FeedbackRow[]) {
    if (!feedbackMap[f.iteration_id]) feedbackMap[f.iteration_id] = []
    feedbackMap[f.iteration_id].push(f)
  }

  // Build drawing map per iteration
  type DrawingRow = { id: string; iteration_id: string; type: string; data: Record<string, unknown>; color: string; stroke_width: number; created_by: string; created_at: string }
  const drawingMap: Record<string, DrawingRow[]> = {}
  for (const d of (drawingsRaw || []) as DrawingRow[]) {
    if (!drawingMap[d.iteration_id]) drawingMap[d.iteration_id] = []
    drawingMap[d.iteration_id].push(d)
  }

  // Assign colors to users
  const userColors = [
    "bg-blue-500", "bg-orange-500", "bg-green-500", "bg-purple-500",
    "bg-pink-500", "bg-cyan-500", "bg-red-500", "bg-amber-500",
  ]
  const userColorMap: Record<string, string> = {}
  let colorIdx = 0
  for (const uid of allUserIds) {
    if (uid === user.id) {
      userColorMap[uid] = "bg-blue-500"
    } else {
      userColorMap[uid] = userColors[colorIdx % userColors.length]
      colorIdx++
    }
  }

  const getUserDisplay = (userId: string) => {
    const profile = profileMap[userId]
    return {
      name: userId === user.id ? "You" : (profile?.name || "User"),
      avatar: profile?.name?.charAt(0) || "U",
      color: userColorMap[userId] || "bg-gray-500",
    }
  }

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} min ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  // Build iterations data for the component
  const iterations = (iterationsRaw || []).map((iter) => {
    const iterFeedbacks = feedbackMap[iter.id] || []
    const iterDrawings = drawingMap[iter.id] || []

    return {
      id: iter.id,
      version: iter.version,
      name: iter.name,
      timestamp: formatRelativeTime(iter.created_at),
      imageUrl: iter.image_url || "",
      feedbacks: iterFeedbacks.map((f) => ({
        id: f.id,
        number: f.number,
        user: getUserDisplay(f.user_id),
        content: f.content,
        timestamp: formatRelativeTime(f.created_at),
        resolved: f.resolved,
        source: f.source as "client" | "team",
        x: f.x || 0,
        y: f.y || 0,
        drawingId: f.drawing_id || undefined,
        replies: (replyMap[f.id] || []).map((r) => ({
          id: r.id,
          user: getUserDisplay(r.user_id),
          content: r.content,
          timestamp: formatRelativeTime(r.created_at),
        })),
      })),
      drawings: iterDrawings.map((d) => {
        const data = d.data as Record<string, unknown>
        return {
          id: d.id,
          type: d.type as "draw" | "shape",
          points: data.points as { x: number; y: number }[] | undefined,
          pathData: data.pathData as string | undefined,
          rect: data.rect as { x: number; y: number; width: number; height: number } | undefined,
          ellipse: data.ellipse as { cx: number; cy: number; rx: number; ry: number } | undefined,
          line: data.line as { x1: number; y1: number; x2: number; y2: number } | undefined,
          shapeType: data.shapeType as "rectangle" | "circle" | "line" | "arrow" | undefined,
          color: d.color,
          strokeWidth: d.stroke_width,
        }
      }),
      aiSuggestions: [],
    }
  })

  const currentUser = getUserDisplay(user.id)

  // Fetch user role from organization_members
  const { data: memberData } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .single()

  const userRole = (memberData?.role as "owner" | "designer" | "client") || "client"

  return (
    <RevueCanvas
      creativeId={creativeId}
      projectId={projectId}
      creativeName={creative.name}
      projectName={project?.name || ""}
      clientId={client?.id || ""}
      clientName={client?.name || ""}
      clientLogo={client?.logo_url || ""}
      initialIterations={iterations}
      currentUser={currentUser}
      userRole={userRole}
      workmode={(project?.workmode as "creative" | "productive") || "productive"}
    />
  )
}
