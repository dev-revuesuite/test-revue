import { Object as FabricObject } from "fabric";

// Tool types for the canvas
export type ToolType = "pointer" | "draw" | "shape" | "comment";

// Shape types
export type ShapeType = "rectangle" | "circle" | "line" | "arrow";

// Drawing path type - compatible with existing DrawingPath in communication-canvas.tsx
export interface DrawingPath {
  id: string;
  type: "draw" | "shape";
  shapeType?: ShapeType;
  points?: { x: number; y: number }[];
  rect?: { x: number; y: number; width: number; height: number };
  ellipse?: { cx: number; cy: number; rx: number; ry: number };
  line?: { x1: number; y1: number; x2: number; y2: number };
  color: string;
  strokeWidth: number;
}

// Extended fabric object with custom properties
export interface ExtendedFabricObject extends FabricObject {
  id?: string;
  pathType?: "draw" | "shape";
  shapeType?: ShapeType;
  // Properties for highlight state restoration
  _originalStroke?: string;
  _originalStrokeWidth?: number;
  _originalShadow?: unknown;
}

// Canvas manager options
export interface FabricCanvasManagerOptions {
  container: HTMLElement;
  width: number;
  height: number;
  backgroundColor?: string;
}

// Serializer options
export interface SerializerOptions {
  includeBackground?: boolean;
}

// Created item info for feedback association
export interface CreatedItemInfo {
  drawing: DrawingPath;
  position: { x: number; y: number }; // Center position as percentage of canvas
  boundingBox: { x: number; y: number; width: number; height: number };
}

// Canvas event callbacks
export interface CanvasEventCallbacks {
  onObjectAdded?: (object: ExtendedFabricObject) => void;
  onObjectModified?: (object: ExtendedFabricObject) => void;
  onObjectRemoved?: (object: ExtendedFabricObject) => void;
  onSelectionChanged?: (objects: ExtendedFabricObject[]) => void;
  onDrawingComplete?: (drawings: DrawingPath[]) => void;
  onItemCreated?: (info: CreatedItemInfo) => void; // Called when draw/shape is completed
}

// Tool configuration
export interface ToolConfig {
  color: string;
  strokeWidth: number;
}

// Zoom/pan state
export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
}
