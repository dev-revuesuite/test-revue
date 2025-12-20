"use client";

import { Minus, Plus, Maximize2, HelpCircle, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function ZoomControls({ zoom, onZoomIn, onZoomOut }: ZoomControlsProps) {
  const zoomPresets = [25, 50, 75, 100, 125, 150, 200];

  return (
    <div className="absolute bottom-4 right-[324px] lg:right-[364px] xl:right-[404px] flex items-center gap-2">
      {/* Zoom Controls Container */}
      <div className="flex items-center bg-white dark:bg-[#2a2a2a] rounded-lg shadow-sm border border-gray-200 dark:border-[#444]">
        {/* Grid/Layout */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-gray-600 dark:text-gray-400 rounded-l-lg hover:bg-gray-100 dark:hover:bg-[#333]"
        >
          <LayoutGrid className="w-5 h-5" />
        </Button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200 dark:bg-[#444]" />

        {/* Zoom Out */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#333]"
          onClick={onZoomOut}
          disabled={zoom <= 10}
        >
          <Minus className="w-5 h-5" />
        </Button>

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
              <DropdownMenuItem key={preset}>{preset}%</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Zoom In */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#333]"
          onClick={onZoomIn}
          disabled={zoom >= 200}
        >
          <Plus className="w-5 h-5" />
        </Button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200 dark:bg-[#444]" />

        {/* Help Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-gray-600 dark:text-gray-400 rounded-r-lg hover:bg-gray-100 dark:hover:bg-[#333]"
        >
          <HelpCircle className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
