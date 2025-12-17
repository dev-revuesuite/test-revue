"use client";

import { useState } from "react";
import { CommunicationHeader } from "./communication-header";
import { CommunicationSidebar } from "./communication-sidebar";
import { CommentsPanel, Feedback, ReplyItem } from "./comments-panel";
import { ZoomControls } from "./zoom-controls";
import { CanvasArea } from "./canvas-area";

// Initial feedback data
const initialFeedbacks: Feedback[] = [
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
      {
        id: "5.1-2",
        user: { name: "Nina Patel", avatar: "N", color: "bg-purple-500" },
        content: "Working on it now. Will push an update shortly.",
        timestamp: "45 min ago",
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
    replies: [
      {
        id: "5.2-1",
        user: { name: "Mike Johnson", avatar: "M", color: "bg-orange-500" },
        content: "Thanks! Went through several iterations to get it right.",
        timestamp: "2 hours ago",
      },
    ],
  },
  {
    id: "5.3",
    number: "5.3",
    user: { name: "Nina Patel", avatar: "N", color: "bg-purple-500" },
    content: "The user labels need better positioning. They're overlapping with some elements.",
    timestamp: "5 hours ago",
    resolved: false,
    source: "client",
    x: 40,
    y: 75,
    replies: [],
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
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(initialFeedbacks);
  const [currentIteration] = useState(5);
  const [highlightedFeedback, setHighlightedFeedback] = useState<string | null>(null);
  const [openFeedbackId, setOpenFeedbackId] = useState<string | null>(null);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 10));

  // Get the next feedback number for the current iteration
  const getNextFeedbackNumber = () => {
    const iterationFeedbacks = feedbacks.filter(f => f.number.startsWith(`${currentIteration}.`));
    return iterationFeedbacks.length + 1;
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
      source: "client", // Default to client source
      x: feedback.x,
      y: feedback.y,
      replies: [],
    };
    setFeedbacks(prev => [newFeedback, ...prev]);
  };

  // Toggle resolved status
  const handleToggleResolved = (id: string) => {
    setFeedbacks(prev =>
      prev.map(f => (f.id === id ? { ...f, resolved: !f.resolved } : f))
    );
  };

  // Delete feedback
  const handleDeleteFeedback = (id: string) => {
    setFeedbacks(prev => prev.filter(f => f.id !== id));
  };

  // Add reply to feedback
  const handleAddReply = (feedbackId: string, reply: ReplyItem) => {
    setFeedbacks(prev =>
      prev.map(f =>
        f.id === feedbackId
          ? { ...f, replies: [...f.replies, reply] }
          : f
      )
    );
  };

  // Handle feedback click from panel (highlight on canvas)
  const handleFeedbackClick = (feedbackId: string) => {
    setHighlightedFeedback(feedbackId);
    // Clear highlight after 2 seconds
    setTimeout(() => setHighlightedFeedback(null), 2000);
  };

  // Handle marker click from canvas (open feedback in panel)
  const handleMarkerClick = (markerId: string) => {
    setOpenFeedbackId(markerId);
    setHighlightedFeedback(markerId);
    // Clear states after a short delay
    setTimeout(() => {
      setOpenFeedbackId(null);
      setHighlightedFeedback(null);
    }, 2000);
  };

  // Handle reply from canvas popover (convert format)
  const handleCanvasReply = (markerId: string, reply: { id: string; user: { name: string; avatar: string; color: string }; content: string; timestamp: string }) => {
    const convertedReply: ReplyItem = {
      id: reply.id,
      user: {
        name: reply.user.name,
        avatar: reply.user.name.charAt(0),
        color: "bg-blue-500", // Default color for current user
      },
      content: reply.content,
      timestamp: reply.timestamp,
    };
    handleAddReply(markerId, convertedReply);
  };

  // Convert feedbacks to marker format for canvas (including chat data)
  const markers = feedbacks.map(f => ({
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

  return (
    <div className="h-screen w-screen bg-[#f5f5f5] dark:bg-[#1a1a1a] overflow-hidden relative">
      {/* Canvas - Full screen */}
      <CanvasArea
        zoom={zoom}
        selectedTool={selectedTool}
        onAddFeedback={handleAddFeedback}
        currentIteration={currentIteration}
        feedbackCount={getNextFeedbackNumber() - 1}
        markers={markers}
        highlightedMarker={highlightedFeedback}
        onMarkerClick={handleMarkerClick}
        onToggleResolved={handleToggleResolved}
        onAddReply={handleCanvasReply}
      />

      {/* Floating Header - Left and Right sections */}
      <CommunicationHeader />

      {/* Floating Sidebar - Centered vertically on left */}
      <CommunicationSidebar
        selectedTool={selectedTool}
        onSelectTool={setSelectedTool}
      />

      {/* Floating Feedback Panel - Right side */}
      {showComments && (
        <CommentsPanel
          feedbacks={feedbacks}
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
    </div>
  );
}
