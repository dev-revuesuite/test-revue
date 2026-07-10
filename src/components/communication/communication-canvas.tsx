"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { CommunicationHeader } from "./communication-header";
import { CommunicationSidebar } from "./communication-sidebar";
import { CommentsPanel, Feedback, ReplyItem, AIAnalysisType, AISuggestion } from "./comments-panel";
import { ZoomControls } from "./zoom-controls";
import { CanvasArea } from "./canvas-area";
import type { PdfPageViewerReadyPayload } from "./pdf-page-viewer";
import { ShareDialog } from "./share-dialog";
import { NewIterationDialog } from "./new-iteration-dialog";
import { ShapeType, DrawingPath } from "@/lib/fabric";
import { getMediaTypeFromFile, getMediaTypeFromUrl, type MediaType } from "@/lib/media-type";
import { getPdfPageCountFromUrl } from "@/lib/pdf-page-count";
import { captureCreativeMediaForAnalysis } from "@/lib/capture-creative-media";
import { apiPath } from "@/lib/base-path";
import { downloadCreativeInBrowser } from "@/lib/download-creative-client";
import type { ClientAnalysisImageInput } from "@/lib/ai-analysis-client-image";
import { PdfPagePager } from "./pdf-page-pager";

function feedbackPageNumber(f: Feedback): number {
  return f.pageNumber ?? 1;
}

function drawingPageNumber(d: DrawingPath): number {
  return d.pageNumber ?? 1;
}

function aiSuggestionPageNumber(s: AISuggestion): number {
  return s.pageNumber ?? 1;
}

function normalizeIteration(iter: Iteration): Iteration {
  return {
    ...iter,
    mediaType: iter.mediaType ?? getMediaTypeFromUrl(iter.imageUrl),
    pageCount: iter.pageCount ?? null,
    feedbacks: iter.feedbacks.map((f) => ({
      ...f,
      pageNumber: f.pageNumber ?? 1,
    })),
    drawings: iter.drawings.map((d) => ({
      ...d,
      pageNumber: d.pageNumber ?? 1,
    })),
    aiSuggestions: iter.aiSuggestions.map((s) => ({
      ...s,
      pageNumber: s.pageNumber ?? 1,
    })),
  };
}

// Define iteration type with image, feedbacks, drawings, and AI suggestions
interface Iteration {
  id: string;
  version: number;
  name: string;
  timestamp: string;
  imageUrl: string;
  mediaType: MediaType;
  pageCount?: number | null;
  feedbacks: Feedback[];
  drawings: DrawingPath[];
  aiSuggestions: AISuggestion[];
}

// Props for the Revue canvas
interface RevueCanvasProps {
  creativeId?: string;
  projectId?: string;
  creativeName?: string;
  projectName?: string;
  clientId?: string;
  clientName?: string;
  clientLogo?: string;
  initialIterations?: Iteration[];
  currentUser?: { name: string; avatar: string; color: string };
  userRole?: "owner" | "admin" | "designer" | "client";
  workmode?: "creative" | "productive";
}

// Default current user
const defaultUser = {
  name: "You",
  avatar: "Y",
  color: "bg-blue-500",
};

export function CommunicationCanvas() {
  return <RevueCanvas />;
}

