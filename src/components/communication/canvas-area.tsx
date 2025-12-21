"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Send, X, CheckCircle2, Circle, ChevronDown, Square, CircleIcon, Minus, ArrowRight, Sparkles, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FabricCanvasManager, DrawingPath, ToolType, ShapeType, CreatedItemInfo } from "@/lib/fabric";
import { AISuggestion } from "./comments-panel";

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
  drawingId?: string; // ID of associated drawing/shape
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
  isFullscreen?: boolean;
  // Drawing customization
  drawingColor?: string;
  onColorChange?: (color: string) => void;
  shapeType?: ShapeType;
  onShapeTypeChange?: (shapeType: ShapeType) => void;
  // External highlight control (from sidebar)
  highlightDrawingId?: string | null;
  // AI Analysis
  aiAnalysisActive?: boolean;
  viewMode?: "view" | "comments" | "ai";
  onViewModeChange?: (mode: "view" | "comments" | "ai") => void;
  aiSuggestions?: AISuggestion[];
  onShowAIAnalysisOptions?: () => void;
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
  isFullscreen = false,
  drawingColor = "#ef4444",
  onColorChange,
  shapeType = "rectangle",
  onShapeTypeChange,
  highlightDrawingId,
  aiAnalysisActive = false,
  viewMode = "comments",
  onViewModeChange,
  aiSuggestions = [],
  onShowAIAnalysisOptions,
}: CanvasAreaProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const fabricCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricManagerRef = useRef<FabricCanvasManager | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Fabric.js state
  const [isCanvasReady, setIsCanvasReady] = useState(false);

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

  // Current drawing for feedback association
  const [currentDrawing, setCurrentDrawing] = useState<DrawingPath | null>(null);
  const [displayedSize, setDisplayedSize] = useState({ width: 0, height: 0 });

  // Flag to prevent infinite loop when drawings change from internal updates
  const isInternalUpdateRef = useRef(false);

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

  // Shape type options for dropdown
  const shapeOptions: { type: ShapeType; icon: React.ReactNode; label: string }[] = [
    { type: "rectangle", icon: <Square className="w-4 h-4" />, label: "Rectangle" },
    { type: "circle", icon: <CircleIcon className="w-4 h-4" />, label: "Circle" },
    { type: "line", icon: <Minus className="w-4 h-4" />, label: "Line" },
    { type: "arrow", icon: <ArrowRight className="w-4 h-4" />, label: "Arrow" },
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

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!fabricCanvasRef.current) return;

    // Get parent dimensions
    const parent = fabricCanvasRef.current.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    // Use default dimensions if parent has no size yet
    const width = rect.width > 0 ? rect.width : 500;
    const height = rect.height > 0 ? rect.height : 645;

    // Create Fabric manager
    const manager = new FabricCanvasManager();

    // Initialize canvas
    manager.initialize(fabricCanvasRef.current, width, height);

    // Style the Fabric.js canvas-container to overlay the image
    const canvasContainer = fabricCanvasRef.current.parentElement;
    if (canvasContainer && canvasContainer.classList.contains('canvas-container')) {
      canvasContainer.style.position = 'absolute';
      canvasContainer.style.top = '0';
      canvasContainer.style.left = '0';
      canvasContainer.style.width = '100%';
      canvasContainer.style.height = '100%';
    }

    // Set callbacks
    manager.setCallbacks({
      onDrawingComplete: (newDrawings) => {
        // Mark as internal update to prevent infinite loop
        isInternalUpdateRef.current = true;
        onDrawingsChange?.(newDrawings);
        // Reset after a tick to allow the effect to check the flag
        setTimeout(() => {
          isInternalUpdateRef.current = false;
        }, 0);
      },
      onItemCreated: (info: CreatedItemInfo) => {
        // When a drawing or shape is created, show the comment popover
        // Calculate screen position from percentage-based position
        const imageElement = imageRef.current;
        if (!imageElement) return;

        const img = imageElement.querySelector("img");
        if (!img) return;

        const rect = img.getBoundingClientRect();

        // Convert percentage to screen coordinates
        const screenX = rect.left + (info.position.x / 100) * rect.width;
        const screenY = rect.top + (info.position.y / 100) * rect.height;

        // Set marker position (percentage based for storage)
        setMarkerPosition({ x: info.position.x, y: info.position.y });

        // Set popover position (screen coordinates)
        setPopoverPosition({ x: screenX, y: screenY });

        // Store the drawing to associate with the feedback
        setCurrentDrawing(info.drawing);

        // Show the popover
        setShowPopover(true);
        setFeedbackText("");
      },
    });

    // Set initial tool config
    manager.setToolConfig({ color: drawingColor, strokeWidth: 3 });

    fabricManagerRef.current = manager;
    setIsCanvasReady(true);

    // Cleanup only on unmount
    return () => {
      manager.dispose();
      fabricManagerRef.current = null;
      setIsCanvasReady(false);
    };
  }, []); // Empty dependency array - only run on mount/unmount

  // Handle resize - sync canvas size with image size
  useEffect(() => {
    if (!fabricManagerRef.current || !imageRef.current || compareMode) return;

    const img = imageRef.current.querySelector("img") as HTMLImageElement;
    if (!img) return;

    let lastWidth = 0;
    let lastHeight = 0;
    let resizeTimeout: NodeJS.Timeout | null = null;

    const syncSize = () => {
      const rect = img.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        // Only update if size actually changed significantly (prevent infinite loops)
        if (Math.abs(lastWidth - rect.width) > 1 || Math.abs(lastHeight - rect.height) > 1) {
          lastWidth = rect.width;
          lastHeight = rect.height;

          fabricManagerRef.current?.resize(rect.width, rect.height);

          // Ensure canvas-container stays properly positioned
          const canvasContainer = imageRef.current?.querySelector('.canvas-container') as HTMLElement;
          if (canvasContainer) {
            canvasContainer.style.position = 'absolute';
            canvasContainer.style.top = '0';
            canvasContainer.style.left = '0';
          }
        }
      }
    };

    // Sync immediately if image is already loaded
    if (img.complete && img.naturalWidth > 0) {
      syncSize();
    }

    // Also sync on image load
    img.addEventListener('load', syncSize);

    const resizeObserver = new ResizeObserver(() => {
      // Debounce resize updates
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(syncSize, 100);
    });

    resizeObserver.observe(img);

    return () => {
      img.removeEventListener('load', syncSize);
      resizeObserver.disconnect();
      if (resizeTimeout) clearTimeout(resizeTimeout);
    };
  }, [isCanvasReady, compareMode]);

  // NOTE: We don't load the image into Fabric.js canvas anymore
  // The native <img> element handles image display
  // Fabric.js canvas is just a transparent overlay for drawings

  // Load drawings when they change externally (e.g., when switching iterations)
  // Skip if the change came from our own internal updates to prevent infinite loop
  useEffect(() => {
    if (!isCanvasReady || !fabricManagerRef.current || compareMode) return;

    // Skip if this is an internal update (user just drew something)
    if (isInternalUpdateRef.current) return;

    fabricManagerRef.current.loadDrawings(drawings);
  }, [isCanvasReady, drawings, compareMode]);

  // Update tool when it changes
  useEffect(() => {
    if (!isCanvasReady || !fabricManagerRef.current || compareMode) return;

    // Map selectedTool to Fabric tool type
    const toolMap: Record<string, ToolType> = {
      pointer: "pointer",
      draw: "draw",
      shape: "shape",
      comment: "comment",
    };

    const fabricTool = toolMap[selectedTool] || "pointer";
    fabricManagerRef.current.setTool(fabricTool);
  }, [isCanvasReady, selectedTool, compareMode]);

  // Update drawing color when it changes
  useEffect(() => {
    if (!isCanvasReady || !fabricManagerRef.current) return;
    fabricManagerRef.current.setToolConfig({ color: drawingColor });
  }, [isCanvasReady, drawingColor]);

  // Update shape type when it changes
  useEffect(() => {
    if (!isCanvasReady || !fabricManagerRef.current) return;
    fabricManagerRef.current.setShapeType(shapeType);
  }, [isCanvasReady, shapeType]);

  // Highlight drawing when highlightDrawingId changes (from sidebar selection)
  useEffect(() => {
    if (!isCanvasReady || !fabricManagerRef.current) return;

    if (highlightDrawingId) {
      fabricManagerRef.current.highlightDrawing(highlightDrawingId);
    } else {
      fabricManagerRef.current.clearHighlight();
    }
  }, [isCanvasReady, highlightDrawingId]);

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

      // Delete selected objects
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
          e.preventDefault();
          fabricManagerRef.current?.deleteSelected();
        }
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

  // Handle popover close - also removes associated drawing if canceling
  const handlePopoverClose = () => {
    // If there was a drawing/shape associated with this feedback, remove it
    if (currentDrawing?.id) {
      fabricManagerRef.current?.removeDrawingById(currentDrawing.id);
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

    // Highlight associated drawing if any
    if (marker.drawingId) {
      fabricManagerRef.current?.highlightDrawing(marker.drawingId);
    }

    // Also notify parent if needed
    if (onMarkerClick) {
      onMarkerClick(marker.id);
    }
  };

  // Handle chat popover close
  const handleChatPopoverClose = () => {
    // Clear any drawing highlights
    fabricManagerRef.current?.clearHighlight();

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

      {/* Normal Mode - Single Image with Fabric.js Canvas (always rendered, hidden in compare mode) */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center pointer-events-none",
          isFullscreen
            ? "p-4"
            : "pl-[60px] pr-[324px] lg:pr-[364px] xl:pr-[404px]",
          compareMode && "hidden"
        )}
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
        }}
      >
        {/* Wrapper for image and toggle */}
        <div className="flex flex-col items-center gap-4">
          {/* Creative Image with Fabric.js Canvas */}
          <div
            ref={imageRef}
            className={cn(
              "relative shadow-2xl rounded-lg overflow-hidden pointer-events-auto",
              isInteractiveTool && !compareMode && viewMode === "comments" && "ring-2 ring-blue-400 ring-offset-2"
            )}
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: "center center",
            }}
            onClick={handleImageClick}
          >
          {/* Background Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Creative Preview"
            className="max-w-none select-none w-[350px] lg:w-[420px] xl:w-[500px] h-auto"
            draggable={false}
          />

          {/* Fabric.js Canvas Overlay */}
          <canvas
            ref={fabricCanvasRef}
            className="absolute top-0 left-0"
          />

          {/* AI Analysis Scanning Animation with Fade Effect */}
          {aiAnalysisActive && (
            <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
              {/* Fading overlay for the graphic */}
              <div className="absolute inset-0 bg-black/40 animate-pulse" />

              {/* Scanning line effect */}
              <div
                className="absolute inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_20px_rgba(168,85,247,0.8)]"
                style={{
                  animation: 'scan 2s ease-in-out infinite',
                }}
              />

              {/* Gradient reveal effect following scan line */}
              <div
                className="absolute inset-x-0 h-24 bg-gradient-to-b from-purple-500/30 via-transparent to-transparent"
                style={{
                  animation: 'scan 2s ease-in-out infinite',
                }}
              />

              {/* Corner brackets with glow */}
              <div className="absolute top-4 left-4 w-12 h-12 border-t-3 border-l-3 border-purple-400 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.5)]" style={{ borderWidth: '3px' }} />
              <div className="absolute top-4 right-4 w-12 h-12 border-t-3 border-r-3 border-purple-400 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.5)]" style={{ borderWidth: '3px' }} />
              <div className="absolute bottom-4 left-4 w-12 h-12 border-b-3 border-l-3 border-purple-400 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.5)]" style={{ borderWidth: '3px' }} />
              <div className="absolute bottom-4 right-4 w-12 h-12 border-b-3 border-r-3 border-purple-400 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.5)]" style={{ borderWidth: '3px' }} />

              {/* Grid overlay */}
              <div className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: 'linear-gradient(rgba(168, 85, 247, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(168, 85, 247, 0.4) 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />

              {/* Analyzing badge */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-xl flex items-center gap-2.5 animate-pulse">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing Design...
              </div>
            </div>
          )}

          {/* AI Visual Annotations - Simple dashed rectangles with numbers */}
          {viewMode === "ai" && !aiAnalysisActive && aiSuggestions.length > 0 && (
            <div className="absolute inset-0 pointer-events-none z-15">
              {aiSuggestions.map((suggestion, index) => {
                const severityColor = suggestion.severity === "error"
                  ? "border-red-500 bg-red-500"
                  : suggestion.severity === "warning"
                    ? "border-amber-500 bg-amber-500"
                    : "border-blue-500 bg-blue-500";

                return (
                  <div
                    key={suggestion.id}
                    className="absolute animate-in fade-in zoom-in duration-300"
                    style={{
                      left: `${suggestion.location?.x || 50}%`,
                      top: `${suggestion.location?.y || 50}%`,
                      transform: 'translate(-50%, -50%)',
                      animationDelay: `${index * 100}ms`,
                    }}
                  >
                    {/* Simple dashed rectangle with number */}
                    <div className={cn(
                      "w-16 h-12 border-2 border-dashed rounded-md relative",
                      severityColor.split(' ')[0]
                    )}>
                      {/* Number badge */}
                      <div className={cn(
                        "absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md",
                        severityColor.split(' ')[1]
                      )}>
                        {index + 1}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Feedback Markers - Only show when NOT in AI mode */}
          {viewMode === "comments" && markers.map((marker) => (
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

          {/* View Mode Toggle - Below the graphic */}
          {!compareMode && !isFullscreen && (
            <div className="pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-300 z-50">
              <div className="bg-white dark:bg-[#2a2a2a] rounded-full shadow-lg border border-gray-200 dark:border-[#444] p-1 flex items-center gap-1">
                <button
                  onClick={() => onViewModeChange?.("comments")}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all",
                    viewMode === "comments"
                      ? "bg-blue-500 text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#333]"
                  )}
                >
                  <MessageSquare className="w-3 h-3" />
                  Comments
                </button>
                <button
                  onClick={() => {
                    if (aiSuggestions.length === 0) {
                      // No analysis yet, show options dialog
                      onShowAIAnalysisOptions?.();
                    } else {
                      // Has analysis, switch to AI view
                      onViewModeChange?.("ai");
                    }
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all",
                    viewMode === "ai"
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#333]"
                  )}
                >
                  <Sparkles className="w-3 h-3" />
                  AI Analyse {aiSuggestions.length > 0 && `(${aiSuggestions.length})`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compare Mode - Side by Side View (only shown when compareMode is true) */}
      {compareMode && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{
            paddingLeft: isFullscreen ? "20px" : "60px",
            paddingRight: "20px",
            transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
          }}
        >
          <div className="flex items-center gap-6 pointer-events-auto">
            {/* Current Iteration */}
            <div className="relative">
              <div className="absolute -top-10 left-0 right-0 flex justify-center z-[100]">
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
              <div className="absolute -top-10 left-0 right-0 flex justify-center z-[100]">
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

      {/* Tool hint - centered relative to design area (accounting for sidebar and comments panel) */}
      {isInteractiveTool && !showPopover && !showChatPopover && !compareMode && (
        <div
          className={cn(
            "absolute bottom-20 transform -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-full shadow-lg pointer-events-none z-30",
            isFullscreen
              ? "left-1/2"
              : "left-[calc(50%-(132px))] lg:left-[calc(50%-(152px))] xl:left-[calc(50%-(172px))]"
          )}
        >
          {getToolHint()}
        </div>
      )}

      {/* Compare Mode hint - centered relative to design area */}
      {compareMode && (
        <div
          className={cn(
            "absolute bottom-20 transform -translate-x-1/2 bg-purple-600 text-white text-sm px-4 py-2 rounded-full shadow-lg pointer-events-none flex items-center gap-2 z-30",
            isFullscreen
              ? "left-1/2"
              : "left-[calc(50%-20px)]"
          )}
        >
          <span>Compare Mode Active</span>
          <span className="text-purple-200">•</span>
          <span className="text-purple-200">Press R to rotate • K to exit</span>
        </div>
      )}
    </div>
  );
}
