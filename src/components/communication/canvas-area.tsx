"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Send, X, ChevronDown, Sparkles, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DrawingPath, ShapeType } from "@/lib/fabric";
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
  resolved?: boolean;
  user?: {
    name: string;
    avatar: string;
    color: string;
  };
  timestamp?: string;
  replies?: ReplyItem[];
  drawingId?: string;
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
  onAddReply?: (markerId: string, reply: ReplyItem) => void;
  imageUrl?: string;
  rotation?: number;
  compareMode?: boolean;
  compareImageUrl?: string;
  compareIterations?: CompareIteration[];
  selectedCompareId?: string | null;
  onCompareIterationChange?: (id: string | null) => void;
  drawings?: DrawingPath[];
  onDrawingsChange?: (drawings: DrawingPath[]) => void;
  onZoomChange?: (zoom: number) => void;
  onToolChange?: (tool: string) => void;
  onRotate?: () => void;
  onToggleCompare?: () => void;
  onResetView?: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  drawingColor?: string;
  onColorChange?: (color: string) => void;
  shapeType?: ShapeType;
  onShapeTypeChange?: (shapeType: ShapeType) => void;
  highlightDrawingId?: string | null;
  aiAnalysisActive?: boolean;
  viewMode?: "view" | "comments" | "ai";
  onViewModeChange?: (mode: "view" | "comments" | "ai") => void;
  aiSuggestions?: AISuggestion[];
  onShowAIAnalysisOptions?: () => void;
}

