"use client";

import { useState } from "react";
import {
  MousePointer2,
  Pencil,
  Square,
  MessageSquare,
  GitCompare,
  RotateCw,
  Circle as CircleIcon,
  Minus,
  ArrowRight,
  Sparkles,
  ScanLine,
  Type,
  LayoutGrid,
  SpellCheck,
  AlignLeft,
  Contrast,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ShapeType } from "@/lib/fabric";
import { AIAnalysisType } from "./comments-panel";

interface Tool {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
  isToggle?: boolean;
}

const tools: Tool[] = [
  { id: "pointer", icon: MousePointer2, label: "Pointer", shortcut: "V" },
  { id: "draw", icon: Pencil, label: "Draw", shortcut: "D" },
  { id: "comment", icon: MessageSquare, label: "Comment", shortcut: "C" },
  { id: "compare", icon: GitCompare, label: "Compare", shortcut: "K", isToggle: true },
  { id: "rotate", icon: RotateCw, label: "Rotate", shortcut: "R" },
];

// Color palette
const colorOptions = [
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#000000", // Black
];

// Shape options
const shapeOptions: { type: ShapeType; icon: React.ReactNode; label: string }[] = [
  { type: "rectangle", icon: <Square className="w-4 h-4" />, label: "Rectangle" },
  { type: "circle", icon: <CircleIcon className="w-4 h-4" />, label: "Circle" },
  { type: "line", icon: <Minus className="w-4 h-4" />, label: "Line" },
  { type: "arrow", icon: <ArrowRight className="w-4 h-4" />, label: "Arrow" },
];

// AI Analysis options
const aiAnalysisOptions: { type: AIAnalysisType; label: string; icon: React.ReactNode; description: string }[] = [
  { type: "complete", label: "Full Design Review", icon: <ScanLine className="w-4 h-4" />, description: "Comprehensive analysis" },
  { type: "typography", label: "Typography Check", icon: <Type className="w-4 h-4" />, description: "Line height & fonts" },
  { type: "spacing", label: "Spacing Analysis", icon: <LayoutGrid className="w-4 h-4" />, description: "Margins & gaps" },
  { type: "spelling", label: "Text & Spelling", icon: <SpellCheck className="w-4 h-4" />, description: "Typos & grammar" },
  { type: "alignment", label: "Alignment Audit", icon: <AlignLeft className="w-4 h-4" />, description: "Grid consistency" },
  { type: "contrast", label: "Contrast Review", icon: <Contrast className="w-4 h-4" />, description: "Color accessibility" },
];

interface CommunicationSidebarProps {
  selectedTool: string;
  onSelectTool: (tool: string) => void;
  compareMode?: boolean;
  // Drawing customization props
  drawingColor?: string;
  onColorChange?: (color: string) => void;
  shapeType?: ShapeType;
  onShapeTypeChange?: (shapeType: ShapeType) => void;
  // AI Analysis props
  onStartAIAnalysis?: (type: AIAnalysisType) => void;
  aiAnalysisActive?: boolean;
  viewMode?: "view" | "comments" | "ai";
  // External control of AI options panel
  showAIOptions?: boolean;
  onShowAIOptionsChange?: (show: boolean) => void;
  // Role-based
  canAddFeedback?: boolean;
}

