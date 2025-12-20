"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Send, X, CheckCircle2, Circle, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface CompareIteration {
  id: string;
  name: string;
  version: number;
  timestamp: string;
}

interface ReplyItem {
  id: string;
  user: {
    name: string;
    avatar: string;
    color: string;
  };
  content: string;
  timestamp: string;
}

interface FeedbackMarker {
  id: string;
  x: number;
  y: number;
  number: string;
  content: string;
  resolved: boolean;
  user?: {
    name: string;
    avatar: string;
    color: string;
  };
  timestamp?: string;
  replies?: ReplyItem[];
}

interface DrawingPath {
  id: string;
  type: "draw" | "shape";
  points?: { x: number; y: number }[];
  rect?: { x: number; y: number; width: number; height: number };
  color: string;
  strokeWidth: number;
}

interface CanvasAreaProps {
  zoom: number;
  selectedTool: string;
  onAddFeedback?: (feedback: {
    id: string;
    number: string;
    content: string;
    x: number;
    y: number;
    drawing?: DrawingPath;
  }) => void;
  currentIteration?: number;
  feedbackCount?: number;
  markers?: FeedbackMarker[];
  highlightedMarker?: string | null;
  onMarkerClick?: (markerId: string) => void;
  onToggleResolved?: (markerId: string) => void;
  onAddReply?: (markerId: string, reply: ReplyItem) => void;
  // New props for compare mode, rotation, and dynamic image
  imageUrl?: string;
  rotation?: number;
  compareMode?: boolean;
  compareImageUrl?: string;
  compareIterations?: CompareIteration[];
  selectedCompareId?: string | null;
  onCompareIterationChange?: (id: string | null) => void;
  // Drawings props (iteration-specific)
  drawings?: DrawingPath[];
  onDrawingsChange?: (drawings: DrawingPath[]) => void;
  // Keyboard/mouse shortcut handlers
  onZoomChange?: (zoom: number) => void;
  onToolChange?: (tool: string) => void;
  onRotate?: () => void;
  onToggleCompare?: () => void;
  onResetView?: () => void;
  onToggleFullscreen?: () => void;
}

