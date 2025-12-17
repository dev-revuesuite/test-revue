"use client";

import {
  MousePointer2,
  Pencil,
  Square,
  MessageSquare,
  GitCompare,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Tool {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
}

const tools: Tool[] = [
  { id: "pointer", icon: MousePointer2, label: "Pointer", shortcut: "V" },
  { id: "draw", icon: Pencil, label: "Draw", shortcut: "D" },
  { id: "shape", icon: Square, label: "Shape", shortcut: "S" },
  { id: "comment", icon: MessageSquare, label: "Comment", shortcut: "C" },
  { id: "compare", icon: GitCompare, label: "Compare", shortcut: "K" },
  { id: "rotate", icon: RotateCw, label: "Rotate", shortcut: "R" },
];

interface CommunicationSidebarProps {
  selectedTool: string;
  onSelectTool: (tool: string) => void;
}

export function CommunicationSidebar({
  selectedTool,
  onSelectTool,
}: CommunicationSidebarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      {/* Floating sidebar - positioned absolute, centered vertically */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 bg-white dark:bg-[#2a2a2a] rounded-2xl shadow-lg border border-gray-200 dark:border-[#444] flex flex-col items-center py-2.5 px-1.5">
        {/* Tool Buttons */}
        <div className="flex flex-col items-center gap-0.5">
          {tools.map((tool) => (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-10 w-10 rounded-lg transition-all",
                    selectedTool === tool.id
                      ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#333]"
                  )}
                  onClick={() => onSelectTool(tool.id)}
                >
                  <tool.icon className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>
                  {tool.label}
                  {tool.shortcut && (
                    <span className="ml-2 text-gray-400">{tool.shortcut}</span>
                  )}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