// Helper: build SVG path "d" attribute from pointer points using quadratic smoothing
function pointsToSvgPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y} L ${points[0].x} ${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x} ${points[i].y} ${midX} ${midY}`;
  }
  // Last point
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
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
  shapeType = "rectangle",
  highlightDrawingId,
  aiAnalysisActive = false,
  viewMode = "comments",
  onViewModeChange,
  aiSuggestions = [],
  onShowAIAnalysisOptions,
}: CanvasAreaProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // SVG drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
  const [shapeEnd, setShapeEnd] = useState<{ x: number; y: number } | null>(null);

  // Feedback popover state
  const [showPopover, setShowPopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [markerPosition, setMarkerPosition] = useState({ x: 0, y: 0 });
  const [feedbackText, setFeedbackText] = useState("");

  // Chat popover state
  const [selectedMarker, setSelectedMarker] = useState<FeedbackMarker | null>(null);
  const [showChatPopover, setShowChatPopover] = useState(false);
  const [chatPopoverPosition, setChatPopoverPosition] = useState({ x: 0, y: 0 });
  const [replyText, setReplyText] = useState("");

  // Current drawing for feedback association
  const [currentDrawing, setCurrentDrawing] = useState<DrawingPath | null>(null);
  const [displayedSize, setDisplayedSize] = useState({ width: 0, height: 0 });

  const drawings = externalDrawings;
  const markers = externalMarkers || [];
  const localFeedbackCount = feedbackCount;

  // Compare dropdown state
  const [showCompareDropdown, setShowCompareDropdown] = useState(false);

  // Spacebar pan state
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Track image natural size for SVG viewBox
  useEffect(() => {
    if (!imageRef.current) return;
    const img = imageRef.current.querySelector("img") as HTMLImageElement;
    if (!img) return;

    const syncSize = () => {
      const rect = img.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDisplayedSize({ width: rect.width, height: rect.height });
      }
    };

    if (img.complete && img.naturalWidth > 0) syncSize();
    img.addEventListener("load", syncSize);

    const observer = new ResizeObserver(syncSize);
    observer.observe(img);

    return () => {
      img.removeEventListener("load", syncSize);
      observer.disconnect();
    };
  }, [imageUrl]);

  // Get pointer position relative to SVG overlay
  const getSvgPoint = useCallback((e: React.PointerEvent | React.MouseEvent): { x: number; y: number } | null => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  // Drawing pointer handlers
  const handleSvgPointerDown = useCallback((e: React.PointerEvent) => {
    if (selectedTool !== "draw" && selectedTool !== "shape") return;
    if (e.button !== 0) return;

    const pt = getSvgPoint(e);
    if (!pt) return;

    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);

    setIsDrawing(true);

    if (selectedTool === "draw") {
      setCurrentPoints([pt]);
    } else if (selectedTool === "shape") {
      setShapeStart(pt);
      setShapeEnd(pt);
    }
  }, [selectedTool, getSvgPoint]);

  const handleSvgPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawing) return;

    const pt = getSvgPoint(e);
    if (!pt) return;

    e.preventDefault();

    if (selectedTool === "draw") {
      setCurrentPoints(prev => [...prev, pt]);
    } else if (selectedTool === "shape") {
      setShapeEnd(pt);
    }
  }, [isDrawing, selectedTool, getSvgPoint]);

  const handleSvgPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDrawing) return;

    e.preventDefault();
    setIsDrawing(false);

    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svgRect = svgEl.getBoundingClientRect();
    const svgW = svgRect.width || 1;
    const svgH = svgRect.height || 1;

    if (selectedTool === "draw" && currentPoints.length > 1) {
      const pathD = pointsToSvgPath(currentPoints);
      const id = crypto.randomUUID();

      // Compute bounding box
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of currentPoints) {
        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
      }
      const centerXPct = ((minX + maxX) / 2 / svgW) * 100;
      const centerYPct = ((minY + maxY) / 2 / svgH) * 100;

      const drawing: DrawingPath = {
        id,
        type: "draw",
        pathData: pathD,
        points: currentPoints,
        color: drawingColor,
        strokeWidth: 3,
      };

      // Add to drawings
      const newDrawings = [...drawings, drawing];
      onDrawingsChange?.(newDrawings);

      // Show feedback popover
      const screenX = svgRect.left + (centerXPct / 100) * svgW;
      const screenY = svgRect.top + (centerYPct / 100) * svgH;
      setMarkerPosition({ x: centerXPct, y: centerYPct });
      setPopoverPosition({ x: screenX, y: screenY });
      setCurrentDrawing(drawing);
      setShowPopover(true);
      setFeedbackText("");
    } else if (selectedTool === "shape" && shapeStart && shapeEnd) {
      const dx = Math.abs(shapeEnd.x - shapeStart.x);
      const dy = Math.abs(shapeEnd.y - shapeStart.y);

      if (dx < 5 && dy < 5) {
        // Too small, ignore
        setShapeStart(null);
        setShapeEnd(null);
        setCurrentPoints([]);
        return;
      }

      const id = crypto.randomUUID();
      const x = Math.min(shapeStart.x, shapeEnd.x);
      const y = Math.min(shapeStart.y, shapeEnd.y);
      const w = Math.abs(shapeEnd.x - shapeStart.x);
      const h = Math.abs(shapeEnd.y - shapeStart.y);

      let drawing: DrawingPath;

      if (shapeType === "rectangle") {
        drawing = {
          id, type: "shape", shapeType: "rectangle",
          rect: { x, y, width: w, height: h },
          color: drawingColor, strokeWidth: 3,
        };
      } else if (shapeType === "circle") {
        drawing = {
          id, type: "shape", shapeType: "circle",
          ellipse: { cx: x + w / 2, cy: y + h / 2, rx: w / 2, ry: h / 2 },
          color: drawingColor, strokeWidth: 3,
        };
      } else if (shapeType === "line" || shapeType === "arrow") {
        drawing = {
          id, type: "shape", shapeType,
          line: { x1: shapeStart.x, y1: shapeStart.y, x2: shapeEnd.x, y2: shapeEnd.y },
          color: drawingColor, strokeWidth: 3,
        };
      } else {
        setShapeStart(null);
        setShapeEnd(null);
        return;
      }

      const newDrawings = [...drawings, drawing];
      onDrawingsChange?.(newDrawings);

      // Center position as percentage
      const centerXPct = ((shapeStart.x + shapeEnd.x) / 2 / svgW) * 100;
      const centerYPct = ((shapeStart.y + shapeEnd.y) / 2 / svgH) * 100;
      const screenX = svgRect.left + (centerXPct / 100) * svgW;
      const screenY = svgRect.top + (centerYPct / 100) * svgH;

      setMarkerPosition({ x: centerXPct, y: centerYPct });
      setPopoverPosition({ x: screenX, y: screenY });
      setCurrentDrawing(drawing);
      setShowPopover(true);
      setFeedbackText("");
    }

    setCurrentPoints([]);
    setShapeStart(null);
    setShapeEnd(null);
  }, [isDrawing, selectedTool, currentPoints, shapeStart, shapeEnd, drawings, drawingColor, shapeType, onDrawingsChange]);

  // Render a single DrawingPath as SVG element
  const renderDrawing = useCallback((d: DrawingPath, isHighlighted: boolean) => {
    const stroke = isHighlighted ? "#3b82f6" : d.color;
    const sw = isHighlighted ? d.strokeWidth + 2 : d.strokeWidth;
    const filter = isHighlighted ? "drop-shadow(0 0 6px rgba(59, 130, 246, 0.6))" : undefined;

    if (d.type === "draw") {
      const pathD = d.pathData || (d.points ? pointsToSvgPath(d.points) : "");
      if (!pathD) return null;
      return (
        <path
          key={d.id}
          d={pathD}
          stroke={stroke}
          strokeWidth={sw}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter }}
        />
      );
    }

    if (d.type === "shape") {
      if (d.rect) {
        return (
          <rect
            key={d.id}
            x={d.rect.x}
            y={d.rect.y}
            width={d.rect.width}
            height={d.rect.height}
            stroke={stroke}
            strokeWidth={sw}
            fill="none"
            style={{ filter }}
          />
        );
      }
      if (d.ellipse) {
        return (
          <ellipse
            key={d.id}
            cx={d.ellipse.cx}
            cy={d.ellipse.cy}
            rx={d.ellipse.rx}
            ry={d.ellipse.ry}
            stroke={stroke}
            strokeWidth={sw}
            fill="none"
            style={{ filter }}
          />
        );
      }
      if (d.line) {
        return (
          <g key={d.id}>
            <line
              x1={d.line.x1}
              y1={d.line.y1}
              x2={d.line.x2}
              y2={d.line.y2}
              stroke={stroke}
              strokeWidth={sw}
              style={{ filter }}
            />
            {d.shapeType === "arrow" && (() => {
              const angle = Math.atan2(d.line!.y2 - d.line!.y1, d.line!.x2 - d.line!.x1);
              const arrowLen = 12;
              const x2 = d.line!.x2;
              const y2 = d.line!.y2;
              return (
                <polygon
                  points={`${x2},${y2} ${x2 - arrowLen * Math.cos(angle - 0.4)},${y2 - arrowLen * Math.sin(angle - 0.4)} ${x2 - arrowLen * Math.cos(angle + 0.4)},${y2 - arrowLen * Math.sin(angle + 0.4)}`}
                  fill={stroke}
                  style={{ filter }}
                />
              );
            })()}
          </g>
        );
      }
    }
    return null;
  }, []);

  // Render the current in-progress drawing
  const renderActiveDrawing = useCallback(() => {
    if (!isDrawing) return null;

    if (selectedTool === "draw" && currentPoints.length > 1) {
      const pathD = pointsToSvgPath(currentPoints);
      return (
        <path
          d={pathD}
          stroke={drawingColor}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    }

    if (selectedTool === "shape" && shapeStart && shapeEnd) {
      const x = Math.min(shapeStart.x, shapeEnd.x);
      const y = Math.min(shapeStart.y, shapeEnd.y);
      const w = Math.abs(shapeEnd.x - shapeStart.x);
      const h = Math.abs(shapeEnd.y - shapeStart.y);

      if (shapeType === "rectangle") {
        return <rect x={x} y={y} width={w} height={h} stroke={drawingColor} strokeWidth={3} fill="none" />;
      }
      if (shapeType === "circle") {
        return <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} stroke={drawingColor} strokeWidth={3} fill="none" />;
      }
      if (shapeType === "line" || shapeType === "arrow") {
        return <line x1={shapeStart.x} y1={shapeStart.y} x2={shapeEnd.x} y2={shapeEnd.y} stroke={drawingColor} strokeWidth={3} />;
      }
    }

    return null;
  }, [isDrawing, selectedTool, currentPoints, shapeStart, shapeEnd, drawingColor, shapeType]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (e.code === "Space" && !isSpacePressed) {
        e.preventDefault();
        setIsSpacePressed(true);
      }

      if (!modKey && !e.shiftKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case "v": e.preventDefault(); onToolChange?.("pointer"); break;
          case "d": e.preventDefault(); onToolChange?.("draw"); break;
          case "s": e.preventDefault(); onToolChange?.("shape"); break;
          case "c": e.preventDefault(); onToolChange?.("comment"); break;
          case "k": e.preventDefault(); onToggleCompare?.(); break;
          case "r": e.preventDefault(); onRotate?.(); break;
          case "f": e.preventDefault(); onToggleFullscreen?.(); break;
          case "escape":
            e.preventDefault();
            setShowPopover(false);
            setShowChatPopover(false);
            setShowCompareDropdown(false);
            setCurrentDrawing(null);
            break;
        }
      }

      if (modKey) {
        switch (e.key) {
          case "=": case "+": e.preventDefault(); onZoomChange?.(Math.min(zoom + 5, 200)); break;
          case "-": e.preventDefault(); onZoomChange?.(Math.max(zoom - 5, 10)); break;
          case "0": e.preventDefault(); onZoomChange?.(100); onResetView?.(); setPanOffset({ x: 0, y: 0 }); break;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [zoom, isSpacePressed, onToolChange, onZoomChange, onRotate, onToggleCompare, onResetView, onToggleFullscreen]);

  // Mouse wheel zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      if (modKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -2 : 2;
        onZoomChange?.(Math.min(Math.max(zoom + delta, 10), 200));
      }
    };

    const el = canvasRef.current;
    if (el) el.addEventListener("wheel", handleWheel, { passive: false });
    return () => { if (el) el.removeEventListener("wheel", handleWheel); };
  }, [zoom, onZoomChange]);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && selectedTool === "pointer" && e.altKey) || (e.button === 0 && isSpacePressed)) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPanOffset({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Comment tool click
  const handleImageClick = (e: React.MouseEvent) => {
    if (selectedTool === "comment") {
      e.stopPropagation();
      const el = imageRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const relX = ((e.clientX - rect.left) / rect.width) * 100;
      const relY = ((e.clientY - rect.top) / rect.height) * 100;
      setMarkerPosition({ x: relX, y: relY });
      setPopoverPosition({ x: e.clientX, y: e.clientY });
      setShowPopover(true);
      setFeedbackText("");
      setCurrentDrawing(null);
    }
  };

  // Feedback submission
  const handleSubmitFeedback = () => {
    if (!feedbackText.trim()) return;
    const newNum = localFeedbackCount + 1;
    const feedbackId = `${currentIteration}.${newNum}`;
    onAddFeedback?.({
      id: feedbackId,
      number: feedbackId,
      content: feedbackText.trim(),
      x: markerPosition.x,
      y: markerPosition.y,
      drawing: currentDrawing || undefined,
    });
    setShowPopover(false);
    setFeedbackText("");
    setCurrentDrawing(null);
  };

  // Popover close — remove associated drawing if canceling
  const handlePopoverClose = () => {
    if (currentDrawing?.id) {
      const filtered = drawings.filter(d => d.id !== currentDrawing.id);
      onDrawingsChange?.(filtered);
    }
    setShowPopover(false);
    setCurrentDrawing(null);
  };

  // Marker click → chat popover
  const handleMarkerClickForChat = (e: React.MouseEvent, marker: FeedbackMarker) => {
    e.stopPropagation();
    setSelectedMarker(marker);
    setChatPopoverPosition({ x: e.clientX, y: e.clientY });
    setShowChatPopover(true);
    setReplyText("");
    onMarkerClick?.(marker.id);
  };

  const handleChatPopoverClose = () => {
    setShowChatPopover(false);
    setSelectedMarker(null);
    setReplyText("");
  };

  const handleSubmitReply = () => {
    if (!replyText.trim() || !selectedMarker) return;
    const newReply: ReplyItem = {
      id: `reply-${Date.now()}`,
      user: { name: "You", avatar: "", color: "#3b82f6" },
      content: replyText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    onAddReply?.(selectedMarker.id, newReply);
    setReplyText("");
  };

  const formatTimestamp = (timestamp?: string) => timestamp || "Just now";

  const isInteractiveTool = selectedTool === "comment" || selectedTool === "draw" || selectedTool === "shape";
  const isDrawingTool = selectedTool === "draw" || selectedTool === "shape";

  const getToolHint = () => {
    switch (selectedTool) {
      case "draw": return "Click and drag to draw on the image";
      case "shape": return "Click and drag to draw a shape";
      case "comment": return "Click on the image to add a comment";
      default: return "Click on the image to add feedback";
    }
  };

  return (
    <div
      ref={canvasRef}
      className={cn(
        "h-full w-full relative overflow-hidden canvas-pattern",
        "bg-[#f5f5f5]",
        "dark:bg-[#0d0d0d]",
        isPanning ? "cursor-grabbing" :
        isSpacePressed ? "cursor-grab" :
        isDrawingTool ? "cursor-crosshair" :
        isInteractiveTool ? "cursor-crosshair" :
        "cursor-default"
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >

      {/* Normal Mode - Single Image with SVG overlay */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center pointer-events-none",
          isFullscreen ? "p-4" : "pl-[60px] pr-[324px] lg:pr-[364px] xl:pr-[404px]",
          compareMode && "hidden"
        )}
        style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}
      >
        <div className="flex flex-col items-center gap-4">
          {/* Creative Image with SVG Drawing Overlay */}
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

            {/* SVG Drawing Overlay */}
            <svg
              ref={svgRef}
              className="absolute top-0 left-0 w-full h-full"
              style={{
                pointerEvents: isDrawingTool ? "auto" : "none",
                touchAction: "none",
              }}
              onPointerDown={handleSvgPointerDown}
              onPointerMove={handleSvgPointerMove}
              onPointerUp={handleSvgPointerUp}
            >
              {/* Existing drawings */}
              {drawings.map(d => renderDrawing(d, d.id === highlightDrawingId))}

              {/* In-progress drawing */}
              {renderActiveDrawing()}
            </svg>

            {/* AI Analysis Scanning Animation */}
            {aiAnalysisActive && (
              <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
                <div className="absolute inset-0 bg-black/40 animate-pulse" />
                <div
                  className="absolute inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_20px_rgba(168,85,247,0.8)]"
                  style={{ animation: "scan 2s ease-in-out infinite" }}
                />
                <div
                  className="absolute inset-x-0 h-24 bg-gradient-to-b from-purple-500/30 via-transparent to-transparent"
                  style={{ animation: "scan 2s ease-in-out infinite" }}
                />
                <div className="absolute top-4 left-4 w-12 h-12 border-t-3 border-l-3 border-purple-400 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.5)]" style={{ borderWidth: "3px" }} />
                <div className="absolute top-4 right-4 w-12 h-12 border-t-3 border-r-3 border-purple-400 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.5)]" style={{ borderWidth: "3px" }} />
                <div className="absolute bottom-4 left-4 w-12 h-12 border-b-3 border-l-3 border-purple-400 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.5)]" style={{ borderWidth: "3px" }} />
                <div className="absolute bottom-4 right-4 w-12 h-12 border-b-3 border-r-3 border-purple-400 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.5)]" style={{ borderWidth: "3px" }} />
                <div className="absolute inset-0 opacity-30" style={{
                  backgroundImage: "linear-gradient(rgba(168, 85, 247, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(168, 85, 247, 0.4) 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-xl flex items-center gap-2.5 animate-pulse">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Analyzing Design...
                </div>
              </div>
            )}

            {/* AI Visual Annotations */}
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
                        transform: "translate(-50%, -50%)",
                        animationDelay: `${index * 100}ms`,
                      }}
                    >
                      <div className={cn("w-16 h-12 border-2 border-dashed rounded-md relative", severityColor.split(" ")[0])}>
                        <div className={cn("absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md", severityColor.split(" ")[1])}>
                          {index + 1}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Feedback Markers */}
            {viewMode === "comments" && markers.map((marker) => (
              <div
                key={marker.id}
                className={cn(
                  "absolute min-w-[28px] h-7 px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-110 shadow-lg z-10",
                  "bg-red-500 text-white",
                  highlightedMarker === marker.id && "ring-4 ring-yellow-400 ring-offset-2 scale-125 z-50 animate-pulse"
                )}
                style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                title={marker.content}
                onClick={(e) => handleMarkerClickForChat(e, marker)}
              >
                {marker.number}
              </div>
            ))}
          </div>

          {/* View Mode Toggle */}
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
                      onShowAIAnalysisOptions?.();
                    } else {
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

      {/* Compare Mode */}
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
                  Current &bull; v{currentIteration}
                </div>
              </div>
              <div
                className="relative shadow-2xl rounded-lg overflow-hidden bg-white dark:bg-[#2a2a2a]"
                style={{ transform: `scale(${zoom / 100}) rotate(${rotation}deg)`, transformOrigin: "center center" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Current Iteration" className="max-w-none select-none w-[280px] lg:w-[340px] xl:w-[400px] h-auto" draggable={false} />
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
              <div className="absolute -top-10 left-0 right-0 flex justify-center z-[100]">
                <div className="relative">
                  <button
                    onClick={() => setShowCompareDropdown(!showCompareDropdown)}
                    className="px-4 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-full shadow-lg flex items-center gap-2 hover:bg-purple-700 transition-colors"
                  >
                    Compare &bull; v{compareIterations.find(i => i.id === selectedCompareId)?.version || "?"}
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {showCompareDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowCompareDropdown(false)} />
                      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white dark:bg-[#2a2a2a] rounded-lg shadow-xl border border-gray-200 dark:border-[#444] overflow-hidden z-50 min-w-[200px]">
                        {compareIterations.map((iteration) => (
                          <button
                            key={iteration.id}
                            onClick={() => { onCompareIterationChange?.(iteration.id); setShowCompareDropdown(false); }}
                            className={cn(
                              "w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-[#333] transition-colors flex items-center justify-between",
                              selectedCompareId === iteration.id && "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"
                            )}
                          >
                            <span className="font-medium">{iteration.name}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{iteration.timestamp}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div
                className="relative shadow-2xl rounded-lg overflow-hidden bg-white dark:bg-[#2a2a2a]"
                style={{ transform: `scale(${zoom / 100}) rotate(${rotation}deg)`, transformOrigin: "center center" }}
              >
                {compareImageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={compareImageUrl} alt="Compare Iteration" className="max-w-none select-none w-[280px] lg:w-[340px] xl:w-[400px] h-auto" draggable={false} />
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
          <div className="fixed inset-0 z-40" onClick={handlePopoverClose} />
          <div
            className="fixed z-50 bg-white dark:bg-[#2a2a2a] rounded-xl shadow-2xl border border-gray-200 dark:border-[#444] p-4 w-80 animate-in fade-in zoom-in-95 duration-200"
            style={{
              left: Math.min(popoverPosition.x + 10, window.innerWidth - 340),
              top: Math.min(popoverPosition.y + 10, window.innerHeight - 200),
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={cn("w-7 h-7 rounded-full flex items-center justify-center", currentDrawing ? "bg-orange-500" : "bg-red-500")}>
                  <span className="text-white text-xs font-bold">{localFeedbackCount + 1}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">
                    {currentDrawing?.type === "draw" ? "Drawing" : currentDrawing?.type === "shape" ? "Shape" : "Comment"} {currentIteration}.{localFeedbackCount + 1}
                  </p>
                  <p className="text-xs text-gray-400">Adding to Iteration {currentIteration}</p>
                </div>
              </div>
              <button onClick={handlePopoverClose} className="p-1 hover:bg-gray-100 dark:hover:bg-[#333] rounded-full transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="flex items-start gap-2">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-blue-500 text-white text-xs font-medium">Y</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <textarea
                  placeholder="Add your feedback..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmitFeedback(); } }}
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

      {/* Chat Popover */}
      {showChatPopover && selectedMarker && (
        <>
          <div className="fixed inset-0 z-40" onClick={handleChatPopoverClose} />
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
                <div className="min-w-[32px] h-8 px-2 rounded-full flex items-center justify-center bg-red-500">
                  <span className="text-white text-xs font-bold">{selectedMarker.number}</span>
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white">Feedback {selectedMarker.number}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleChatPopoverClose} className="h-8 w-8 text-gray-400 hover:bg-gray-100 dark:hover:bg-[#333]">
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-start gap-3 mb-4">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-white text-xs font-medium" style={{ backgroundColor: selectedMarker.user?.color || "#ef4444" }}>
                    {selectedMarker.user?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-800 dark:text-white">{selectedMarker.user?.name || "User"}</span>
                    <span className="text-xs text-gray-400">{formatTimestamp(selectedMarker.timestamp)}</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedMarker.content}</p>
                </div>
              </div>

              {selectedMarker.replies && selectedMarker.replies.length > 0 && (
                <div className="border-t border-gray-100 dark:border-[#444] pt-4 space-y-4">
                  {selectedMarker.replies.map((reply) => (
                    <div key={reply.id} className="flex items-start gap-3">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="text-white text-xs font-medium" style={{ backgroundColor: reply.user.color }}>
                          {reply.user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-800 dark:text-white">{reply.user.name}</span>
                          <span className="text-xs text-gray-400">{reply.timestamp}</span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{reply.content}</p>
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
                  <AvatarFallback className="bg-blue-500 text-white text-xs font-medium">Y</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <textarea
                    placeholder="Reply to this feedback..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmitReply(); } }}
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
        <div
          className={cn(
            "absolute bottom-20 transform -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-full shadow-lg pointer-events-none z-30",
            isFullscreen ? "left-1/2" : "left-[calc(50%-(132px))] lg:left-[calc(50%-(152px))] xl:left-[calc(50%-(172px))]"
          )}
        >
          {getToolHint()}
        </div>
      )}

      {/* Compare Mode hint */}
      {compareMode && (
        <div
          className={cn(
            "absolute bottom-20 transform -translate-x-1/2 bg-purple-600 text-white text-sm px-4 py-2 rounded-full shadow-lg pointer-events-none flex items-center gap-2 z-30",
            isFullscreen ? "left-1/2" : "left-[calc(50%-20px)]"
          )}
        >
          <span>Compare Mode Active</span>
          <span className="text-purple-200">&bull;</span>
          <span className="text-purple-200">Press R to rotate &bull; K to exit</span>
        </div>
      )}
    </div>
  );
}
