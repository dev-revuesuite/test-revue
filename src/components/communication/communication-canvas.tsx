"use client";

import { useState, useCallback } from "react";
import { CommunicationHeader } from "./communication-header";
import { CommunicationSidebar } from "./communication-sidebar";
import { CommentsPanel, Feedback, ReplyItem } from "./comments-panel";
import { ZoomControls } from "./zoom-controls";
import { CanvasArea } from "./canvas-area";
import { ShareDialog } from "./share-dialog";
import { NewIterationDialog } from "./new-iteration-dialog";

// Define iteration type with image and feedbacks
interface Iteration {
  id: string;
  version: number;
  name: string;
  timestamp: string;
  imageUrl: string;
  feedbacks: Feedback[];
}

// Initial iterations data with their own feedbacks
const initialIterations: Iteration[] = [
  {
    id: "5",
    version: 5,
    name: "Iteration 5",
    timestamp: "Today, 2:30 PM",
    imageUrl: "/assets/login.png",
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
  },
  {
    id: "4",
    version: 4,
    name: "Iteration 4",
    timestamp: "Today, 11:00 AM",
    imageUrl: "/assets/login.png",
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
  },
  {
    id: "3",
    version: 3,
    name: "Iteration 3",
    timestamp: "Yesterday, 4:15 PM",
    imageUrl: "/assets/login.png",
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
  },
  {
    id: "2",
    version: 2,
    name: "Iteration 2",
    timestamp: "Dec 15, 2024",
    imageUrl: "/assets/login.png",
    feedbacks: [],
  },
  {
    id: "1",
    version: 1,
    name: "Iteration 1",
    timestamp: "Dec 14, 2024",
    imageUrl: "/assets/login.png",
    feedbacks: [],
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

  // Get current iteration
  const currentIteration = iterations.find(i => i.id === activeIterationId) || iterations[0];
  const currentFeedbacks = currentIteration?.feedbacks || [];

  // Get unresolved feedbacks for current iteration
  const unresolvedFeedbacks = currentFeedbacks.filter(f => !f.resolved);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 10));

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
    };

    setIterations(prev => prev.map(iteration =>
      iteration.id === activeIterationId
        ? { ...iteration, feedbacks: [newFeedback, ...iteration.feedbacks] }
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

  // Delete feedback
  const handleDeleteFeedback = (id: string) => {
    setIterations(prev => prev.map(iteration =>
      iteration.id === activeIterationId
        ? {
            ...iteration,
            feedbacks: iteration.feedbacks.filter(f => f.id !== id)
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
    setTimeout(() => setHighlightedFeedback(null), 2000);
  };

  // Handle marker click from canvas
  const handleMarkerClick = (markerId: string) => {
    setOpenFeedbackId(markerId);
    setHighlightedFeedback(markerId);
    setTimeout(() => {
      setOpenFeedbackId(null);
      setHighlightedFeedback(null);
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
      feedbacks: [],
    };

    setIterations(prev => [newIteration, ...prev]);
    setActiveIterationId(newIteration.id);
    setShowNewIterationDialog(false);
  };

  // Convert feedbacks to marker format for canvas
  const markers = currentFeedbacks.map(f => ({
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
      />

      {/* Floating Header - Left and Right sections */}
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

      {/* Floating Sidebar - Centered vertically on left */}
      <CommunicationSidebar
        selectedTool={selectedTool}
        onSelectTool={handleSelectTool}
        compareMode={compareMode}
      />

      {/* Floating Feedback Panel - Right side */}
      {showComments && !compareMode && (
        <CommentsPanel
          feedbacks={currentFeedbacks}
          onToggleResolved={handleToggleResolved}
          onDeleteFeedback={handleDeleteFeedback}
          onAddReply={handleAddReply}
          onFeedbackClick={handleFeedbackClick}
          openFeedbackId={openFeedbackId}
        />
      )}

      {/* Zoom Controls - Bottom Right before feedback panel */}
      <ZoomControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
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
