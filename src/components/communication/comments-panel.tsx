"use client";

import { useState, useEffect } from "react";
import {
  Send,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Reply,
  MapPin,
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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
  drawingId?: string;
}

// AI Analysis types
export type AIAnalysisType =
  | "complete"
  | "typography"
  | "spacing"
  | "spelling"
  | "alignment"
  | "contrast";

export interface AISuggestion {
  id: string;
  type: AIAnalysisType;
  title: string;
  description: string;
  severity: "info" | "warning" | "error";
  location?: { x: number; y: number };
}

interface CommentsPanelProps {
  feedbacks?: Feedback[];
  onAddReply?: (feedbackId: string, reply: ReplyItem) => void;
  onFeedbackClick?: (feedbackId: string) => void;
  openFeedbackId?: string | null;
  viewMode?: "view" | "comments" | "ai";
  aiSuggestions?: AISuggestion[];
  onIgnoreAISuggestion?: (id: string) => void;
  userRole?: "owner" | "designer" | "client";
  workmode?: "creative" | "productive";
  currentUser?: { name: string; avatar: string; color: string };
}

// Default current user fallback
const defaultCurrentUser = {
  name: "You",
  avatar: "Y",
  color: "bg-blue-500",
};

export function CommentsPanel({
  feedbacks: externalFeedbacks,
  onAddReply,
  onFeedbackClick,
  openFeedbackId,
  viewMode = "comments",
  aiSuggestions = [],
  onIgnoreAISuggestion,
  userRole = "client",
  workmode = "productive",
  currentUser: propCurrentUser,
}: CommentsPanelProps) {
  const currentUser = propCurrentUser || defaultCurrentUser;
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(externalFeedbacks || []);
  const [expandedFeedbacks, setExpandedFeedbacks] = useState<Set<string>>(new Set());
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"client" | "team">("client");

  // Sync with external feedbacks
  useEffect(() => {
    if (externalFeedbacks) {
      setFeedbacks(externalFeedbacks);
    }
  }, [externalFeedbacks]);

  // Open specific feedback when marker is clicked
  useEffect(() => {
    if (openFeedbackId) {
      const feedback = feedbacks.find(f => f.id === openFeedbackId);
      if (feedback) {
        // Clients can only see client feedbacks
        if (userRole !== "client") {
          setFilter(feedback.source);
        }
        setExpandedFeedbacks(prev => new Set([...prev, openFeedbackId]));
      }
    }
  }, [openFeedbackId, feedbacks]);

  // In creative mode, show all feedbacks combined; in productive mode, filter by source tab
  const filteredFeedbacks = workmode === "creative"
    ? feedbacks
    : feedbacks.filter((f) => f.source === filter);

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

    setReplyTexts((prev) => ({ ...prev, [feedbackId]: "" }));
    setActiveReplyId(null);
    setExpandedFeedbacks((prev) => new Set([...prev, feedbackId]));
  };

  const handleFeedbackClick = (feedbackId: string) => {
    if (onFeedbackClick) {
      onFeedbackClick(feedbackId);
    }
  };

  const updateReplyText = (feedbackId: string, text: string) => {
    setReplyTexts((prev) => ({ ...prev, [feedbackId]: text }));
  };

  const startReply = (feedbackId: string) => {
    setActiveReplyId(feedbackId);
    setExpandedFeedbacks((prev) => new Set([...prev, feedbackId]));
  };

  const clientCount = feedbacks.filter((f) => f.source === "client").length;
  const teamCount = feedbacks.filter((f) => f.source === "team").length;

  return (
    <div className="absolute top-20 right-3 bottom-3 w-[300px] lg:w-[340px] xl:w-[380px] bg-white dark:bg-[#2a2a2a] rounded-xl shadow-xl border border-gray-200 dark:border-[#444] flex flex-col z-10 overflow-hidden">
      {/* Header */}
      <div className={cn(
        "px-4 py-3 border-b border-gray-100 dark:border-[#333] shrink-0",
        viewMode === "ai"
          ? "bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20"
          : "bg-gradient-to-r from-gray-50 to-white dark:from-[#333] dark:to-[#2a2a2a]"
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {viewMode === "ai" ? (
              <>
                <div className="p-1 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <h2 className="font-semibold text-gray-800 dark:text-white">AI Suggestions</h2>
                <span className="text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-medium">
                  {aiSuggestions.length}
                </span>
              </>
            ) : (
              <>
                <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="font-semibold text-gray-800 dark:text-white">Feedback</h2>
                <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                  {feedbacks.length}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Filter Tabs - hidden in creative mode (everyone collaborates) and from client users in productive mode */}
        {viewMode !== "ai" && workmode === "productive" && userRole !== "client" && (
          <div className="flex gap-1 bg-gray-100 dark:bg-[#1a1a1a] p-1 rounded-lg">
            <button
              onClick={() => setFilter("client")}
              className={cn(
                "flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-all",
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
                "flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-all",
                filter === "team"
                  ? "bg-white dark:bg-[#333] text-gray-800 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              Team ({teamCount})
            </button>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === "ai" ? (
          aiSuggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 p-8">
              <Sparkles className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm font-medium">No AI suggestions</p>
              <p className="text-xs mt-1 text-center">
                Run an AI analysis from the sidebar to get design feedback
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-[#333]">
              {aiSuggestions.map((suggestion, index) => {
                const severityColor = suggestion.severity === "error"
                  ? "bg-red-500"
                  : suggestion.severity === "warning"
                    ? "bg-amber-500"
                    : "bg-blue-500";

                return (
                  <div
                    key={suggestion.id}
                    className="p-3 hover:bg-gray-50 dark:hover:bg-[#333] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0",
                        severityColor
                      )}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 capitalize">
                            {suggestion.type}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onIgnoreAISuggestion?.(suggestion.id);
                            }}
                            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                          >
                            Ignore
                          </button>
                        </div>
                        <p className="text-sm text-gray-800 dark:text-white leading-relaxed">
                          {suggestion.title}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : filteredFeedbacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 p-8">
            <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm font-medium">No {workmode === "creative" ? "" : `${filter} `}feedback yet</p>
            <p className="text-xs mt-1 text-center">
              Use the Comment, Draw, or Shape tool to add feedback on the creative
            </p>
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
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Feedback Number Badge */}
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm text-white",
                        workmode === "creative"
                          ? feedback.source === "client" ? "bg-orange-500" : "bg-indigo-500"
                          : "bg-red-500"
                      )}
                      title={`${workmode === "creative" ? `${feedback.source} ` : ""}Feedback ${feedback.number}`}
                    >
                      {feedback.number.split('.')[1] || feedback.number}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                          #{feedback.number}
                        </span>
                        <span className="font-medium text-sm text-gray-800 dark:text-white">
                          {feedback.user.name}
                        </span>
                        {workmode === "creative" && (
                          <span className={cn(
                            "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
                            feedback.source === "client"
                              ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                              : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                          )}>
                            {feedback.source}
                          </span>
                        )}
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {feedback.timestamp}
                        </span>
                      </div>

                      <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                        {feedback.content}
                      </p>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); startReply(feedback.id); }}
                          className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          <Reply className="w-3.5 h-3.5" />
                          Reply
                        </button>

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

                  {/* Replies */}
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

                  {/* Reply Input */}
                  {(isReplying || isExpanded) && (
                    <div className="mt-3 ml-12 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className={cn(currentUser.color, "text-white text-xs font-medium")}>
                            {currentUser.avatar}
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
      <div className={cn(
        "px-4 py-3 border-t border-gray-100 dark:border-[#333] shrink-0",
        viewMode === "ai"
          ? "bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10"
          : "bg-gray-50 dark:bg-[#1a1a1a]"
      )}>
        {viewMode === "ai" ? (
          <p className="text-xs text-purple-600 dark:text-purple-400 text-center flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Click on annotations on the graphic to see details
          </p>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center flex items-center justify-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            Click on creative to add feedback
          </p>
        )}
      </div>
    </div>
  );
}
