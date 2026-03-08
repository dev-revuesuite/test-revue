"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { CommunicationHeader } from "./communication-header";
import { CommunicationSidebar } from "./communication-sidebar";
import { CommentsPanel, Feedback, ReplyItem, AIAnalysisType, AISuggestion } from "./comments-panel";
import { ZoomControls } from "./zoom-controls";
import { CanvasArea } from "./canvas-area";
import { ShareDialog } from "./share-dialog";
import { NewIterationDialog } from "./new-iteration-dialog";
import { ShapeType, DrawingPath } from "@/lib/fabric";

// Define iteration type with image, feedbacks, drawings, and AI suggestions
interface Iteration {
  id: string;
  version: number;
  name: string;
  timestamp: string;
  imageUrl: string;
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
  userRole?: "owner" | "designer" | "client";
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
  const startIterations = propIterations || [];
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Role-based permissions
  const canUploadIterations = userRole === "owner" || userRole === "designer";
  const canAddFeedback = userRole === "owner" || userRole === "client" || userRole === "designer";
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
          };
          // Skip if we added this locally (optimistic update already applied)
          if (localFeedbackIdsRef.current.has(row.number + row.content)) return;
          // Only process feedbacks for our iterations (use ref for fresh data)
          const currentIterations = iterationsRef.current;
          const iterationIds = currentIterations.map(i => i.id);
          if (!iterationIds.includes(row.iteration_id)) return;
          // Skip if already in state
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
          // Skip if we added this locally
          if (localReplyIdsRef.current.has(row.feedback_id + row.content)) return;
          // Use ref for fresh data
          const currentIterations = iterationsRef.current;
          const parentIteration = currentIterations.find(i =>
            i.feedbacks.some(f => f.id === row.feedback_id)
          );
          if (!parentIteration) return;
          // Skip if already in state
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
          };
          // Skip if we added this locally
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
  const currentDrawings = currentIteration?.drawings || [];
  const currentAiSuggestions = currentIteration?.aiSuggestions || [];

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
      replies: [],
      drawingId: feedback.drawing?.id,
    };

    setIterations(prev => prev.map(iteration =>
      iteration.id === activeIterationId
        ? { ...iteration, feedbacks: [newFeedback, ...iteration.feedbacks] }
        : iteration
    ));

    // Track locally to prevent realtime duplicate
    const localKey = feedback.number + feedback.content;
    localFeedbackIdsRef.current.add(localKey);

    // Persist to DB
    if (creativeId) {
      supabase.auth.getUser().then(({ data: { user: authUser } }) => {
        if (authUser) {
          supabase.from("feedbacks").insert({
            iteration_id: activeIterationId,
            number: feedback.number,
            content: feedback.content,
            x: feedback.x,
            y: feedback.y,
            resolved: false,
            source: feedbackSource,
            drawing_id: feedback.drawing?.id || null,
            user_id: authUser.id,
          }).then(({ error }) => {
            if (error) console.error("Failed to save feedback:", error);
          });
        }
      });
    }
  };

  // Update drawings for current iteration
  const handleDrawingsChange = (newDrawings: DrawingPath[]) => {
    setIterations(prev => prev.map(iteration =>
      iteration.id === activeIterationId
        ? { ...iteration, drawings: newDrawings }
        : iteration
    ));

    // Persist new drawings to DB
    if (creativeId) {
      const existingIds = (iterationsRef.current.find(i => i.id === activeIterationId)?.drawings || []).map(d => d.id);
      const added = newDrawings.filter(d => !existingIds.includes(d.id));
      if (added.length > 0) {
        // Track locally to prevent realtime duplicate
        for (const d of added) localDrawingIdsRef.current.add(d.id);
        supabase.auth.getUser().then(({ data: { user: authUser } }) => {
          if (authUser) {
            for (const d of added) {
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
    setIterations(prev => prev.map(iteration =>
      iteration.id === activeIterationId
        ? {
            ...iteration,
            feedbacks: iteration.feedbacks.map(f =>
              f.id === feedbackId
                ? { ...f, replies: [...f.replies, reply] }
                : f
            )
          }
        : iteration
    ));

    // Track locally to prevent realtime duplicate
    localReplyIdsRef.current.add(feedbackId + reply.content);

    // Persist reply to DB
    if (creativeId) {
      supabase.auth.getUser().then(({ data: { user: authUser } }) => {
        if (authUser) {
          supabase.from("feedback_replies").insert({
            feedback_id: feedbackId,
            user_id: authUser.id,
            content: reply.content,
          }).then(({ error }) => {
            if (error) console.error("Failed to save reply:", error);
          });
        }
      });
    }
  };

  // Handle feedback click from panel
  const handleFeedbackClick = (feedbackId: string) => {
    setHighlightedFeedback(feedbackId);
    // Also highlight the associated drawing if any
    const feedback = currentFeedbacks.find(f => f.id === feedbackId);
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
    setOpenFeedbackId(markerId);
    setHighlightedFeedback(markerId);
    // Also highlight the associated drawing if any
    const feedback = currentFeedbacks.find(f => f.id === markerId);
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
  };

  // Handle new iteration upload
  const handleNewIterationUpload = async (file: File) => {
    const newVersion = iterations.length + 1;
    let imageUrl = URL.createObjectURL(file);
    let newId = crypto.randomUUID();

    // Upload to Supabase Storage and create iteration record if connected to DB
    if (creativeId) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        // Upload image to storage
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
          created_by: authUser.id,
        }).select("id").single();

        if (iterData) {
          newId = iterData.id;
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
      drawings: [],
      feedbacks: [],
      aiSuggestions: [],
    };

    setIterations(prev => [newIteration, ...prev]);
    setActiveIterationId(newIteration.id);
    setShowNewIterationDialog(false);
  };

  // Handle AI Analysis - saves suggestions to the current iteration
  const handleStartAIAnalysis = useCallback((type: AIAnalysisType) => {
    setAiAnalysisType(type);
    setAiAnalysisActive(true);
    setViewMode("ai"); // Switch to AI mode when starting analysis

    // Clear current iteration's suggestions while analyzing
    setIterations(prev => prev.map(iteration =>
      iteration.id === activeIterationId
        ? { ...iteration, aiSuggestions: [] }
        : iteration
    ));

    // Simulate analysis with mock suggestions after a delay
    setTimeout(() => {
      const mockSuggestions: AISuggestion[] = getMockSuggestions(type);
      // Save suggestions to the current iteration
      setIterations(prev => prev.map(iteration =>
        iteration.id === activeIterationId
          ? { ...iteration, aiSuggestions: mockSuggestions }
          : iteration
      ));
      setAiAnalysisActive(false);
    }, 3000);
  }, [activeIterationId]);

  // Handle ignoring an AI suggestion - updates the current iteration
  const handleIgnoreAISuggestion = useCallback((id: string) => {
    setIterations(prev => prev.map(iteration =>
      iteration.id === activeIterationId
        ? { ...iteration, aiSuggestions: iteration.aiSuggestions.filter(s => s.id !== id) }
        : iteration
    ));
  }, [activeIterationId]);

  // Generate mock AI suggestions based on analysis type
  const getMockSuggestions = (type: AIAnalysisType): AISuggestion[] => {
    const suggestions: Record<AIAnalysisType, AISuggestion[]> = {
      complete: [
        { id: "1", type: "complete", title: "Improve button contrast", description: "The primary CTA button has a contrast ratio of 3.2:1. Consider increasing to 4.5:1 for better accessibility.", severity: "warning", location: { x: 50, y: 70 } },
        { id: "2", type: "complete", title: "Inconsistent spacing", description: "The gap between form elements varies from 12px to 20px. Standardize to 16px for visual consistency.", severity: "info", location: { x: 50, y: 45 } },
        { id: "3", type: "complete", title: "Missing focus states", description: "Input fields lack visible focus indicators, which may affect keyboard navigation.", severity: "error", location: { x: 50, y: 40 } },
      ],
      typography: [
        { id: "1", type: "typography", title: "Line height too tight", description: "Body text has a line height of 1.2. Consider increasing to 1.5-1.6 for better readability.", severity: "warning", location: { x: 40, y: 35 } },
        { id: "2", type: "typography", title: "Font size hierarchy", description: "The heading and body text sizes are too similar. Increase heading size for better visual hierarchy.", severity: "info", location: { x: 50, y: 20 } },
      ],
      spacing: [
        { id: "1", type: "spacing", title: "Uneven margins", description: "Left margin is 24px while right margin is 32px. Align both to maintain symmetry.", severity: "warning", location: { x: 10, y: 50 } },
        { id: "2", type: "spacing", title: "Crowded elements", description: "The social login buttons are too close together. Add 12px gap between them.", severity: "info", location: { x: 50, y: 80 } },
      ],
      spelling: [
        { id: "1", type: "spelling", title: "Typo detected", description: "\"Pasword\" should be \"Password\" in the input label.", severity: "error", location: { x: 30, y: 45 } },
        { id: "2", type: "spelling", title: "Inconsistent capitalization", description: "\"Sign in\" vs \"Sign In\" - choose one style for consistency.", severity: "info", location: { x: 50, y: 75 } },
      ],
      alignment: [
        { id: "1", type: "alignment", title: "Off-center logo", description: "The logo appears to be 4px off-center. Align to the horizontal center of the container.", severity: "warning", location: { x: 48, y: 10 } },
        { id: "2", type: "alignment", title: "Form field misalignment", description: "The email and password fields have different left edges. Align to the same starting point.", severity: "info", location: { x: 35, y: 40 } },
      ],
      contrast: [
        { id: "1", type: "contrast", title: "Low contrast text", description: "The placeholder text (#999) on white background has only 2.8:1 contrast ratio. WCAG AA requires 4.5:1.", severity: "error", location: { x: 50, y: 38 } },
        { id: "2", type: "contrast", title: "Link visibility", description: "The \"Forgot password\" link color is too similar to body text. Use a distinct color for links.", severity: "warning", location: { x: 65, y: 55 } },
      ],
    };
    return suggestions[type] || [];
  };

  // In productive mode, client should only see client feedbacks on canvas
  const visibleFeedbacks = (workmode === "productive" && userRole === "client")
    ? currentFeedbacks.filter(f => f.source === "client")
    : currentFeedbacks;

  // Convert feedbacks to marker format for canvas
  const markers = visibleFeedbacks.map(f => ({
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
        rotation={rotation}
        compareMode={compareMode}
        compareImageUrl={compareIteration?.imageUrl}
        compareIterations={iterations.filter(i => i.id !== activeIterationId)}
        selectedCompareId={compareIterationId}
        onCompareIterationChange={setCompareIterationId}
        drawings={currentDrawings}
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
        aiSuggestions={currentAiSuggestions}
        onShowAIAnalysisOptions={() => setShowAIAnalysisOptions(true)}
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
        />
      )}

      {/* Floating Feedback Panel - Right side (hidden in fullscreen) */}
      {showComments && !compareMode && !isFullscreen && (
        <CommentsPanel
          feedbacks={visibleFeedbacks}
          onAddReply={handleAddReply}
          onFeedbackClick={handleFeedbackClick}
          openFeedbackId={openFeedbackId}
          viewMode={viewMode}
          aiSuggestions={currentAiSuggestions}
          onIgnoreAISuggestion={handleIgnoreAISuggestion}
          userRole={userRole}
          workmode={workmode}
          currentUser={currentUser}
        />
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
      />
    </div>
  );
}
