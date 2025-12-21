"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import {
  FabricCanvasManager,
  DrawingPath,
  ToolType,
} from "@/lib/fabric";

export interface UseFabricCanvasOptions {
  initialDrawings?: DrawingPath[];
  tool?: ToolType;
  color?: string;
  strokeWidth?: number;
  onDrawingsChange?: (drawings: DrawingPath[]) => void;
}

export interface UseFabricCanvasReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  manager: FabricCanvasManager | null;
  isReady: boolean;
  clearAll: () => void;
  deleteSelected: () => void;
  getDrawings: () => DrawingPath[];
}

export function useFabricCanvas(
  options: UseFabricCanvasOptions
): UseFabricCanvasReturn {
  const {
    initialDrawings = [],
    tool = "pointer",
    color = "#FF5733",
    strokeWidth = 2,
    onDrawingsChange,
  } = options;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const managerRef = useRef<FabricCanvasManager | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isReady, setIsReady] = useState(false);

  // Initialize manager and canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    // Get parent dimensions
    const parent = canvasRef.current.parentElement;
    if (!parent) return;

    containerRef.current = parent as HTMLDivElement;
    const { width, height } = parent.getBoundingClientRect();

    // Create manager
    const manager = new FabricCanvasManager();

    // Initialize canvas
    manager.initialize(canvasRef.current, width, height);

    // Set callbacks
    manager.setCallbacks({
      onDrawingComplete: (drawings) => {
        onDrawingsChange?.(drawings);
      },
    });

    managerRef.current = manager;
    setIsReady(true);

    // Cleanup on unmount
    return () => {
      manager.dispose();
      managerRef.current = null;
      setIsReady(false);
    };
  }, []);

  // Handle resize
  useEffect(() => {
    if (!managerRef.current || !containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          managerRef.current?.resize(width, height);
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isReady]);

  // Load initial drawings
  useEffect(() => {
    if (!isReady || !managerRef.current) return;

    managerRef.current.loadDrawings(initialDrawings);
  }, [isReady, initialDrawings]);

  // Update tool when it changes
  useEffect(() => {
    if (!isReady || !managerRef.current) return;

    managerRef.current.setTool(tool);
  }, [isReady, tool]);

  // Update tool config when color or stroke changes
  useEffect(() => {
    if (!isReady || !managerRef.current) return;

    managerRef.current.setToolConfig({ color, strokeWidth });
  }, [isReady, color, strokeWidth]);

  // Clear all drawings
  const clearAll = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.clearAll();
    }
  }, []);

  // Delete selected objects
  const deleteSelected = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.deleteSelected();
    }
  }, []);

  // Get current drawings
  const getDrawings = useCallback(() => {
    return managerRef.current?.getDrawings() ?? [];
  }, []);

  return {
    canvasRef,
    manager: managerRef.current,
    isReady,
    clearAll,
    deleteSelected,
    getDrawings,
  };
}
