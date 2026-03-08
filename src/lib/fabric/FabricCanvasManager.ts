import {
  Canvas,
  FabricImage,
  PencilBrush,
  Rect,
  Ellipse,
  Line,
  Object as FabricObject,
  TPointerEventInfo,
  TPointerEvent,
} from "fabric";
import {
  ToolType,
  ShapeType,
  DrawingPath,
  ExtendedFabricObject,
  CanvasEventCallbacks,
  ToolConfig,
} from "./types";
import { FabricSerializer } from "./FabricSerializer";

export class FabricCanvasManager {
  private canvas: Canvas | null = null;
  private currentTool: ToolType = "pointer";
  private currentShapeType: ShapeType = "rectangle";
  private toolConfig: ToolConfig = { color: "#FF5733", strokeWidth: 2 };
  private callbacks: CanvasEventCallbacks = {};
  private isDrawingShape = false;
  private shapeStartPoint: { x: number; y: number } | null = null;
  private currentShape: FabricObject | null = null;
  private backgroundImage: FabricImage | null = null;

  /**
   * Initialize the Fabric canvas
   */
  initialize(
    canvasElement: HTMLCanvasElement,
    width: number,
    height: number
  ): Canvas {
    this.canvas = new Canvas(canvasElement, {
      width,
      height,
      selection: true,
      preserveObjectStacking: true,
      backgroundColor: "transparent",
    });

    this.setupEventListeners();
    this.setTool("pointer");

    return this.canvas;
  }

  /**
   * Setup canvas event listeners
   */
  private setupEventListeners(): void {
    if (!this.canvas) return;

    // Object events
    this.canvas.on("object:added", (e) => {
      if (e.target && e.target.type !== "image") {
        const extObj = e.target as ExtendedFabricObject;
        this.callbacks.onObjectAdded?.(extObj);
        // Only notify for objects that already have an ID
        if (extObj.id) {
          this.notifyDrawingsChange();
        }
      }
    });

    this.canvas.on("object:modified", (e) => {
      if (e.target) {
        this.callbacks.onObjectModified?.(e.target as ExtendedFabricObject);
        this.notifyDrawingsChange();
      }
    });

    this.canvas.on("object:removed", (e) => {
      if (e.target && e.target.type !== "image") {
        this.callbacks.onObjectRemoved?.(e.target as ExtendedFabricObject);
        this.notifyDrawingsChange();
      }
    });

    // Selection events
    this.canvas.on("selection:created", (e) => {
      this.callbacks.onSelectionChanged?.(
        (e.selected || []) as ExtendedFabricObject[]
      );
    });

    this.canvas.on("selection:updated", (e) => {
      this.callbacks.onSelectionChanged?.(
        (e.selected || []) as ExtendedFabricObject[]
      );
    });

    this.canvas.on("selection:cleared", () => {
      this.callbacks.onSelectionChanged?.([]);
    });

    // Path created event (for freehand drawing)
    this.canvas.on("path:created", (e) => {
      if (e.path && this.canvas) {
        const path = e.path as ExtendedFabricObject;
        path.id = crypto.randomUUID();
        path.pathType = "draw";

        // Lock the path
        path.selectable = false;
        path.evented = false;
        path.lockMovementX = true;
        path.lockMovementY = true;
        path.lockRotation = true;
        path.lockScalingX = true;
        path.lockScalingY = true;
        path.hoverCursor = "default";

        // Calculate bounding box and center position
        const boundingRect = path.getBoundingRect();
        const canvasWidth = this.canvas.width || 1;
        const canvasHeight = this.canvas.height || 1;

        const centerX = ((boundingRect.left + boundingRect.width / 2) / canvasWidth) * 100;
        const centerY = ((boundingRect.top + boundingRect.height / 2) / canvasHeight) * 100;

        const drawing = this.pathToDrawingPath(path);

        this.notifyDrawingsChange();

        if (drawing) {
          this.callbacks.onItemCreated?.({
            drawing,
            position: { x: centerX, y: centerY },
            boundingBox: {
              x: (boundingRect.left / canvasWidth) * 100,
              y: (boundingRect.top / canvasHeight) * 100,
              width: (boundingRect.width / canvasWidth) * 100,
              height: (boundingRect.height / canvasHeight) * 100,
            },
          });
        }

        this.canvas.renderAll();
      }
    });

    // Mouse events for shape drawing
    this.canvas.on("mouse:down", (e) => this.handleMouseDown(e));
    this.canvas.on("mouse:move", (e) => this.handleMouseMove(e));
    this.canvas.on("mouse:up", () => this.handleMouseUp());
  }