export function CommunicationSidebar({
  selectedTool,
  onSelectTool,
  compareMode = false,
  drawingColor = "#ef4444",
  onColorChange,
  shapeType = "rectangle",
  onShapeTypeChange,
  onStartAIAnalysis,
  aiAnalysisActive = false,
  viewMode = "comments",
  showAIOptions: externalShowAIOptions,
  onShowAIOptionsChange,
  canAddFeedback = true,
}: CommunicationSidebarProps) {
  const [internalShowAIOptions, setInternalShowAIOptions] = useState(false);

  // Use external state if provided, otherwise use internal state
  const showAIOptions = externalShowAIOptions !== undefined ? externalShowAIOptions : internalShowAIOptions;
  const setShowAIOptions = (show: boolean) => {
    if (onShowAIOptionsChange) {
      onShowAIOptionsChange(show);
    } else {
      setInternalShowAIOptions(show);
    }
  };

  const showExtension = selectedTool === "draw";
  // Disable draw, comment tools when AI analysis is active OR when in AI view mode
  const toolsDisabled = aiAnalysisActive || viewMode === "ai";

  const handleAIAnalysis = (type: AIAnalysisType) => {
    setShowAIOptions(false);
    onStartAIAnalysis?.(type);
  };

  return (
    <TooltipProvider delayDuration={300}>
      {/* Container for sidebar and extension panel */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {/* Main Toolbar */}
        <div className="bg-white dark:bg-[#2a2a2a] rounded-2xl shadow-lg border border-gray-200 dark:border-[#444] flex flex-col items-center py-2.5 px-1.5">
          {/* AI Analyse Button - Top with gradient effect */}
          <div className="mb-2 pb-2 border-b border-gray-200 dark:border-[#444]">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowAIOptions(!showAIOptions)}
                  disabled={aiAnalysisActive}
                  className={cn(
                    "relative h-10 w-10 rounded-lg flex items-center justify-center transition-all overflow-hidden group",
                    showAIOptions || aiAnalysisActive
                      ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30"
                      : "bg-gradient-to-br from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400 hover:from-purple-500 hover:to-pink-500 hover:text-white hover:shadow-lg hover:shadow-purple-500/30"
                  )}
                >
                  {/* Shining effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <Sparkles className={cn("w-5 h-5 relative z-10", aiAnalysisActive && "animate-pulse")} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>AI Analyse {aiAnalysisActive && "(Analyzing...)"}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Tool Buttons */}
          <div className="flex flex-col items-center gap-0.5">
            {tools.filter(tool => canAddFeedback || tool.id !== "comment").map((tool) => {
              const isActive = tool.id === "compare" ? compareMode : selectedTool === tool.id;
              const isDisabled = toolsDisabled && tool.id !== "compare" && tool.id !== "rotate";

              return (
                <Tooltip key={tool.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isDisabled}
                      className={cn(
                        "h-10 w-10 rounded-lg transition-all",
                        isDisabled
                          ? "opacity-40 cursor-not-allowed"
                          : isActive
                            ? tool.id === "compare"
                              ? "bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400"
                              : "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#333]"
                      )}
                      onClick={() => !isDisabled && onSelectTool(tool.id)}
                    >
                      <tool.icon className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>
                      {tool.label}
                      {isDisabled && " (Exit AI mode first)"}
                      {tool.isToggle && compareMode && " (Active)"}
                      {!isDisabled && tool.shortcut && (
                        <span className="ml-2 text-gray-400">{tool.shortcut}</span>
                      )}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {/* Compare Mode Indicator */}
          {compareMode && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-[#444]">
              <div className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded text-xs font-medium text-purple-700 dark:text-purple-300 text-center">
                Compare
              </div>
            </div>
          )}
        </div>

        {/* Extension Panel - Color Selector for Draw tool */}
        {showExtension && (
          <div className="bg-white dark:bg-[#2a2a2a] rounded-2xl shadow-lg border border-gray-200 dark:border-[#444] p-3 flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Color</span>
              <div className="grid grid-cols-4 gap-1.5">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    onClick={() => onColorChange?.(color)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-all hover:scale-110",
                      drawingColor === color
                        ? "border-gray-800 dark:border-white scale-110 ring-2 ring-offset-1 ring-gray-400 dark:ring-gray-600"
                        : "border-gray-200 dark:border-gray-600"
                    )}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AI Analysis Options Panel */}
        {showAIOptions && !aiAnalysisActive && (
          <div className="bg-white dark:bg-[#2a2a2a] rounded-2xl shadow-xl border border-gray-200 dark:border-[#444] p-3 w-[220px] animate-in fade-in slide-in-from-left-2 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-800 dark:text-white">AI Analyse</span>
              </div>
              <button
                onClick={() => setShowAIOptions(false)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Analysis Options */}
            <div className="space-y-1">
              {aiAnalysisOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => handleAIAnalysis(option.type)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/20 dark:hover:to-pink-900/20 transition-all group"
                >
                  <div className="p-1.5 rounded-md bg-gray-100 dark:bg-[#333] group-hover:bg-gradient-to-br group-hover:from-purple-500 group-hover:to-pink-500 group-hover:text-white transition-all">
                    {option.icon}
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-xs font-medium text-gray-800 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-300">
                      {option.label}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      {option.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
