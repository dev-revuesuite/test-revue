"use client";

import { useState, useCallback } from "react";
import { CommunicationHeader } from "./communication-header";
import { CommunicationSidebar } from "./communication-sidebar";
import { CommentsPanel, Feedback, ReplyItem, AIAnalysisType, AISuggestion } from "./comments-panel";
import { ZoomControls } from "./zoom-controls";
import { CanvasArea } from "./canvas-area";
import { ShareDialog } from "./share-dialog";
import { NewIterationDialog } from "./new-iteration-dialog";
import { ShapeType } from "@/lib/fabric";

// Drawing path type for annotations
interface DrawingPath {
  id: string;
  type: "draw" | "shape";
  points?: { x: number; y: number }[];
  rect?: { x: number; y: number; width: number; height: number };
  color: string;
  strokeWidth: number;
}

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

// Initial iterations data with their own feedbacks and drawings
const initialIterations: Iteration[] = [
  {
    id: "5",
    version: 5,
    name: "Iteration 5",
    timestamp: "Today, 2:30 PM",
    imageUrl: "/assets/login.png",
    drawings: [],
    feedbacks: [
      {
        id: "5.1",
        number: "5.1",
        user: { name: "Mike Johnson", avatar: "M", color: "bg-orange-500" },
        content: "Can we make the hands more prominent? They seem to blend into the background a bit.",
        timestamp: "2 hours ago",
        resolved: false,
        source: "client",
        x: 25,
        y: 15,
        replies: [
          {
            id: "5.1-1",
            user: { name: "Andrea Smith", avatar: "A", color: "bg-green-500" },
            content: "I agree! Maybe add a subtle shadow or outline?",
            timestamp: "1 hour ago",
          },
        ],
      },
      {
        id: "5.2",
        number: "5.2",
        user: { name: "Andrea Smith", avatar: "A", color: "bg-green-500" },
        content: "Love the color palette! The pink background really pops.",
        timestamp: "3 hours ago",
        resolved: true,
        source: "team",
        x: 70,
        y: 45,
        replies: [],
      },
      {
        id: "5.3",
        number: "5.3",
        user: { name: "Nina Patel", avatar: "N", color: "bg-purple-500" },
        content: "The user labels need better positioning.",
        timestamp: "5 hours ago",
        resolved: false,
        source: "client",
        x: 40,
        y: 75,
        replies: [],
      },
    ],
    aiSuggestions: [],
  },
  {
    id: "4",
    version: 4,
    name: "Iteration 4",
    timestamp: "Today, 11:00 AM",
    imageUrl: "/assets/login.png",
    drawings: [],
    feedbacks: [
      {
        id: "4.1",
        number: "4.1",
        user: { name: "Mike Johnson", avatar: "M", color: "bg-orange-500" },
        content: "Colors look washed out in this version.",
        timestamp: "6 hours ago",
        resolved: true,
        source: "client",
        x: 50,
        y: 30,
        replies: [],
      },
      {
        id: "4.2",
        number: "4.2",
        user: { name: "Nina Patel", avatar: "N", color: "bg-purple-500" },
        content: "Font size needs to be larger.",
        timestamp: "5 hours ago",
        resolved: true,
        source: "team",
        x: 60,
        y: 60,
        replies: [],
      },
    ],
    aiSuggestions: [],
  },
  {
    id: "3",
    version: 3,
    name: "Iteration 3",
    timestamp: "Yesterday, 4:15 PM",
    imageUrl: "/assets/login.png",
    drawings: [],
    feedbacks: [
      {
        id: "3.1",
        number: "3.1",
        user: { name: "Andrea Smith", avatar: "A", color: "bg-green-500" },
        content: "Initial layout looks good!",
        timestamp: "Yesterday",
        resolved: true,
        source: "team",
        x: 45,
        y: 50,
        replies: [],
      },
    ],
    aiSuggestions: [],
  },
  {
    id: "2",
    version: 2,
    name: "Iteration 2",
    timestamp: "Dec 15, 2024",
    imageUrl: "/assets/login.png",
    drawings: [],
    feedbacks: [],
    aiSuggestions: [],
  },
  {
    id: "1",
    version: 1,
    name: "Iteration 1",
    timestamp: "Dec 14, 2024",
    imageUrl: "/assets/login.png",
    drawings: [],
    feedbacks: [],
    aiSuggestions: [],
  },
];

// Current user
const currentUser = {
  name: "You",
  avatar: "Y",
  color: "bg-blue-500",
};

