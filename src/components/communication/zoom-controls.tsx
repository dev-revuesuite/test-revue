"use client";

import { useState } from "react";
import { Minus, Plus, Maximize2, Minimize2, HelpCircle, Focus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomChange?: (zoom: number) => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

export function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomChange,
  onToggleFullscreen,
  isFullscreen = false,
}: ZoomControlsProps) {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const zoomPresets = [25, 50, 75, 100, 125, 150, 200];

  const handleResetZoom = () => {
    onZoomChange?.(100);
  };

  const handlePresetSelect = (preset: number) => {
    onZoomChange?.(preset);
  };

  return (
    <TooltipProvider>
      <div className={`absolute bottom-4 flex items-center gap-2 ${
        isFullscreen
          ? "right-4"
          : "right-[324px] lg:right-[364px] xl:right-[404px]"
      }`}>
        {/* Zoom Controls Container */}
        <div className="flex items-center bg-white dark:bg-[#2a2a2a] rounded-lg shadow-sm border border-gray-200 dark:border-[#444]">
          {/* Reset to 100% */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-gray-600 dark:text-gray-400 rounded-l-lg hover:bg-gray-100 dark:hover:bg-[#333]"
                onClick={handleResetZoom}
              >
                <Focus className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Reset to 100%</p>
            </TooltipContent>
          </Tooltip>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-200 dark:bg-[#444]" />

          {/* Zoom Out */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#333]"
                onClick={onZoomOut}
                disabled={zoom <= 10}
              >
                <Minus className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Zoom Out</p>
            </TooltipContent>
          </Tooltip>

          {/* Zoom Level */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-9 px-2 text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[52px] hover:bg-gray-100 dark:hover:bg-[#333]"
              >
                {zoom}%
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              {zoomPresets.map((preset) => (
                <DropdownMenuItem
                  key={preset}
                  onClick={() => handlePresetSelect(preset)}
                  className={zoom === preset ? "bg-gray-100 dark:bg-[#333]" : ""}
                >
                  {preset}%
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Zoom In */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#333]"
                onClick={onZoomIn}
                disabled={zoom >= 200}
              >
                <Plus className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Zoom In</p>
            </TooltipContent>
          </Tooltip>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-200 dark:bg-[#444]" />

          {/* Fullscreen Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#333]"
                onClick={onToggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-5 h-5" />
                ) : (
                  <Maximize2 className="w-5 h-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</p>
            </TooltipContent>
          </Tooltip>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-200 dark:bg-[#444]" />

          {/* Help Button with Shortcuts Panel */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-gray-600 dark:text-gray-400 rounded-r-lg hover:bg-gray-100 dark:hover:bg-[#333]"
              onMouseEnter={() => setShowShortcuts(true)}
              onMouseLeave={() => setShowShortcuts(false)}
            >
              <HelpCircle className="w-5 h-5" />
            </Button>

            {/* Keyboard Shortcuts Panel */}
            {showShortcuts && (
              <div
                className="absolute bottom-full right-0 mb-2 w-72 bg-white dark:bg-[#2a2a2a] rounded-xl shadow-2xl border border-gray-200 dark:border-[#444] p-4 z-50"
                onMouseEnter={() => setShowShortcuts(true)}
                onMouseLeave={() => setShowShortcuts(false)}
              >
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Keyboard Shortcuts</h3>

                <div className="space-y-3">
                  {/* Tools */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Tools</p>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Pointer</span>
                        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-[#333] rounded text-gray-500 dark:text-gray-400 font-mono">V</kbd>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Draw</span>
                        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-[#333] rounded text-gray-500 dark:text-gray-400 font-mono">D</kbd>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Shape</span>
                        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-[#333] rounded text-gray-500 dark:text-gray-400 font-mono">S</kbd>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Comment</span>
                        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-[#333] rounded text-gray-500 dark:text-gray-400 font-mono">C</kbd>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Compare</span>
                        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-[#333] rounded text-gray-500 dark:text-gray-400 font-mono">K</kbd>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Rotate</span>
                        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-[#333] rounded text-gray-500 dark:text-gray-400 font-mono">R</kbd>
                      </div>
                    </div>
                  </div>

                  {/* Navigation */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Navigation</p>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Pan</span>
                        <div className="flex items-center gap-1">
                          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-[#333] rounded text-gray-500 dark:text-gray-400 font-mono">Space</kbd>
                          <span className="text-gray-400">+ drag</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Zoom</span>
                        <div className="flex items-center gap-1">
                          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-[#333] rounded text-gray-500 dark:text-gray-400 font-mono">⌘/Ctrl</kbd>
                          <span className="text-gray-400">+ scroll</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Zoom In</span>
                        <div className="flex items-center gap-0.5">
                          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-[#333] rounded text-gray-500 dark:text-gray-400 font-mono">⌘/Ctrl</kbd>
                          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-[#333] rounded text-gray-500 dark:text-gray-400 font-mono">+</kbd>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Zoom Out</span>
                        <div className="flex items-center gap-0.5">
                          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-[#333] rounded text-gray-500 dark:text-gray-400 font-mono">⌘/Ctrl</kbd>
                          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-[#333] rounded text-gray-500 dark:text-gray-400 font-mono">-</kbd>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Reset View</span>
                        <div className="flex items-center gap-0.5">
                          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-[#333] rounded text-gray-500 dark:text-gray-400 font-mono">⌘/Ctrl</kbd>
                          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-[#333] rounded text-gray-500 dark:text-gray-400 font-mono">0</kbd>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Fullscreen</span>
                        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-[#333] rounded text-gray-500 dark:text-gray-400 font-mono">F</kbd>
                      </div>
                    </div>
                  </div>

                  {/* General */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">General</p>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Close/Cancel</span>
                        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-[#333] rounded text-gray-500 dark:text-gray-400 font-mono">Esc</kbd>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