  /**
   * Handle mouse down for shape drawing
   */
  private handleMouseDown(e: TPointerEventInfo<TPointerEvent>): void {
    if (this.currentTool !== "shape" || !this.canvas) return;

    const pointer = this.canvas.getScenePoint(e.e);
    this.isDrawingShape = true;
    this.shapeStartPoint = { x: pointer.x, y: pointer.y };

    // Create shape based on current shape type
    switch (this.currentShapeType) {
      case "rectangle":
        this.currentShape = new Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          stroke: this.toolConfig.color,
          strokeWidth: this.toolConfig.strokeWidth,
          fill: "transparent",
          selectable: false,
          evented: false,
        });
        break;

      case "circle":
        this.currentShape = new Ellipse({
          left: pointer.x,
          top: pointer.y,
          rx: 0,
          ry: 0,
          stroke: this.toolConfig.color,
          strokeWidth: this.toolConfig.strokeWidth,
          fill: "transparent",
          selectable: false,
          evented: false,
        });
        break;

      case "line":
        this.currentShape = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: this.toolConfig.color,
          strokeWidth: this.toolConfig.strokeWidth,
          selectable: false,
          evented: false,
        });
        break;

      case "arrow":
        // Arrow is a line with arrowhead (we'll draw it as a line for now)
        this.currentShape = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: this.toolConfig.color,
          strokeWidth: this.toolConfig.strokeWidth,
          selectable: false,
          evented: false,
        });
        break;
    }

    if (this.currentShape) {
      this.canvas.add(this.currentShape);
    }
  }

  /**
   * Handle mouse move for shape drawing
   */
  private handleMouseMove(e: TPointerEventInfo<TPointerEvent>): void {
    if (!this.isDrawingShape || !this.shapeStartPoint || !this.currentShape || !this.canvas) return;

    const pointer = this.canvas.getScenePoint(e.e);
    const width = pointer.x - this.shapeStartPoint.x;
    const height = pointer.y - this.shapeStartPoint.y;

    switch (this.currentShapeType) {
      case "rectangle":
        const rect = this.currentShape as Rect;
        if (width < 0) {
          rect.set({ left: pointer.x, width: Math.abs(width) });
        } else {
          rect.set({ width });
        }
        if (height < 0) {
          rect.set({ top: pointer.y, height: Math.abs(height) });
        } else {
          rect.set({ height });
        }
        break;

      case "circle":
        const ellipse = this.currentShape as Ellipse;
        const rx = Math.abs(width) / 2;
        const ry = Math.abs(height) / 2;
        ellipse.set({
          left: Math.min(this.shapeStartPoint.x, pointer.x),
          top: Math.min(this.shapeStartPoint.y, pointer.y),
          rx,
          ry,
        });
        break;

      case "line":
      case "arrow":
        const line = this.currentShape as Line;
        line.set({
          x2: pointer.x,
          y2: pointer.y,
        });
        break;
    }

    this.canvas.renderAll();
  }

  /**
   * Handle mouse up for shape drawing
   */
  private handleMouseUp(): void {
    if (!this.isDrawingShape || !this.currentShape || !this.canvas) return;

    const extShape = this.currentShape as ExtendedFabricObject;
    extShape.id = crypto.randomUUID();
    extShape.pathType = "shape";
    extShape.shapeType = this.currentShapeType;

    // Check if shape has meaningful size
    let isValidSize = false;
    switch (this.currentShapeType) {
      case "rectangle":
        const rect = this.currentShape as Rect;
        isValidSize = (rect.width || 0) >= 5 && (rect.height || 0) >= 5;
        break;
      case "circle":
        const ellipse = this.currentShape as Ellipse;
        isValidSize = (ellipse.rx || 0) >= 5 || (ellipse.ry || 0) >= 5;
        break;
      case "line":
      case "arrow":
        const line = this.currentShape as Line;
        const dx = (line.x2 || 0) - (line.x1 || 0);
        const dy = (line.y2 || 0) - (line.y1 || 0);
        isValidSize = Math.sqrt(dx * dx + dy * dy) >= 10;
        break;
    }

    if (!isValidSize) {
      this.canvas.remove(this.currentShape);
      this.isDrawingShape = false;
      this.shapeStartPoint = null;
      this.currentShape = null;
      this.canvas.renderAll();
      return;
    }

    // Lock the shape
    extShape.selectable = false;
    extShape.evented = false;
    extShape.lockMovementX = true;
    extShape.lockMovementY = true;
    extShape.lockRotation = true;
    extShape.lockScalingX = true;
    extShape.lockScalingY = true;
    extShape.hoverCursor = "default";

    // Calculate bounding box and center position
    const boundingRect = this.currentShape.getBoundingRect();
    const canvasWidth = this.canvas.width || 1;
    const canvasHeight = this.canvas.height || 1;

    const centerX = ((boundingRect.left + boundingRect.width / 2) / canvasWidth) * 100;
    const centerY = ((boundingRect.top + boundingRect.height / 2) / canvasHeight) * 100;

    const drawing = this.shapeToDrawingPath(extShape);

    this.notifyDrawingsChange();

    if (drawing) {
      this.callbacks.onItemCreated?.({
        drawing,
        position: { x: centerX, y: centerY },
        boundingBox: {
          x: (boundingRect.left / canvasWidth) * 100,
          y: (boundingRect.top / canvasHeight) * 100,
          width: (boundingRect.width / canvasWidth) * 100,
          height: (boundingRect.height / canvasHeight) * 100,
        },
      });
    }

    this.isDrawingShape = false;
    this.shapeStartPoint = null;
    this.currentShape = null;
    this.canvas.renderAll();
  }

  /**
   * Notify callbacks about drawings change
   */
  private notifyDrawingsChange(): void {
    if (!this.canvas) return;
    const drawings = FabricSerializer.toDrawingPaths(this.canvas);
    this.callbacks.onDrawingComplete?.(drawings);
  }

  /**
   * Set the current tool
   */
  setTool(tool: ToolType): void {
    if (!this.canvas) return;

    this.currentTool = tool;

    switch (tool) {
      case "pointer":
        this.canvas.isDrawingMode = false;
        this.canvas.selection = true;
        this.canvas.defaultCursor = "default";
        break;

      case "draw":
        this.canvas.isDrawingMode = true;
        this.canvas.selection = false;
        const brush = new PencilBrush(this.canvas);
        brush.color = this.toolConfig.color;
        brush.width = this.toolConfig.strokeWidth;
        this.canvas.freeDrawingBrush = brush;
        break;

      case "shape":
        this.canvas.isDrawingMode = false;
        this.canvas.selection = false;
        this.canvas.defaultCursor = "crosshair";
        break;

      case "comment":
        this.canvas.isDrawingMode = false;
        this.canvas.selection = false;
        this.canvas.defaultCursor = "crosshair";
        break;
    }

    this.canvas.renderAll();
  }

  /**
   * Set the current shape type
   */
  setShapeType(shapeType: ShapeType): void {
    this.currentShapeType = shapeType;
  }

  /**
   * Get current shape type
   */
  getShapeType(): ShapeType {
    return this.currentShapeType;
  }

  /**
   * Set tool configuration (color and stroke width)
   */
  setToolConfig(config: Partial<ToolConfig>): void {
    this.toolConfig = { ...this.toolConfig, ...config };

    if (this.canvas && this.canvas.freeDrawingBrush) {
      this.canvas.freeDrawingBrush.color = this.toolConfig.color;
      this.canvas.freeDrawingBrush.width = this.toolConfig.strokeWidth;
    }
  }

  /**
   * Get current tool config
   */
  getToolConfig(): ToolConfig {
    return { ...this.toolConfig };
  }

  /**
   * Set event callbacks
   */
  setCallbacks(callbacks: CanvasEventCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Load drawings from DrawingPath array
   */
  async loadDrawings(drawings: DrawingPath[]): Promise<void> {
    if (!this.canvas) return;

    // Clear existing drawings (keep background)
    FabricSerializer.clearDrawings(this.canvas);

    // Add new drawings
    await FabricSerializer.fromDrawingPaths(this.canvas, drawings);
  }

  /**
   * Add a single drawing incrementally (for realtime updates)
   */
  async addDrawing(drawing: DrawingPath): Promise<void> {
    if (!this.canvas) return;

    // Check if drawing already exists on canvas
    const objects = this.canvas.getObjects();
    const exists = objects.some((obj) => {
      const extObj = obj as ExtendedFabricObject;
      return extObj.id === drawing.id;
    });

    if (!exists) {
      await FabricSerializer.fromDrawingPaths(this.canvas, [drawing]);
    }
  }

  /**
   * Get IDs of all drawings currently on canvas
   */
  getDrawingIds(): string[] {
    if (!this.canvas) return [];
    const objects = this.canvas.getObjects();
    return objects
      .filter((obj) => obj.type !== "image")
      .map((obj) => (obj as ExtendedFabricObject).id)
      .filter((id): id is string => !!id);
  }

  /**
   * Get current drawings as DrawingPath array
   */
  getDrawings(): DrawingPath[] {
    if (!this.canvas) return [];
    return FabricSerializer.toDrawingPaths(this.canvas);
  }

  /**
   * Delete selected objects
   */
  deleteSelected(): void {
    if (!this.canvas) return;

    const activeObjects = this.canvas.getActiveObjects();
    activeObjects.forEach((obj) => {
      if (obj.type !== "image") {
        this.canvas!.remove(obj);
      }
    });

    this.canvas.discardActiveObject();
    this.canvas.renderAll();
  }

  /**
   * Remove a drawing/shape by its ID
   */
  removeDrawingById(id: string): boolean {
    if (!this.canvas) return false;

    const objects = this.canvas.getObjects();
    const target = objects.find((obj) => {
      const extObj = obj as ExtendedFabricObject;
      return extObj.id === id;
    });

    if (target) {
      this.canvas.remove(target);
      this.notifyDrawingsChange();
      this.canvas.renderAll();
      return true;
    }

    return false;
  }

  /**
   * Highlight a drawing/shape by its ID
   */
  highlightDrawing(id: string): void {
    if (!this.canvas) return;

    // First clear any existing highlights
    this.clearHighlight();

    const objects = this.canvas.getObjects();
    const target = objects.find((obj) => {
      const extObj = obj as ExtendedFabricObject;
      return extObj.id === id;
    });

    if (target) {
      const extTarget = target as ExtendedFabricObject;
      // Store original values for restoration
      extTarget._originalStroke = target.stroke as string;
      extTarget._originalStrokeWidth = target.strokeWidth;
      extTarget._originalShadow = target.shadow;

      // Apply highlight effect - glowing border
      target.set({
        stroke: "#3b82f6", // Blue highlight
        strokeWidth: (target.strokeWidth || 2) + 2,
        shadow: {
          color: "rgba(59, 130, 246, 0.6)",
          blur: 15,
          offsetX: 0,
          offsetY: 0,
        },
      });

      this.canvas.renderAll();
    }
  }

  /**
   * Clear highlight from all drawings
   */
  clearHighlight(): void {
    if (!this.canvas) return;

    const objects = this.canvas.getObjects();
    objects.forEach((obj) => {
      const extObj = obj as ExtendedFabricObject;

      // Restore original values if they were saved
      if (extObj._originalStroke !== undefined) {
        obj.set({
          stroke: extObj._originalStroke,
          strokeWidth: extObj._originalStrokeWidth,
          shadow: extObj._originalShadow,
        });
        delete extObj._originalStroke;
        delete extObj._originalStrokeWidth;
        delete extObj._originalShadow;
      }
    });

    this.canvas.renderAll();
  }

  /**
   * Clear all drawings
   */
  clearAll(): void {
    if (!this.canvas) return;
    FabricSerializer.clearDrawings(this.canvas);
    this.notifyDrawingsChange();
  }

  /**
   * Resize canvas
   */
  resize(width: number, height: number): void {
    if (!this.canvas) return;

    this.canvas.setDimensions({ width, height });

    // Re-center background image
    if (this.backgroundImage) {
      const imgWidth = (this.backgroundImage.width || 1) * (this.backgroundImage.scaleX || 1);
      const imgHeight = (this.backgroundImage.height || 1) * (this.backgroundImage.scaleY || 1);

      this.backgroundImage.set({
        left: (width - imgWidth) / 2,
        top: (height - imgHeight) / 2,
      });
    }

    this.canvas.renderAll();
  }

  /**
   * Get the canvas instance
   */
  getCanvas(): Canvas | null {
    return this.canvas;
  }

  /**
   * Convert a path object to DrawingPath format
   */
  private pathToDrawingPath(path: ExtendedFabricObject): DrawingPath | null {
    if (path.type !== "path") return null;

    const fabricPath = path as unknown as { path: (string | number)[][] };
    const rawPath = fabricPath.path;
    const points: { x: number; y: number }[] = [];
    let pathDataString: string | undefined;

    if (rawPath && Array.isArray(rawPath)) {
      // Build full SVG path string preserving all commands (M, L, Q, C, etc.)
      pathDataString = rawPath.map((cmd: (string | number)[]) => cmd.join(" ")).join(" ");

      // Also extract simplified points for backward compatibility
      rawPath.forEach((cmd: (string | number)[]) => {
        if (cmd[0] === "M" || cmd[0] === "L" || cmd[0] === "Q") {
          if (typeof cmd[1] === "number" && typeof cmd[2] === "number") {
            points.push({ x: cmd[1], y: cmd[2] });
          }
        }
      });
    }

    return {
      id: path.id || crypto.randomUUID(),
      type: "draw",
      pathData: pathDataString,
      points,
      color: (path.stroke as string) || this.toolConfig.color,
      strokeWidth: path.strokeWidth || this.toolConfig.strokeWidth,
    };
  }

  /**
   * Convert a shape object to DrawingPath format
   */
  private shapeToDrawingPath(shape: ExtendedFabricObject): DrawingPath | null {
    const shapeType = shape.shapeType || "rectangle";

    if (shape.type === "rect") {
      const rect = shape as unknown as Rect;
      return {
        id: shape.id || crypto.randomUUID(),
        type: "shape",
        shapeType: "rectangle",
        rect: {
          x: rect.left || 0,
          y: rect.top || 0,
          width: (rect.width || 0) * (rect.scaleX || 1),
          height: (rect.height || 0) * (rect.scaleY || 1),
        },
        color: (rect.stroke as string) || this.toolConfig.color,
        strokeWidth: rect.strokeWidth || this.toolConfig.strokeWidth,
      };
    }

    if (shape.type === "ellipse") {
      const ellipse = shape as unknown as Ellipse;
      return {
        id: shape.id || crypto.randomUUID(),
        type: "shape",
        shapeType: "circle",
        ellipse: {
          cx: (ellipse.left || 0) + (ellipse.rx || 0),
          cy: (ellipse.top || 0) + (ellipse.ry || 0),
          rx: ellipse.rx || 0,
          ry: ellipse.ry || 0,
        },
        color: (ellipse.stroke as string) || this.toolConfig.color,
        strokeWidth: ellipse.strokeWidth || this.toolConfig.strokeWidth,
      };
    }

    if (shape.type === "line") {
      const line = shape as unknown as Line;
      return {
        id: shape.id || crypto.randomUUID(),
        type: "shape",
        shapeType: shapeType as "line" | "arrow",
        line: {
          x1: line.x1 || 0,
          y1: line.y1 || 0,
          x2: line.x2 || 0,
          y2: line.y2 || 0,
        },
        color: (line.stroke as string) || this.toolConfig.color,
        strokeWidth: line.strokeWidth || this.toolConfig.strokeWidth,
      };
    }

    return null;
  }

  /**
   * Dispose canvas and cleanup
   */
  dispose(): void {
    if (this.canvas) {
      try {
        const canvasEl = this.canvas.getElement();
        if (canvasEl && canvasEl.parentNode) {
          this.canvas.dispose();
        }
      } catch (error) {
        console.warn("Canvas disposal warning:", error);
      }
      this.canvas = null;
    }

    this.backgroundImage = null;
    this.currentShape = null;
  }
}