export function CommunicationCanvas() {
  const [zoom, setZoom] = useState(100);
  const [selectedTool, setSelectedTool] = useState("pointer");
  const [showComments, setShowComments] = useState(true);
  const [iterations, setIterations] = useState<Iteration[]>(initialIterations);
  const [activeIterationId, setActiveIterationId] = useState("5");
  const [highlightedFeedback, setHighlightedFeedback] = useState<string | null>(null);
  const [openFeedbackId, setOpenFeedbackId] = useState<string | null>(null);

  // Dialog states
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showNewIterationDialog, setShowNewIterationDialog] = useState(false);

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

  // Hide resolved feedbacks state
  const [hideResolved, setHideResolved] = useState(false);

  // AI Analysis state
  const [aiAnalysisActive, setAiAnalysisActive] = useState(false);
  const [aiAnalysisType, setAiAnalysisType] = useState<AIAnalysisType | null>(null);
  const [viewMode, setViewMode] = useState<"view" | "comments" | "ai">("comments"); // View mode for annotations
  const [showAIAnalysisOptions, setShowAIAnalysisOptions] = useState(false); // Control sidebar AI options panel

  // Get current iteration
  const currentIteration = iterations.find(i => i.id === activeIterationId) || iterations[0];
  const currentFeedbacks = currentIteration?.feedbacks || [];
  const currentDrawings = currentIteration?.drawings || [];
  const currentAiSuggestions = currentIteration?.aiSuggestions || [];

  // Get unresolved feedbacks for current iteration
  const unresolvedFeedbacks = currentFeedbacks.filter(f => !f.resolved);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 5, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 5, 10));

  // Fullscreen editor mode toggle (hides header, sidebar, comments panel)
  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // Get the next feedback number for the current iteration
  const getNextFeedbackNumber = useCallback(() => {
    const iterationFeedbacks = currentFeedbacks.filter(f =>
      f.number.startsWith(`${currentIteration.version}.`)
    );
    return iterationFeedbacks.length + 1;
  }, [currentFeedbacks, currentIteration.version]);

  // Handle tool selection
  const handleSelectTool = (tool: string) => {
    if (tool === "compare") {
      setCompareMode(!compareMode);
      if (!compareMode && iterations.length > 1) {
        // Default to previous iteration
        const prevIteration = iterations.find(i => i.version === currentIteration.version - 1);
        setCompareIterationId(prevIteration?.id || iterations[1]?.id || null);
      }
      setSelectedTool("pointer");
    } else if (tool === "rotate") {
      setRotation(prev => (prev + 90) % 360);
    } else {
      setSelectedTool(tool);
    }
  };

  // Add new feedback from canvas
  const handleAddFeedback = (feedback: {
    id: string;
    number: string;
    content: string;
    x: number;
    y: number;
    drawing?: DrawingPath;
  }) => {
    const newFeedback: Feedback = {
      id: feedback.id,
      number: feedback.number,
      user: currentUser,
      content: feedback.content,
      timestamp: "Just now",
      resolved: false,
      source: "client",
      x: feedback.x,
      y: feedback.y,
      replies: [],
      drawingId: feedback.drawing?.id, // Store associated drawing ID
    };

    setIterations(prev => prev.map(iteration =>
      iteration.id === activeIterationId
        ? { ...iteration, feedbacks: [newFeedback, ...iteration.feedbacks] }
        : iteration
    ));
  };

  // Update drawings for current iteration
  const handleDrawingsChange = (newDrawings: DrawingPath[]) => {
    setIterations(prev => prev.map(iteration =>
      iteration.id === activeIterationId
        ? { ...iteration, drawings: newDrawings }
        : iteration
    ));
  };

  // Toggle resolved status
  const handleToggleResolved = (id: string) => {
    setIterations(prev => prev.map(iteration =>
      iteration.id === activeIterationId
        ? {
            ...iteration,
            feedbacks: iteration.feedbacks.map(f =>
              f.id === id ? { ...f, resolved: !f.resolved } : f
            )
          }
        : iteration
    ));
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
  const handleNewIterationUpload = (file: File) => {
    const newVersion = iterations.length + 1;
    const imageUrl = URL.createObjectURL(file);

    const newIteration: Iteration = {
      id: String(newVersion),
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

  // Convert feedbacks to marker format for canvas (filter by hideResolved)
  const markers = currentFeedbacks
    .filter(f => !hideResolved || !f.resolved)
    .map(f => ({
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
      drawingId: f.drawingId, // Pass associated drawing ID
    }));

  // Filter drawings to hide resolved feedback drawings
  const visibleDrawings = hideResolved
    ? currentDrawings.filter(d => {
        // Keep drawings that are NOT associated with resolved feedbacks
        const associatedFeedback = currentFeedbacks.find(f => f.drawingId === d.id);
        return !associatedFeedback?.resolved;
      })
    : currentDrawings;

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
        onAddFeedback={handleAddFeedback}
        currentIteration={currentIteration.version}
        feedbackCount={getNextFeedbackNumber() - 1}
        markers={markers}
        highlightedMarker={highlightedFeedback}
        onMarkerClick={handleMarkerClick}
        onToggleResolved={handleToggleResolved}
        onAddReply={handleCanvasReply}
        imageUrl={currentIteration.imageUrl}
        rotation={rotation}
        compareMode={compareMode}
        compareImageUrl={compareIteration?.imageUrl}
        compareIterations={iterations.filter(i => i.id !== activeIterationId)}
        selectedCompareId={compareIterationId}
        onCompareIterationChange={setCompareIterationId}
        drawings={visibleDrawings}
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
          onNewIteration={() => setShowNewIterationDialog(true)}
          onShare={() => setShowShareDialog(true)}
          unresolvedCount={unresolvedFeedbacks.length}
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
          showAIOptions={showAIAnalysisOptions}
          onShowAIOptionsChange={setShowAIAnalysisOptions}
        />
      )}

      {/* Floating Feedback Panel - Right side (hidden in fullscreen) */}
      {showComments && !compareMode && !isFullscreen && (
        <CommentsPanel
          feedbacks={currentFeedbacks}
          onToggleResolved={handleToggleResolved}
          onAddReply={handleAddReply}
          onFeedbackClick={handleFeedbackClick}
          openFeedbackId={openFeedbackId}
          hideResolved={hideResolved}
          onHideResolvedChange={setHideResolved}
          viewMode={viewMode}
          aiSuggestions={currentAiSuggestions}
          onIgnoreAISuggestion={handleIgnoreAISuggestion}
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
        creativeName="Homepage Banner"
      />

      {/* New Iteration Dialog */}
      <NewIterationDialog
        open={showNewIterationDialog}
        onClose={() => setShowNewIterationDialog(false)}
        onUpload={handleNewIterationUpload}
        currentIteration={currentIteration.version}
        unresolvedFeedbacks={unresolvedFeedbacks.map(f => ({
          id: f.id,
          number: f.number,
          content: f.content,
        }))}
      />
    </div>
  );
}