export function RevueCanvas({
  creativeId,
  projectId,
  creativeName,
  projectName,
  clientId,
  clientName,
  clientLogo,
  initialIterations: propIterations,
  currentUser: propCurrentUser,
  userRole = "client",
  workmode = "productive",
}: RevueCanvasProps = {}) {
  const supabase = createClient();
  const currentUser = propCurrentUser || defaultUser;
  const startIterations = (propIterations || []).map(normalizeIteration);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Role-based permissions ("admin" is the studio role used elsewhere in the app
  // and is treated as the organization owner here).
  const canUploadIterations =
    userRole === "owner" || userRole === "admin" || userRole === "designer";
  const canAddFeedback =
    userRole === "owner" ||
    userRole === "admin" ||
    userRole === "client" ||
    userRole === "designer";
  const canRunAiAnalysis =
    userRole === "owner" || userRole === "admin" || userRole === "designer";
  const canUseSidebar = true; // everyone can view

  const [zoom, setZoom] = useState(100);
  const [selectedTool, setSelectedTool] = useState("pointer");
  const [showComments, setShowComments] = useState(true);
  const [iterations, setIterations] = useState<Iteration[]>(startIterations);
  const iterationsRef = useRef<Iteration[]>(startIterations);
  // Keep ref in sync with state
  iterationsRef.current = iterations;
  // Track IDs added locally to skip realtime duplicates
  const localFeedbackIdsRef = useRef<Set<string>>(new Set());
  const localReplyIdsRef = useRef<Set<string>>(new Set());
  const localDrawingIdsRef = useRef<Set<string>>(new Set());
  const [activeIterationId, setActiveIterationId] = useState(startIterations[0]?.id || "1");
  const [highlightedFeedback, setHighlightedFeedback] = useState<string | null>(null);
  const [openFeedbackId, setOpenFeedbackId] = useState<string | null>(null);

  // Dialog states
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showNewIterationDialog, setShowNewIterationDialog] = useState(startIterations.length === 0 && canUploadIterations);

  // Compare mode state
  const [compareMode, setCompareMode] = useState(false);
  const [compareIterationId, setCompareIterationId] = useState<string | null>(null);

  // PDF page (pager UI in Phase 5; page 1 for Phase 3)
  const [currentPage, setCurrentPage] = useState(1);

  // Rotation state
  const [rotation, setRotation] = useState(0);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Drawing customization state
  const [drawingColor, setDrawingColor] = useState("#FF5733");
  const [shapeType, setShapeType] = useState<ShapeType>("rectangle");

  // Highlight state for sidebar selection (drawing associated with selected feedback)
  const [highlightDrawingId, setHighlightDrawingId] = useState<string | null>(null);

  // AI Analysis state
  const [aiAnalysisActive, setAiAnalysisActive] = useState(false);
  const [aiAnalysisType, setAiAnalysisType] = useState<AIAnalysisType | null>(null);
  const [viewMode, setViewMode] = useState<"view" | "comments" | "ai">("comments"); // View mode for annotations
  const [showAIAnalysisOptions, setShowAIAnalysisOptions] = useState(false); // Control sidebar AI options panel

  // Hold eye button — temporarily hide canvas overlays
  const [overlaysPeekHidden, setOverlaysPeekHidden] = useState(false);

  useEffect(() => {
    if (!overlaysPeekHidden) return;

    const endPeek = () => setOverlaysPeekHidden(false);
    window.addEventListener("pointerup", endPeek);
    window.addEventListener("pointercancel", endPeek);
    return () => {
      window.removeEventListener("pointerup", endPeek);
      window.removeEventListener("pointercancel", endPeek);
    };
  }, [overlaysPeekHidden]);

  // Bottom-left toast notification
  const [toast, setToast] = useState<{ message: string; tone: "info" | "error" } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback(
    (message: string, tone: "info" | "error" = "info") => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToast({ message, tone });
      toastTimerRef.current = setTimeout(() => setToast(null), 4000);
    },
    []
  );
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Profile cache for resolving user names from realtime events
  const profileCacheRef = useRef<Record<string, { name: string; avatar: string; color: string }>>({});
  // Cache the current auth user ID to identify "You" in realtime events
  const authUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (authUser) authUserIdRef.current = authUser.id;
    });
  }, [supabase]);

  // Fetch a user profile and cache it (checks profiles + organization_members like server does)
  const resolveUser = useCallback(async (userId: string): Promise<{ name: string; avatar: string; color: string }> => {
    // If this is the current user, return the currentUser prop (shows "You")
    if (authUserIdRef.current && userId === authUserIdRef.current) {
      return currentUser;
    }
    if (profileCacheRef.current[userId]) return profileCacheRef.current[userId];

    const [{ data: profileData }, { data: memberData }] = await Promise.all([
      supabase.from("profiles").select("full_name, avatar_url").eq("id", userId).single(),
      supabase.from("organization_members").select("name, avatar_url").eq("user_id", userId).single(),
    ]);

    const name = memberData?.name || profileData?.full_name || "User";
    const colors = ["bg-orange-500", "bg-green-500", "bg-purple-500", "bg-pink-500", "bg-cyan-500", "bg-red-500", "bg-amber-500"];
    const colorIdx = Object.keys(profileCacheRef.current).length % colors.length;
    const profile = {
      name,
      avatar: name.charAt(0),
      color: colors[colorIdx],
    };
    profileCacheRef.current[userId] = profile;
    return profile;
  }, [supabase, currentUser]);

  // Realtime subscriptions for feedbacks, replies, and drawings
  useEffect(() => {
    if (!creativeId) return;

    const channel = supabase
      .channel(`revue-${creativeId}`)
      // Listen for new feedbacks
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "feedbacks" },
        async (payload) => {
          const row = payload.new as {
            id: string; iteration_id: string; number: string; content: string;
            x: number; y: number; resolved: boolean; source: string;
            drawing_id: string | null; user_id: string; created_at: string;
            page_number?: number;
          };
          if (localFeedbackIdsRef.current.has(row.id)) return;
          const currentIterations = iterationsRef.current;
          const iterationIds = currentIterations.map(i => i.id);
          if (!iterationIds.includes(row.iteration_id)) return;
          const existing = currentIterations.find(i => i.id === row.iteration_id)?.feedbacks.find(f => f.id === row.id);
          if (existing) return;

          const user = await resolveUser(row.user_id);
          const newFeedback: Feedback = {
            id: row.id,
            number: row.number,
            user,
            content: row.content,
            timestamp: "Just now",
            resolved: row.resolved,
            source: row.source as "client" | "team",
            x: row.x || 0,
            y: row.y || 0,
            pageNumber: row.page_number ?? 1,
            replies: [],
            drawingId: row.drawing_id || undefined,
          };

          setIterations(prev => prev.map(iter =>
            iter.id === row.iteration_id
              ? { ...iter, feedbacks: [newFeedback, ...iter.feedbacks] }
              : iter
          ));
        }
      )
      // Listen for new replies
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "feedback_replies" },
        async (payload) => {
          const row = payload.new as {
            id: string; feedback_id: string; user_id: string; content: string; created_at: string;
          };
          if (localReplyIdsRef.current.has(row.id)) return;
          const currentIterations = iterationsRef.current;
          const parentIteration = currentIterations.find(i =>
            i.feedbacks.some(f => f.id === row.feedback_id)
          );
          if (!parentIteration) return;
          const existingReply = parentIteration.feedbacks
            .find(f => f.id === row.feedback_id)?.replies
            .find(r => r.id === row.id);
          if (existingReply) return;

          const user = await resolveUser(row.user_id);
          const newReply: ReplyItem = {
            id: row.id,
            user,
            content: row.content,
            timestamp: "Just now",
          };

          setIterations(prev => prev.map(iter => ({
            ...iter,
            feedbacks: iter.feedbacks.map(f =>
              f.id === row.feedback_id
                ? { ...f, replies: [...f.replies, newReply] }
                : f
            ),
          })));
        }
      )
      // Listen for new drawings
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "drawings" },
        (payload) => {
          const row = payload.new as {
            id: string; iteration_id: string; type: string;
            data: {
              points?: { x: number; y: number }[];
              pathData?: string;
              rect?: { x: number; y: number; width: number; height: number };
              ellipse?: { cx: number; cy: number; rx: number; ry: number };
              line?: { x1: number; y1: number; x2: number; y2: number };
              shapeType?: string;
            };
            color: string; stroke_width: number; created_by: string; created_at: string;
            page_number?: number;
          };
          if (localDrawingIdsRef.current.has(row.id)) return;
          const currentIterations = iterationsRef.current;
          const iterationIds = currentIterations.map(i => i.id);
          if (!iterationIds.includes(row.iteration_id)) return;
          const existing = currentIterations.find(i => i.id === row.iteration_id)?.drawings.find(d => d.id === row.id);
          if (existing) return;

          const newDrawing: DrawingPath = {
            id: row.id,
            type: row.type as "draw" | "shape",
            points: row.data?.points,
            pathData: row.data?.pathData,
            rect: row.data?.rect,
            ellipse: row.data?.ellipse,
            line: row.data?.line,
            shapeType: row.data?.shapeType as DrawingPath["shapeType"],
            color: row.color,
            strokeWidth: row.stroke_width,
            pageNumber: row.page_number ?? 1,
          };

          setIterations(prev => prev.map(iter =>
            iter.id === row.iteration_id
              ? { ...iter, drawings: [...iter.drawings, newDrawing] }
              : iter
          ));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  // Only re-subscribe when creativeId changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creativeId]);

  // Get current iteration
  const currentIteration = iterations.find(i => i.id === activeIterationId) || iterations[0];
  const currentFeedbacks = currentIteration?.feedbacks || [];
  const allDrawings = currentIteration?.drawings || [];
  const currentAiSuggestions = currentIteration?.aiSuggestions || [];
  const isPdfIteration = currentIteration?.mediaType === "pdf";
  const pageFilteredAiSuggestions = isPdfIteration
    ? currentAiSuggestions.filter(
        (s) => aiSuggestionPageNumber(s) === currentPage
      )
    : currentAiSuggestions;
  const effectivePageCount = Math.max(
    1,
    currentIteration?.pageCount ?? 1
  );

  // Clamp current page when page count or iteration changes
  useEffect(() => {
    if (currentPage > effectivePageCount) {
      setCurrentPage(effectivePageCount);
    }
  }, [activeIterationId, effectivePageCount, currentPage]);

  const pageFilteredFeedbacks = isPdfIteration
    ? currentFeedbacks.filter((f) => feedbackPageNumber(f) === currentPage)
    : currentFeedbacks;

  const pageFilteredDrawings = isPdfIteration
    ? allDrawings.filter((d) => drawingPageNumber(d) === currentPage)
    : allDrawings;

  const handleDownloadCreative = useCallback(async () => {
    const iteration = iterations.find((item) => item.id === activeIterationId) ?? currentIteration
    if (!iteration?.imageUrl) {
      showToast("No file available to download", "error")
      return
    }

    try {
      await downloadCreativeInBrowser(iteration.imageUrl, {
        creativeName: creativeName || iteration.name,
        version: iteration.version,
        mediaType: iteration.mediaType,
      })
    } catch (error) {
      console.error("Failed to download creative:", error)
      showToast(
        error instanceof Error ? error.message : "Failed to download creative",
        "error"
      )
    }
  }, [activeIterationId, creativeName, currentIteration, iterations, showToast])

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 5, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 5, 10));

  // Fullscreen editor mode toggle (hides header, sidebar, comments panel)
  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // Get the next feedback number for the current iteration
  const getNextFeedbackNumber = useCallback(() => {
    if (!currentIteration) return 1;
    const iterationFeedbacks = currentFeedbacks.filter(f =>
      f.number.startsWith(`${currentIteration.version}.`)
    );
    return iterationFeedbacks.length + 1;
  }, [currentFeedbacks, currentIteration]);

  // Handle tool selection
  const handleSelectTool = (tool: string) => {
    if (tool === "compare") {
      setCompareMode(!compareMode);
      if (!compareMode && iterations.length > 1) {
        // Default to previous iteration
        const prevIteration = iterations.find(i => i.version === (currentIteration?.version || 0) - 1);
        setCompareIterationId(prevIteration?.id || iterations[1]?.id || null);
      }
      setSelectedTool("pointer");
    } else if (tool === "rotate") {
      setRotation(prev => (prev + 90) % 360);
    } else {
      setSelectedTool(tool);
    }
  };

  // Determine feedback source based on role
  const feedbackSource = userRole === "client" ? "client" : "team";

  // Add new feedback from canvas
  const handleAddFeedback = (feedback: {
    id: string;
    number: string;
    content: string;
    x: number;
    y: number;
    drawing?: DrawingPath;
  }) => {
    if (!canAddFeedback) return;

    const newFeedback: Feedback = {
      id: feedback.id,
      number: feedback.number,
      user: currentUser,
      content: feedback.content,
      timestamp: "Just now",
      resolved: false,
      source: feedbackSource,
      x: feedback.x,
      y: feedback.y,
      pageNumber: isPdfIteration ? currentPage : 1,
      replies: [],
      drawingId: feedback.drawing?.id,
    };

    setIterations(prev => prev.map(iteration =>
      iteration.id === activeIterationId
        ? { ...iteration, feedbacks: [newFeedback, ...iteration.feedbacks] }
        : iteration
    ));

    // Track locally by real id to prevent realtime duplicate echo
    localFeedbackIdsRef.current.add(feedback.id);

    // Persist to DB (use the same id so the realtime broadcast matches the optimistic row)
    if (creativeId) {
      supabase.auth.getUser().then(({ data: { user: authUser } }) => {
        if (authUser) {
          supabase.from("feedbacks").insert({
            id: feedback.id,
            iteration_id: activeIterationId,
            number: feedback.number,
            content: feedback.content,
            x: feedback.x,
            y: feedback.y,
            resolved: false,
            source: feedbackSource,
            drawing_id: feedback.drawing?.id || null,
            user_id: authUser.id,
            page_number: isPdfIteration ? currentPage : 1,
          }).then(({ error }) => {
            if (error) console.error("Failed to save feedback:", error);
          });
        }
      });
    }
  };

  // Update drawings for current iteration (merge other PDF pages when filtering)
  const handleDrawingsChange = (newPageDrawings: DrawingPath[]) => {
    setIterations((prev) =>
      prev.map((iteration) => {
        if (iteration.id !== activeIterationId) return iteration;

        if (iteration.mediaType !== "pdf") {
          return { ...iteration, drawings: newPageDrawings };
        }

        const otherPages = iteration.drawings.filter(
          (d) => drawingPageNumber(d) !== currentPage
        );
        const taggedForPage = newPageDrawings.map((d) => ({
          ...d,
          pageNumber: currentPage,
        }));
        return {
          ...iteration,
          drawings: [...otherPages, ...taggedForPage],
        };
      })
    );

    // Persist new drawings to DB
    if (creativeId) {
      const existingIds = (iterationsRef.current.find(i => i.id === activeIterationId)?.drawings || []).map(d => d.id);
      const added = newPageDrawings.filter(d => !existingIds.includes(d.id));
      if (added.length > 0) {
        // Track locally to prevent realtime duplicate
        for (const d of added) localDrawingIdsRef.current.add(d.id);
        supabase.auth.getUser().then(({ data: { user: authUser } }) => {
          if (authUser) {
            for (const d of added) {
              const pageNum =
                d.pageNumber ??
                (iterationsRef.current.find((i) => i.id === activeIterationId)
                  ?.mediaType === "pdf"
                  ? currentPage
                  : 1);
              supabase.from("drawings").upsert({
                id: d.id,
                iteration_id: activeIterationId,
                type: d.type,
                data: {
                  points: d.points,
                  pathData: d.pathData,
                  rect: d.rect,
                  ellipse: d.ellipse,
                  line: d.line,
                  shapeType: d.shapeType,
                },
                color: d.color,
                stroke_width: d.strokeWidth,
                created_by: authUser.id,
                page_number: pageNum,
              }).then(({ error }) => {
                if (error) console.error("Failed to save drawing:", error);
              });
            }
          }
        });
      }
    }
  };

  // Add reply to feedback
  const handleAddReply = (feedbackId: string, reply: ReplyItem) => {
    // Generate a real UUID so the optimistic id, DB id, and realtime payload id all match.
    // This makes dedupe robust (was previously keyed on feedback_id + content, which collides).
    const replyId = (typeof crypto !== "undefined" && "randomUUID" in crypto)
      ? crypto.randomUUID()
      : `${feedbackId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const replyWithId: ReplyItem = { ...reply, id: replyId };

    setIterations(prev => prev.map(iteration =>
      iteration.id === activeIterationId
        ? {
            ...iteration,
            feedbacks: iteration.feedbacks.map(f =>
              f.id === feedbackId
                ? { ...f, replies: [...f.replies, replyWithId] }
                : f
            )
          }
        : iteration
    ));

    // Track locally by real id to prevent realtime duplicate echo
    localReplyIdsRef.current.add(replyId);

    // Persist reply to DB (use same id so realtime broadcast matches the optimistic row)
    if (creativeId) {
      supabase.auth.getUser().then(({ data: { user: authUser } }) => {
        if (!authUser) return;
        supabase.from("feedback_replies").insert({
          id: replyId,
          feedback_id: feedbackId,
          user_id: authUser.id,
          content: reply.content,
        }).then(({ error }) => {
          if (error) {
            console.error("Failed to save reply:", {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code,
            });
          }
        });
      });
    }
  };

  // Handle feedback click from panel
  const handleFeedbackClick = (feedbackId: string) => {
    const feedback = currentFeedbacks.find((f) => f.id === feedbackId);
    if (feedback && isPdfIteration) {
      setCurrentPage(feedbackPageNumber(feedback));
    }
    setHighlightedFeedback(feedbackId);
    // Also highlight the associated drawing if any
    if (feedback?.drawingId) {
      setHighlightDrawingId(feedback.drawingId);
    }
    setTimeout(() => {
      setHighlightedFeedback(null);
      setHighlightDrawingId(null);
    }, 2000);
  };

  // Handle marker click from canvas
  const handleMarkerClick = (markerId: string) => {
    const feedback = currentFeedbacks.find((f) => f.id === markerId);
    if (feedback && isPdfIteration) {
      setCurrentPage(feedbackPageNumber(feedback));
    }
    setOpenFeedbackId(markerId);
    setHighlightedFeedback(markerId);
    // Also highlight the associated drawing if any
    if (feedback?.drawingId) {
      setHighlightDrawingId(feedback.drawingId);
    }
    setTimeout(() => {
      setOpenFeedbackId(null);
      setHighlightedFeedback(null);
      setHighlightDrawingId(null);
    }, 2000);
  };

  // Handle reply from canvas popover
  const handleCanvasReply = (markerId: string, reply: { id: string; user: { name: string; avatar: string; color: string }; content: string; timestamp: string }) => {
    const convertedReply: ReplyItem = {
      id: reply.id,
      user: {
        name: reply.user.name,
        avatar: reply.user.name.charAt(0),
        color: "bg-blue-500",
      },
      content: reply.content,
      timestamp: reply.timestamp,
    };
    handleAddReply(markerId, convertedReply);
  };

  // Handle iteration change
  const handleIterationChange = (iterationId: string) => {
    setActiveIterationId(iterationId);
    setCompareMode(false);
    setRotation(0);
    setCurrentPage(1);
  };

  const handlePdfDocumentReady = useCallback(
    ({ pageCount }: PdfPageViewerReadyPayload) => {
      setIterations((prev) =>
        prev.map((iter) =>
          iter.id === activeIterationId ? { ...iter, pageCount } : iter
        )
      );
      setCurrentPage((p) => Math.min(Math.max(1, p), pageCount));
    },
    [activeIterationId]
  );

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Handle new iteration upload
  const handleNewIterationUpload = async (file: File) => {
    const newVersion = iterations.length + 1;
    let imageUrl = URL.createObjectURL(file);
    let newId = crypto.randomUUID();
    const mediaType = getMediaTypeFromFile(file);
    let pageCount: number | null = null;

    // Upload to Supabase Storage and create iteration record if connected to DB
    if (creativeId) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        // Upload file to storage (image or PDF)
        const filePath = `iterations/${creativeId}/${newId}/${file.name}`;
        const { data: uploadData } = await supabase.storage
          .from("revue-assets")
          .upload(filePath, file);

        if (uploadData) {
          const { data: urlData } = supabase.storage
            .from("revue-assets")
            .getPublicUrl(filePath);
          imageUrl = urlData.publicUrl;
        }

        // Create iteration record
        const { data: iterData } = await supabase.from("iterations").insert({
          id: newId,
          creative_id: creativeId,
          version: newVersion,
          name: `Iteration ${newVersion}`,
          image_url: imageUrl,
          media_type: mediaType,
          created_by: authUser.id,
        }).select("id").single();

        if (iterData) {
          newId = iterData.id;
        }

        // For PDFs, read page count and persist so pager renders immediately
        if (mediaType === "pdf") {
          pageCount = await getPdfPageCountFromUrl(imageUrl);
          if (pageCount != null) {
            await supabase
              .from("iterations")
              .update({ page_count: pageCount })
              .eq("id", newId);
          }
        }

        // Update creative's iteration count
        await supabase.from("creatives").update({ iteration: newVersion }).eq("id", creativeId);
      }
    }

    const newIteration: Iteration = {
      id: newId,
      version: newVersion,
      name: `Iteration ${newVersion}`,
      timestamp: "Just now",
      imageUrl: imageUrl,
      mediaType,
      pageCount,
      drawings: [],
      feedbacks: [],
      aiSuggestions: [],
    };

    setIterations(prev => [newIteration, ...prev]);
    setActiveIterationId(newIteration.id);
    // Reset to page 1 for the new iteration
    setCurrentPage(1);
    // Dialog closes itself when onUpload resolves; no need to close here.
  };

  // Handle AI Analysis — images from storage, PDFs from browser canvas snapshot
  const handleStartAIAnalysis = useCallback(async (type: AIAnalysisType) => {
    if (!canRunAiAnalysis) return;
    if (type !== "spacing" && type !== "spelling") return;

    const iteration = iterations.find((item) => item.id === activeIterationId);
    const isPdf = iteration?.mediaType === "pdf";
    let clientImage: ClientAnalysisImageInput | undefined;

    if (isPdf) {
      if (rotation !== 0) {
        showToast("Reset rotation to 0° before running AI analysis on a PDF.", "error");
        return;
      }

      const captured = await captureCreativeMediaForAnalysis(
        "primary",
        currentPage
      );
      if (!captured.ok) {
        showToast(captured.error, "error");
        return;
      }
      clientImage = captured.capture;
    }

    setAiAnalysisType(type);
    setAiAnalysisActive(true);
    setViewMode("ai");

    console.log("[AI Analysis] Starting", {
      analysisType: type,
      iterationId: activeIterationId,
      pageNumber: currentPage,
      source: isPdf ? "client-canvas" : "storage-download",
      clientImageWidth: clientImage?.width,
      clientImageHeight: clientImage?.height,
    });

    try {
      const response = await fetch(apiPath("/api/ai/analyze"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          iterationId: activeIterationId,
          analysisType: type,
          pageNumber: currentPage,
          ...(clientImage ? { clientImage } : {}),
        }),
      });

      const payload = (await response.json()) as {
        suggestions?: AISuggestion[];
        empty?: boolean;
        pageNumber?: number;
        analysisType?: AIAnalysisType;
        error?: string;
      };

      if (!response.ok) {
        console.error("[AI Analysis] Failed", {
          status: response.status,
          error: payload.error,
        });
        throw new Error(payload.error || "AI analysis failed");
      }

      const resultPage = payload.pageNumber ?? currentPage;
      const resultType = payload.analysisType ?? type;
      const newSuggestions = payload.suggestions ?? [];

      console.log("[AI Analysis] Success", {
        analysisType: resultType,
        pageNumber: resultPage,
        empty: payload.empty ?? newSuggestions.length === 0,
        suggestionCount: newSuggestions.length,
        suggestions: newSuggestions,
      });

      setIterations((prev) =>
        prev.map((iteration) => {
          if (iteration.id !== activeIterationId) return iteration;

          const retained = iteration.aiSuggestions.filter(
            (suggestion) =>
              !(
                (suggestion.pageNumber ?? 1) === resultPage &&
                suggestion.type === resultType
              )
          );

          return {
            ...iteration,
            aiSuggestions: [...retained, ...newSuggestions],
          };
        })
      );

      if (payload.empty) {
        showToast("No error found", "info");
      }
    } catch (error) {
      console.error("[AI Analysis] Error", error);
      showToast(
        error instanceof Error ? error.message : "AI analysis failed",
        "error"
      );
    } finally {
      setAiAnalysisActive(false);
    }
  }, [activeIterationId, canRunAiAnalysis, currentPage, iterations, rotation, showToast]);

  // Handle ignoring an AI suggestion - persisted in Supabase
  const handleIgnoreAISuggestion = useCallback(async (id: string) => {
    let removedSuggestion: AISuggestion | undefined;

    setIterations((prev) =>
      prev.map((iteration) => {
        if (iteration.id !== activeIterationId) return iteration;
        removedSuggestion = iteration.aiSuggestions.find(
          (suggestion) => suggestion.id === id
        );
        return {
          ...iteration,
          aiSuggestions: iteration.aiSuggestions.filter(
            (suggestion) => suggestion.id !== id
          ),
        };
      })
    );

    try {
      const response = await fetch(apiPath(`/api/ai/suggestions/${id}/ignore`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ignored: true }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to ignore suggestion");
      }
    } catch (error) {
      if (removedSuggestion) {
        setIterations((prev) =>
          prev.map((iteration) =>
            iteration.id === activeIterationId
              ? {
                  ...iteration,
                  aiSuggestions: [...iteration.aiSuggestions, removedSuggestion!],
                }
              : iteration
          )
        );
      }

      showToast(
        error instanceof Error ? error.message : "Failed to ignore suggestion",
        "error"
      );
    }
  }, [activeIterationId, showToast]);

  // Role filter: panel shows all pages; canvas shows current page only for PDFs
  const roleFilteredFeedbacks =
    workmode === "productive" && userRole === "client"
      ? currentFeedbacks.filter((f) => f.source === "client")
      : currentFeedbacks;

  const panelFeedbacks = roleFilteredFeedbacks;

  const canvasFeedbacks = isPdfIteration
    ? roleFilteredFeedbacks.filter(
        (f) => feedbackPageNumber(f) === currentPage
      )
    : roleFilteredFeedbacks;

  // Convert feedbacks to marker format for canvas
  const markers = canvasFeedbacks.map(f => ({
    id: f.id,
    x: f.x || 0,
    y: f.y || 0,
    number: f.number,
    content: f.content,
    resolved: f.resolved,
    user: {
      name: f.user.name,
      avatar: f.user.avatar,
      color: f.user.color.replace('bg-', '#').replace('-500', ''),
    },
    timestamp: f.timestamp,
    replies: f.replies.map(r => ({
      id: r.id,
      user: {
        name: r.user.name,
        avatar: r.user.avatar,
        color: r.user.color.replace('bg-', '#').replace('-500', ''),
      },
      content: r.content,
      timestamp: r.timestamp,
    })),
    drawingId: f.drawingId,
  }));

  // Get compare iteration
  const compareIteration = compareIterationId
    ? iterations.find(i => i.id === compareIterationId)
    : null;

  return (
    <div className="h-screen w-screen bg-[#f5f5f5] dark:bg-[#1a1a1a] overflow-hidden relative">
      {/* Canvas - Full screen */}
      <CanvasArea
        zoom={zoom}
        selectedTool={selectedTool}
        onAddFeedback={canAddFeedback ? handleAddFeedback : undefined}
        currentIteration={currentIteration?.version || 0}
        feedbackCount={getNextFeedbackNumber() - 1}
        markers={markers}
        highlightedMarker={highlightedFeedback}
        onMarkerClick={handleMarkerClick}
        onAddReply={handleCanvasReply}
        imageUrl={currentIteration?.imageUrl || ""}
        mediaType={currentIteration?.mediaType ?? "image"}
        currentPage={currentPage}
        pageCount={currentIteration?.pageCount ?? null}
        compareMediaType={compareIteration?.mediaType ?? "image"}
        onPdfDocumentReady={handlePdfDocumentReady}
        rotation={rotation}
        compareMode={compareMode}
        compareImageUrl={compareIteration?.imageUrl}
        compareIterations={iterations.filter(i => i.id !== activeIterationId)}
        selectedCompareId={compareIterationId}
        onCompareIterationChange={setCompareIterationId}
        drawings={pageFilteredDrawings}
        onDrawingsChange={handleDrawingsChange}
        onZoomChange={setZoom}
        onToolChange={setSelectedTool}
        onRotate={() => setRotation(prev => (prev + 90) % 360)}
        onToggleCompare={() => handleSelectTool("compare")}
        onResetView={() => setRotation(0)}
        onToggleFullscreen={handleToggleFullscreen}
        isFullscreen={isFullscreen}
        drawingColor={drawingColor}
        onColorChange={setDrawingColor}
        shapeType={shapeType}
        onShapeTypeChange={setShapeType}
        highlightDrawingId={highlightDrawingId}
        aiAnalysisActive={aiAnalysisActive}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        aiSuggestions={pageFilteredAiSuggestions}
        onShowAIAnalysisOptions={() => setShowAIAnalysisOptions((open) => !open)}
        canRunAiAnalysis={canRunAiAnalysis}
        overlaysPeekHidden={overlaysPeekHidden}
      />

      {/* Floating Header - Left and Right sections (hidden in fullscreen) */}
      {!isFullscreen && (
        <CommunicationHeader
          iterations={iterations.map(i => ({
            id: i.id,
            name: i.name,
            version: i.version,
            timestamp: i.timestamp,
          }))}
          activeIterationId={activeIterationId}
          onIterationChange={handleIterationChange}
          onNewIteration={canUploadIterations ? () => setShowNewIterationDialog(true) : undefined}
          onShare={() => setShowShareDialog(true)}
          onDownload={handleDownloadCreative}
          downloadDisabled={!currentIteration?.imageUrl}
          clientId={clientId}
          clientName={clientName}
          clientLogo={clientLogo}
          projectName={projectName}
          creativeName={creativeName}
        />
      )}

      {/* Floating Sidebar - Centered vertically on left (hidden in fullscreen) */}
      {!isFullscreen && (
        <CommunicationSidebar
          selectedTool={selectedTool}
          onSelectTool={handleSelectTool}
          compareMode={compareMode}
          drawingColor={drawingColor}
          onColorChange={setDrawingColor}
          shapeType={shapeType}
          onShapeTypeChange={setShapeType}
          onStartAIAnalysis={handleStartAIAnalysis}
          aiAnalysisActive={aiAnalysisActive}
          viewMode={viewMode}
          showAIOptions={showAIAnalysisOptions}
          onShowAIOptionsChange={setShowAIAnalysisOptions}
          canAddFeedback={canAddFeedback}
          canRunAiAnalysis={canRunAiAnalysis}
          isPdfCreative={isPdfIteration}
          currentPage={currentPage}
          pageCount={effectivePageCount}
          overlaysPeekHidden={overlaysPeekHidden}
          onPeekOverlaysStart={() => setOverlaysPeekHidden(true)}
        />
      )}

      {/* Floating Feedback Panel - Right side (hidden in fullscreen) */}
      {showComments && !compareMode && !isFullscreen && (
        <CommentsPanel
          feedbacks={panelFeedbacks}
          onAddReply={handleAddReply}
          onFeedbackClick={handleFeedbackClick}
          openFeedbackId={openFeedbackId}
          viewMode={viewMode}
          aiSuggestions={currentAiSuggestions}
          onIgnoreAISuggestion={handleIgnoreAISuggestion}
          userRole={userRole}
          workmode={workmode}
          currentUser={currentUser}
          showPageLabels={isPdfIteration && effectivePageCount > 1}
        />
      )}

      {/* PDF page pager — sits directly above the zoom controls cluster */}
      {isPdfIteration && effectivePageCount > 1 && !isFullscreen && (
        <div className="fixed bottom-16 right-[324px] lg:right-[364px] xl:right-[404px] z-50 pointer-events-auto">
          <PdfPagePager
            currentPage={currentPage}
            pageCount={effectivePageCount}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Zoom Controls - Bottom Right before feedback panel */}
      <ZoomControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomChange={setZoom}
        onToggleFullscreen={handleToggleFullscreen}
        isFullscreen={isFullscreen}
      />

      {/* Share Dialog */}
      <ShareDialog
        open={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        creativeName={creativeName || "Creative"}
      />

      {/* New Iteration Dialog */}
      <NewIterationDialog
        open={showNewIterationDialog}
        onClose={() => setShowNewIterationDialog(false)}
        onUpload={handleNewIterationUpload}
        currentIteration={currentIteration?.version || 0}
        isFirstIteration={iterations.length === 0}
        allowedMediaType={currentIteration?.mediaType}
      />

      {/* Bottom-left toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-6 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-4 py-3 shadow-xl border text-sm font-medium",
              toast.tone === "error"
                ? "bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300"
                : "bg-white dark:bg-[#2a2a2a] border-gray-200 dark:border-[#444] text-gray-800 dark:text-gray-100"
            )}
            role="status"
            aria-live="polite"
          >
            <span
              className={cn(
                "inline-flex h-2 w-2 rounded-full shrink-0",
                toast.tone === "error" ? "bg-red-500" : "bg-emerald-500"
              )}
            />
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