export function CanvasArea({
  zoom,
  selectedTool,
  onAddFeedback,
  currentIteration = 5,
  feedbackCount = 0,
  markers: externalMarkers,
  highlightedMarker,
  onMarkerClick,
  onToggleResolved,
  onAddReply,
  imageUrl = "/assets/login.png",
  rotation = 0,
  compareMode = false,
  compareImageUrl,
  compareIterations = [],
  selectedCompareId,
  onCompareIterationChange,
  drawings: externalDrawings = [],
  onDrawingsChange,
  onZoomChange,
  onToolChange,
  onRotate,
  onToggleCompare,
  onResetView,
  onToggleFullscreen,
}: CanvasAreaProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Feedback popover state (for new feedback)
  const [showPopover, setShowPopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [markerPosition, setMarkerPosition] = useState({ x: 0, y: 0 });
  const [feedbackText, setFeedbackText] = useState("");

  // Chat popover state (for viewing existing feedback)
  const [selectedMarker, setSelectedMarker] = useState<FeedbackMarker | null>(null);
  const [showChatPopover, setShowChatPopover] = useState(false);
  const [chatPopoverPosition, setChatPopoverPosition] = useState({ x: 0, y: 0 });
  const [replyText, setReplyText] = useState("");

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDrawing, setCurrentDrawing] = useState<DrawingPath | null>(null);
  const [imageSize, setImageSize] = useState({ width: 500, height: 0 });
  const [displayedSize, setDisplayedSize] = useState({ width: 0, height: 0 });

  // Use external drawings from parent (iteration-specific)
  const drawings = externalDrawings;

  // Use external markers if provided, otherwise use default
  const defaultMarkers: FeedbackMarker[] = [
    { id: "5.1", x: 25, y: 15, number: "5.1", content: "Can we make the hands more prominent?", resolved: false },
    { id: "5.2", x: 70, y: 45, number: "5.2", content: "Love the color palette!", resolved: true },
    { id: "5.3", x: 40, y: 75, number: "5.3", content: "User labels need better positioning", resolved: false },
  ];
  const markers = externalMarkers || defaultMarkers;
  const localFeedbackCount = feedbackCount;

  // Compare dropdown state
  const [showCompareDropdown, setShowCompareDropdown] = useState(false);

  // Spacebar pan state
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Drawing color
  const drawingColor = "#ef4444"; // Red color for annotations

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Spacebar for panning
      if (e.code === 'Space' && !isSpacePressed) {
        e.preventDefault();
        setIsSpacePressed(true);
      }

      // Tool shortcuts (only when no modifier key)
      if (!modKey && !e.shiftKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'v':
            e.preventDefault();
            onToolChange?.('pointer');
            break;
          case 'd':
            e.preventDefault();
            onToolChange?.('draw');
            break;
          case 's':
            e.preventDefault();
            onToolChange?.('shape');
            break;
          case 'c':
            e.preventDefault();
            onToolChange?.('comment');
            break;
          case 'k':
            e.preventDefault();
            onToggleCompare?.();
            break;
          case 'r':
            e.preventDefault();
            onRotate?.();
            break;
          case 'escape':
            e.preventDefault();
            setShowPopover(false);
            setShowChatPopover(false);
            setShowCompareDropdown(false);
            setCurrentDrawing(null);
            break;
          case 'f':
            e.preventDefault();
            onToggleFullscreen?.();
            break;
        }
      }

      // Zoom shortcuts (5% increments for smoother zoom)
      if (modKey) {
        switch (e.key) {
          case '=':
          case '+':
            e.preventDefault();
            onZoomChange?.(Math.min(zoom + 5, 200));
            break;
          case '-':
            e.preventDefault();
            onZoomChange?.(Math.max(zoom - 5, 10));
            break;
          case '0':
            e.preventDefault();
            onZoomChange?.(100);
            onResetView?.();
            setPanOffset({ x: 0, y: 0 });
            break;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [zoom, isSpacePressed, onToolChange, onZoomChange, onRotate, onToggleCompare, onResetView, onToggleFullscreen]);

  // Mouse wheel zoom (Cmd/Ctrl + scroll) - smooth 2% increments
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey) {
        e.preventDefault();
        // Use smaller increment (2%) for smoother zoom with scroll
        const delta = e.deltaY > 0 ? -2 : 2;
        const newZoom = Math.min(Math.max(zoom + delta, 10), 200);
        onZoomChange?.(newZoom);
      }
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener('wheel', handleWheel);
      }
    };
  }, [zoom, onZoomChange]);

  // Get canvas context
  const getContext = useCallback(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }, []);

  // Redraw all drawings
  const redrawCanvas = useCallback(() => {
    const ctx = getContext();
    const canvas = drawingCanvasRef.current;
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all saved drawings
    drawings.forEach((drawing) => {
      ctx.strokeStyle = drawing.color;
      ctx.lineWidth = drawing.strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (drawing.type === "draw" && drawing.points) {
        ctx.beginPath();
        drawing.points.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
      } else if (drawing.type === "shape" && drawing.rect) {
        ctx.strokeRect(drawing.rect.x, drawing.rect.y, drawing.rect.width, drawing.rect.height);
      }
    });
  }, [drawings, getContext]);

  // Update canvas size when image loads and track displayed size with ResizeObserver
  useEffect(() => {
    const img = imageRef.current?.querySelector("img");
    if (img) {
      const updateSize = () => {
        setImageSize({ width: img.naturalWidth || 500, height: img.naturalHeight || 700 });
        // Also update displayed size
        const rect = img.getBoundingClientRect();
        setDisplayedSize({ width: rect.width, height: rect.height });
      };
      if (img.complete) {
        updateSize();
      } else {
        img.onload = updateSize;
      }

      // ResizeObserver to track displayed size changes (for responsive design)
      const resizeObserver = new ResizeObserver(() => {
        const rect = img.getBoundingClientRect();
        setDisplayedSize({ width: rect.width, height: rect.height });
      });
      resizeObserver.observe(img);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [imageUrl]);

  // Set canvas size based on displayed image dimensions
  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    if (canvas && displayedSize.width > 0 && displayedSize.height > 0) {
      // Use displayed size for canvas to match the responsive image
      canvas.width = displayedSize.width;
      canvas.height = displayedSize.height;
      redrawCanvas();
    }
  }, [displayedSize, redrawCanvas]);

  // Redraw when drawings change (e.g., when switching iterations)
  useEffect(() => {
    redrawCanvas();
  }, [drawings, redrawCanvas]);

  // Handle panning (middle mouse, alt+click, or spacebar+drag)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && selectedTool === "pointer" && e.altKey) || (e.button === 0 && isSpacePressed)) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Get position relative to canvas
  const getCanvasPosition = (e: React.MouseEvent) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Handle drawing start
  const handleDrawingStart = (e: React.MouseEvent) => {
    if (selectedTool === "draw") {
      e.stopPropagation();
      const pos = getCanvasPosition(e);
      setIsDrawing(true);
      setCurrentPath([pos]);

      const ctx = getContext();
      if (ctx) {
        ctx.strokeStyle = drawingColor;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
      }
    } else if (selectedTool === "shape") {
      e.stopPropagation();
      const pos = getCanvasPosition(e);
      setIsDrawing(true);
      setShapeStart(pos);
    }
  };

  // Handle drawing move
  const handleDrawingMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;

    if (selectedTool === "draw") {
      const pos = getCanvasPosition(e);
      setCurrentPath((prev) => [...prev, pos]);

      const ctx = getContext();
      if (ctx) {
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }
    } else if (selectedTool === "shape" && shapeStart) {
      const pos = getCanvasPosition(e);
      const ctx = getContext();
      const canvas = drawingCanvasRef.current;
      if (ctx && canvas) {
        // Redraw previous drawings
        redrawCanvas();

        // Draw current shape preview
        ctx.strokeStyle = drawingColor;
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
          shapeStart.x,
          shapeStart.y,
          pos.x - shapeStart.x,
          pos.y - shapeStart.y
        );
        ctx.setLineDash([]);
      }
    }
  };

  // Handle drawing end
  const handleDrawingEnd = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const imageElement = imageRef.current;
    if (!imageElement) return;

    const rect = imageElement.getBoundingClientRect();

    if (selectedTool === "draw" && currentPath.length > 1) {
      const newDrawing: DrawingPath = {
        id: `drawing-${Date.now()}`,
        type: "draw",
        points: currentPath,
        color: drawingColor,
        strokeWidth: 3,
      };
      onDrawingsChange?.([...drawings, newDrawing]);
      setCurrentDrawing(newDrawing);

      // Calculate center of drawing for marker position
      const centerX = currentPath.reduce((sum, p) => sum + p.x, 0) / currentPath.length;
      const centerY = currentPath.reduce((sum, p) => sum + p.y, 0) / currentPath.length;
      const canvas = drawingCanvasRef.current;
      if (canvas) {
        setMarkerPosition({
          x: (centerX / canvas.width) * 100,
          y: (centerY / canvas.height) * 100,
        });
      }

      // Show popover
      setPopoverPosition({ x: e.clientX, y: e.clientY });
      setShowPopover(true);
      setFeedbackText("");
    } else if (selectedTool === "shape" && shapeStart) {
      const pos = getCanvasPosition(e);
      const width = pos.x - shapeStart.x;
      const height = pos.y - shapeStart.y;

      if (Math.abs(width) > 10 && Math.abs(height) > 10) {
        const newDrawing: DrawingPath = {
          id: `shape-${Date.now()}`,
          type: "shape",
          rect: {
            x: width > 0 ? shapeStart.x : pos.x,
            y: height > 0 ? shapeStart.y : pos.y,
            width: Math.abs(width),
            height: Math.abs(height),
          },
          color: drawingColor,
          strokeWidth: 3,
        };
        onDrawingsChange?.([...drawings, newDrawing]);
        setCurrentDrawing(newDrawing);
        redrawCanvas();

        // Calculate center of shape for marker position
        const canvas = drawingCanvasRef.current;
        if (canvas && newDrawing.rect) {
          setMarkerPosition({
            x: ((newDrawing.rect.x + newDrawing.rect.width / 2) / canvas.width) * 100,
            y: ((newDrawing.rect.y + newDrawing.rect.height / 2) / canvas.height) * 100,
          });
        }

        // Show popover
        setPopoverPosition({ x: e.clientX, y: e.clientY });
        setShowPopover(true);
        setFeedbackText("");
      }
    }

    setCurrentPath([]);
    setShapeStart(null);
  };

  // Handle canvas click for comment tool
  const handleImageClick = (e: React.MouseEvent) => {
    if (selectedTool === "comment") {
      e.stopPropagation();

      const imageElement = imageRef.current;
      if (!imageElement) return;

      const rect = imageElement.getBoundingClientRect();

      // Calculate position relative to the image (as percentage)
      const relativeX = ((e.clientX - rect.left) / rect.width) * 100;
      const relativeY = ((e.clientY - rect.top) / rect.height) * 100;

      // Set marker position (percentage based)
      setMarkerPosition({ x: relativeX, y: relativeY });

      // Set popover position (screen coordinates)
      setPopoverPosition({ x: e.clientX, y: e.clientY });
      setShowPopover(true);
      setFeedbackText("");
      setCurrentDrawing(null);
    }
  };

  // Handle feedback submission
  const handleSubmitFeedback = () => {
    if (!feedbackText.trim()) return;

    const newFeedbackNumber = localFeedbackCount + 1;
    const feedbackId = `${currentIteration}.${newFeedbackNumber}`;

    if (onAddFeedback) {
      onAddFeedback({
        id: feedbackId,
        number: feedbackId,
        content: feedbackText.trim(),
        x: markerPosition.x,
        y: markerPosition.y,
        drawing: currentDrawing || undefined,
      });
    }

    setShowPopover(false);
    setFeedbackText("");
    setCurrentDrawing(null);
  };

  // Handle popover close - remove the drawing if feedback not submitted
  const handlePopoverClose = () => {
    if (currentDrawing) {
      onDrawingsChange?.(drawings.filter((d) => d.id !== currentDrawing.id));
      redrawCanvas();
    }
    setShowPopover(false);
    setCurrentDrawing(null);
  };

  // Handle marker click to show chat popover
  const handleMarkerClickForChat = (e: React.MouseEvent, marker: FeedbackMarker) => {
    e.stopPropagation();
    setSelectedMarker(marker);
    setChatPopoverPosition({ x: e.clientX, y: e.clientY });
    setShowChatPopover(true);
    setReplyText("");

    // Also notify parent if needed
    if (onMarkerClick) {
      onMarkerClick(marker.id);
    }
  };

  // Handle chat popover close
  const handleChatPopoverClose = () => {
    setShowChatPopover(false);
    setSelectedMarker(null);
    setReplyText("");
  };

  // Handle reply submission
  const handleSubmitReply = () => {
    if (!replyText.trim() || !selectedMarker) return;

    const newReply: ReplyItem = {
      id: `reply-${Date.now()}`,
      user: {
        name: "You",
        avatar: "",
        color: "#3b82f6",
      },
      content: replyText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    if (onAddReply) {
      onAddReply(selectedMarker.id, newReply);
    }

    setReplyText("");
  };

  // Handle toggle resolved
  const handleToggleResolved = () => {
    if (!selectedMarker) return;
    if (onToggleResolved) {
      onToggleResolved(selectedMarker.id);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return "Just now";
    return timestamp;
  };

  const isInteractiveTool = selectedTool === "comment" || selectedTool === "draw" || selectedTool === "shape";
  const isDrawingTool = selectedTool === "draw" || selectedTool === "shape";

  // Tool-specific hints
  const getToolHint = () => {
    switch (selectedTool) {
      case "draw":
        return "Click and drag to draw on the image";
      case "shape":
        return "Click and drag to draw a rectangle";
      case "comment":
        return "Click on the image to add a comment";
      default:
        return "Click on the image to add feedback";
    }
  };

  return (
    <div
      ref={canvasRef}
      className={cn(
        "h-full w-full relative overflow-hidden canvas-pattern",
        // Light mode: subtle gray
        "bg-[#f5f5f5]",
        // Dark mode: dark background
        "dark:bg-[#0d0d0d]",
        isPanning ? "cursor-grabbing" :
        isSpacePressed ? "cursor-grab" :
        selectedTool === "draw" ? "cursor-crosshair" :
        selectedTool === "shape" ? "cursor-crosshair" :
        isInteractiveTool ? "cursor-crosshair" :
        "cursor-default"
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Canvas Content - Compare Mode or Single Image */}
      {compareMode ? (
        /* Compare Mode - Side by Side View */
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{
            paddingLeft: "60px",
            paddingRight: "20px",
            transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
          }}
        >
          <div className="flex items-center gap-6 pointer-events-auto">
            {/* Current Iteration */}
            <div className="relative">
              <div className="absolute -top-10 left-0 right-0 flex justify-center">
                <div className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-full shadow-lg">
                  Current • v{currentIteration}
                </div>
              </div>
              <div
                className="relative shadow-2xl rounded-lg overflow-hidden bg-white dark:bg-[#2a2a2a]"
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transformOrigin: "center center",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Current Iteration"
                  className="max-w-none select-none w-[280px] lg:w-[340px] xl:w-[400px] h-auto"
                  draggable={false}
                />
              </div>
            </div>

            {/* VS Divider */}
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">VS</span>
              </div>
              <div className="h-32 w-0.5 bg-purple-600/30" />
            </div>

            {/* Compare Iteration */}
            <div className="relative">
              {/* Compare Dropdown */}
              <div className="absolute -top-10 left-0 right-0 flex justify-center">
                <div className="relative">
                  <button
                    onClick={() => setShowCompareDropdown(!showCompareDropdown)}
                    className="px-4 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-full shadow-lg flex items-center gap-2 hover:bg-purple-700 transition-colors"
                  >
                    Compare • v{compareIterations.find(i => i.id === selectedCompareId)?.version || "?"}
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {/* Dropdown Menu */}
                  {showCompareDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowCompareDropdown(false)}
                      />
                      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white dark:bg-[#2a2a2a] rounded-lg shadow-xl border border-gray-200 dark:border-[#444] overflow-hidden z-50 min-w-[200px]">
                        {compareIterations.map((iteration) => (
                          <button
                            key={iteration.id}
                            onClick={() => {
                              onCompareIterationChange?.(iteration.id);
                              setShowCompareDropdown(false);
                            }}
                            className={cn(
                              "w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-[#333] transition-colors flex items-center justify-between",
                              selectedCompareId === iteration.id && "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"
                            )}
                          >
                            <span className="font-medium">{iteration.name}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {iteration.timestamp}
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div
                className="relative shadow-2xl rounded-lg overflow-hidden bg-white dark:bg-[#2a2a2a]"
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transformOrigin: "center center",
                }}
              >
                {compareImageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={compareImageUrl}
                    alt="Compare Iteration"
                    className="max-w-none select-none w-[280px] lg:w-[340px] xl:w-[400px] h-auto"
                    draggable={false}
                  />
                ) : (
                  <div className="w-[280px] lg:w-[340px] xl:w-[400px] h-[350px] lg:h-[425px] xl:h-[500px] flex items-center justify-center bg-gray-100 dark:bg-[#1a1a1a]">
                    <p className="text-gray-500 dark:text-gray-400">Select an iteration to compare</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Normal Mode - Single Image with Markers */
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none pl-[60px] pr-[324px] lg:pr-[364px] xl:pr-[404px]"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
          }}
        >
          {/* Creative Image with Markers */}
          <div
            ref={imageRef}
            className={cn(
              "relative shadow-2xl rounded-lg overflow-hidden pointer-events-auto",
              isInteractiveTool && "ring-2 ring-blue-400 ring-offset-2"
            )}
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: "center center",
            }}
            onClick={handleImageClick}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Creative Preview"
              className="max-w-none select-none w-[350px] lg:w-[420px] xl:w-[500px] h-auto"
              draggable={false}
            />

            {/* Drawing Canvas Overlay */}
            <canvas
              ref={drawingCanvasRef}
              className={cn(
                "absolute top-0 left-0 w-full h-full",
                isDrawingTool ? "pointer-events-auto" : "pointer-events-none"
              )}
              style={{ cursor: isDrawingTool ? "crosshair" : "default" }}
              onMouseDown={handleDrawingStart}
              onMouseMove={handleDrawingMove}
              onMouseUp={handleDrawingEnd}
              onMouseLeave={() => {
                if (isDrawing) {
                  setIsDrawing(false);
                  setCurrentPath([]);
                  setShapeStart(null);
                }
              }}
            />

            {/* Feedback Markers */}
            {markers.map((marker) => (
              <div
                key={marker.id}
                className={cn(
                  "absolute min-w-[28px] h-7 px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-110 shadow-lg z-10",
                  marker.resolved
                    ? "bg-green-500 text-white"
                    : "bg-red-500 text-white",
                  highlightedMarker === marker.id && "ring-4 ring-yellow-400 ring-offset-2 scale-125 z-50 animate-pulse"
                )}
                style={{
                  left: `${marker.x}%`,
                  top: `${marker.y}%`,
                }}
                title={marker.content}
                onClick={(e) => handleMarkerClickForChat(e, marker)}
              >
                {marker.number}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feedback Popover */}
      {showPopover && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={handlePopoverClose}
          />

          {/* Popover */}
          <div
            className="fixed z-50 bg-white dark:bg-[#2a2a2a] rounded-xl shadow-2xl border border-gray-200 dark:border-[#444] p-4 w-80 animate-in fade-in zoom-in-95 duration-200"
            style={{
              left: Math.min(popoverPosition.x + 10, window.innerWidth - 340),
              top: Math.min(popoverPosition.y + 10, window.innerHeight - 200),
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center",
                  currentDrawing ? "bg-orange-500" : "bg-red-500"
                )}>
                  <span className="text-white text-xs font-bold">{localFeedbackCount + 1}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">
                    {currentDrawing?.type === "draw" ? "Drawing" : currentDrawing?.type === "shape" ? "Shape" : "Comment"} {currentIteration}.{localFeedbackCount + 1}
                  </p>
                  <p className="text-xs text-gray-400">Adding to Iteration {currentIteration}</p>
                </div>
              </div>
              <button
                onClick={handlePopoverClose}
                className="p-1 hover:bg-gray-100 dark:hover:bg-[#333] rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="flex items-start gap-2">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-blue-500 text-white text-xs font-medium">
                  Y
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <textarea
                  placeholder="Add your feedback..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitFeedback();
                    }
                  }}
                  className="w-full min-h-[80px] p-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-[#333] border border-gray-200 dark:border-[#555] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 dark:focus:border-blue-500 transition-all placeholder:text-gray-400"
                  autoFocus
                />
                <div className="flex justify-end mt-2">
                  <Button
                    size="sm"
                    onClick={handleSubmitFeedback}
                    disabled={!feedbackText.trim()}
                    className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Add Feedback
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Chat Popover - for viewing existing feedback */}
      {showChatPopover && selectedMarker && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={handleChatPopoverClose}
          />

          {/* Chat Popover */}
          <div
            className="fixed z-50 bg-white dark:bg-[#2a2a2a] rounded-xl shadow-2xl border border-gray-200 dark:border-[#444] w-96 max-h-[500px] flex flex-col animate-in fade-in zoom-in-95 duration-200"
            style={{
              left: Math.min(chatPopoverPosition.x + 10, window.innerWidth - 420),
              top: Math.min(chatPopoverPosition.y - 100, window.innerHeight - 520),
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#444]">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "min-w-[32px] h-8 px-2 rounded-full flex items-center justify-center",
                  selectedMarker.resolved ? "bg-green-500" : "bg-red-500"
                )}>
                  <span className="text-white text-xs font-bold">{selectedMarker.number}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">
                    Feedback {selectedMarker.number}
                  </p>
                  <p className="text-xs text-gray-400">
                    {selectedMarker.resolved ? "Resolved" : "Open"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleResolved}
                  className={cn(
                    "h-8 px-2 gap-1.5",
                    selectedMarker.resolved
                      ? "text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#333]"
                  )}
                >
                  {selectedMarker.resolved ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                  {selectedMarker.resolved ? "Resolved" : "Resolve"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleChatPopoverClose}
                  className="h-8 w-8 text-gray-400 hover:bg-gray-100 dark:hover:bg-[#333]"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Main feedback content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Original feedback */}
              <div className="flex items-start gap-3 mb-4">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback
                    className="text-white text-xs font-medium"
                    style={{ backgroundColor: selectedMarker.user?.color || "#ef4444" }}
                  >
                    {selectedMarker.user?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-800 dark:text-white">
                      {selectedMarker.user?.name || "User"}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatTimestamp(selectedMarker.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {selectedMarker.content}
                  </p>
                </div>
              </div>

              {/* Replies */}
              {selectedMarker.replies && selectedMarker.replies.length > 0 && (
                <div className="border-t border-gray-100 dark:border-[#444] pt-4 space-y-4">
                  {selectedMarker.replies.map((reply) => (
                    <div key={reply.id} className="flex items-start gap-3">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback
                          className="text-white text-xs font-medium"
                          style={{ backgroundColor: reply.user.color }}
                        >
                          {reply.user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-800 dark:text-white">
                            {reply.user.name}
                          </span>
                          <span className="text-xs text-gray-400">
                            {reply.timestamp}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {reply.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reply input */}
            <div className="p-4 border-t border-gray-200 dark:border-[#444] bg-gray-50 dark:bg-[#1a1a1a] rounded-b-xl">
              <div className="flex items-start gap-2">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-blue-500 text-white text-xs font-medium">
                    Y
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <textarea
                    placeholder="Reply to this feedback..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitReply();
                      }
                    }}
                    className="w-full min-h-[60px] p-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-[#333] border border-gray-200 dark:border-[#555] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 dark:focus:border-blue-500 transition-all placeholder:text-gray-400"
                  />
                  <div className="flex justify-end mt-2">
                    <Button
                      size="sm"
                      onClick={handleSubmitReply}
                      disabled={!replyText.trim()}
                      className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Reply
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tool hint */}
      {isInteractiveTool && !showPopover && !showChatPopover && !compareMode && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-full shadow-lg pointer-events-none">
          {getToolHint()}
        </div>
      )}

      {/* Compare Mode hint */}
      {compareMode && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white text-sm px-4 py-2 rounded-full shadow-lg pointer-events-none flex items-center gap-2">
          <span>Compare Mode Active</span>
          <span className="text-purple-200">•</span>
          <span className="text-purple-200">Press R to rotate • K to exit</span>
        </div>
      )}
    </div>
  );
}
