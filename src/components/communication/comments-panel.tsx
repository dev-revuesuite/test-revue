"use client";

import { useState, useEffect } from "react";
import {
  Send,
  MoreHorizontal,
  CheckCircle2,
  Circle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Reply,
  Trash2,
  MapPin,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ReplyItem {
  id: string;
  user: {
    name: string;
    avatar: string;
    color: string;
  };
  content: string;
  timestamp: string;
}

export interface Feedback {
  id: string;
  number: string;
  user: {
    name: string;
    avatar: string;
    color: string;
  };
  content: string;
  timestamp: string;
  resolved: boolean;
  replies: ReplyItem[];
  source: "client" | "team";
  x?: number;
  y?: number;
}

interface CommentsPanelProps {
  feedbacks?: Feedback[];
  onToggleResolved?: (id: string) => void;
  onDeleteFeedback?: (id: string) => void;
  onAddReply?: (feedbackId: string, reply: ReplyItem) => void;
  onFeedbackClick?: (feedbackId: string) => void;
  openFeedbackId?: string | null;
}

const defaultFeedbackData: Feedback[] = [
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

export function CommentsPanel({
  feedbacks: externalFeedbacks,
  onToggleResolved,
  onDeleteFeedback,
  onAddReply,
  onFeedbackClick,
  openFeedbackId,
}: CommentsPanelProps) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(externalFeedbacks || defaultFeedbackData);
  const [expandedFeedbacks, setExpandedFeedbacks] = useState<Set<string>>(new Set(["5.1"]));
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"client" | "team">("client");

  // Sync with external feedbacks when they change
  useEffect(() => {
    if (externalFeedbacks) {
      setFeedbacks(externalFeedbacks);
    }
  }, [externalFeedbacks]);

  // Open specific feedback when marker is clicked
  useEffect(() => {
    if (openFeedbackId) {
      // Find the feedback and switch to its source tab
      const feedback = feedbacks.find(f => f.id === openFeedbackId);
      if (feedback) {
        setFilter(feedback.source);
        setExpandedFeedbacks(prev => new Set([...prev, openFeedbackId]));
      }
    }
  }, [openFeedbackId, feedbacks]);

  // Filter feedbacks based on source and sort (unresolved first, then resolved)
  const filteredFeedbacks = feedbacks
    .filter((f) => f.source === filter)
    .sort((a, b) => {
      // Unresolved items come first
      if (a.resolved !== b.resolved) {
        return a.resolved ? 1 : -1;
      }
      return 0; // Keep original order within same resolved status
    });

  // Toggle expand/collapse for a feedback
  const toggleExpand = (id: string) => {
    setExpandedFeedbacks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Toggle resolved status
  const toggleResolved = (id: string) => {
    if (onToggleResolved) {
      onToggleResolved(id);
    } else {
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === id ? { ...f, resolved: !f.resolved } : f))
      );
    }
  };

  // Delete a feedback
  const deleteFeedback = (id: string) => {
    if (onDeleteFeedback) {
      onDeleteFeedback(id);
    } else {
      setFeedbacks((prev) => prev.filter((f) => f.id !== id));
    }
  };

  // Add a reply to a feedback
  const handleAddReply = (feedbackId: string) => {
    const replyText = replyTexts[feedbackId];
    if (!replyText?.trim()) return;

    const newReply: ReplyItem = {
      id: `${feedbackId}-${Date.now()}`,
      user: currentUser,
      content: replyText.trim(),
      timestamp: "Just now",
    };

    if (onAddReply) {
      onAddReply(feedbackId, newReply);
    } else {
      setFeedbacks((prev) =>
        prev.map((f) =>
          f.id === feedbackId
            ? { ...f, replies: [...f.replies, newReply] }
            : f
        )
      );
    }

    // Clear the reply text and close reply input
    setReplyTexts((prev) => ({ ...prev, [feedbackId]: "" }));
    setActiveReplyId(null);

    // Expand the feedback to show the new reply
    setExpandedFeedbacks((prev) => new Set([...prev, feedbackId]));
  };

  // Handle clicking on a feedback (to highlight on canvas)
  const handleFeedbackClick = (feedbackId: string) => {
    if (onFeedbackClick) {
      onFeedbackClick(feedbackId);
    }
  };

  // Update reply text for a specific feedback
  const updateReplyText = (feedbackId: string, text: string) => {
    setReplyTexts((prev) => ({ ...prev, [feedbackId]: text }));
  };

  // Start replying to a feedback
  const startReply = (feedbackId: string) => {
    setActiveReplyId(feedbackId);
    // Expand the feedback when starting to reply
    setExpandedFeedbacks((prev) => new Set([...prev, feedbackId]));
  };

  const clientCount = feedbacks.filter((f) => f.source === "client").length;
  const teamCount = feedbacks.filter((f) => f.source === "team").length;

  return (
    <div className="absolute top-20 right-3 bottom-3 w-[380px] bg-white dark:bg-[#2a2a2a] rounded-xl shadow-xl border border-gray-200 dark:border-[#444] flex flex-col z-10 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-[#333] bg-gradient-to-r from-gray-50 to-white dark:from-[#333] dark:to-[#2a2a2a] shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="font-semibold text-gray-800 dark:text-white">Feedback</h2>
          <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
            {feedbacks.length}
          </span>
        </div>

        {/* Filter Tabs - Client / Team */}
        <div className="flex gap-1 bg-gray-100 dark:bg-[#1a1a1a] p-1 rounded-lg">
          <button
            onClick={() => setFilter("client")}
            className={cn(
              "flex-1 text-xs font-medium py-1.5 px-3 rounded-md transition-all",
              filter === "client"
                ? "bg-white dark:bg-[#333] text-gray-800 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            Client ({clientCount})
          </button>
          <button
            onClick={() => setFilter("team")}
            className={cn(
              "flex-1 text-xs font-medium py-1.5 px-3 rounded-md transition-all",
              filter === "team"
                ? "bg-white dark:bg-[#333] text-gray-800 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            Team ({teamCount})
          </button>
        </div>
      </div>

      {/* Feedback List */}
      <div className="flex-1 overflow-y-auto">
        {filteredFeedbacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 p-8">
            <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm font-medium">No {filter} feedback yet</p>
            <p className="text-xs mt-1 text-center">Use the Comment, Draw, or Shape tool to add feedback on the creative</p>
          </div>
        ) : (
          filteredFeedbacks.map((feedback) => {
            const isExpanded = expandedFeedbacks.has(feedback.id);
            const replyText = replyTexts[feedback.id] || "";
            const isReplying = activeReplyId === feedback.id;

            return (
              <div
                key={feedback.id}
                className={cn(
                  "border-b border-gray-100 dark:border-[#333] transition-colors cursor-pointer",
                  isExpanded ? "bg-blue-50/30 dark:bg-blue-900/10" : "hover:bg-gray-50 dark:hover:bg-[#333]"
                )}
                onClick={() => handleFeedbackClick(feedback.id)}
              >
                {/* Feedback Content */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Feedback Number Badge */}
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm",
                        feedback.resolved
                          ? "bg-green-500 text-white"
                          : "bg-red-500 text-white"
                      )}
                      title={`Feedback ${feedback.number}`}
                    >
                      {feedback.number.split('.')[1] || feedback.number}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                            #{feedback.number}
                          </span>
                          <span className="font-medium text-sm text-gray-800 dark:text-white">
                            {feedback.user.name}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {feedback.timestamp}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleResolved(feedback.id); }}
                            className={cn(
                              "p-1 rounded-full transition-colors",
                              feedback.resolved
                                ? "text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30"
                                : "text-gray-300 dark:text-gray-600 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30"
                            )}
                            title={feedback.resolved ? "Mark as unresolved" : "Mark as resolved"}
                          >
                            {feedback.resolved ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : (
                              <Circle className="w-5 h-5" />
                            )}
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333]"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); startReply(feedback.id); }}>
                                <Reply className="w-4 h-4 mr-2" />
                                Reply
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); deleteFeedback(feedback.id); }} className="text-red-600">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <p className={cn(
                        "text-sm leading-relaxed",
                        feedback.resolved ? "text-gray-500 dark:text-gray-400" : "text-gray-700 dark:text-gray-300"
                      )}>
                        {feedback.content}
                      </p>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-3 mt-2">
                        {/* Reply Button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); startReply(feedback.id); }}
                          className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          <Reply className="w-3.5 h-3.5" />
                          Reply
                        </button>

                        {/* Expand/Collapse Replies */}
                        {feedback.replies.length > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleExpand(feedback.id); }}
                            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                            {feedback.replies.length} {feedback.replies.length === 1 ? "reply" : "replies"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Replies Section */}
                  {isExpanded && feedback.replies.length > 0 && (
                    <div className="mt-3 ml-12 space-y-3">
                      {feedback.replies.map((reply) => (
                        <div
                          key={reply.id}
                          className="flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200"
                        >
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarFallback className={cn(reply.user.color, "text-white text-xs font-medium")}>
                              {reply.user.avatar}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl px-3 py-2">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-medium text-xs text-gray-800 dark:text-white">
                                {reply.user.name}
                              </span>
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {reply.timestamp}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{reply.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Input - Shows when replying or expanded */}
                  {(isReplying || isExpanded) && (
                    <div className="mt-3 ml-12 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className="bg-blue-500 text-white text-xs font-medium">
                            Y
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 flex items-center bg-gray-100 dark:bg-[#1a1a1a] rounded-full px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-200 dark:focus-within:ring-blue-800 transition-all">
                          <input
                            type="text"
                            placeholder="Write a reply..."
                            value={replyText}
                            onChange={(e) => updateReplyText(feedback.id, e.target.value)}
                            onFocus={() => setActiveReplyId(feedback.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleAddReply(feedback.id);
                              }
                            }}
                            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                          />
                          <button
                            onClick={() => handleAddReply(feedback.id)}
                            disabled={!replyText.trim()}
                            className="p-1 text-blue-500 hover:text-blue-600 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Hint */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-[#333] bg-gray-50 dark:bg-[#1a1a1a] shrink-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center flex items-center justify-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          Click on creative to add feedback
        </p>
      </div>
    </div>
  );
}
