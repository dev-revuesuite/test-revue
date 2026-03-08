import { Canvas, Path, Rect, Ellipse, Line, Object as FabricObject } from "fabric";
import { DrawingPath, ExtendedFabricObject, ShapeType } from "./types";

export class FabricSerializer {
  /**
   * Convert Fabric canvas objects to DrawingPath array format
   */
  static toDrawingPaths(canvas: Canvas): DrawingPath[] {
    const drawings: DrawingPath[] = [];
    const objects = canvas.getObjects();

    objects.forEach((obj) => {
      const extObj = obj as ExtendedFabricObject;

      // Skip background image
      if (extObj.type === "image") return;

      if (extObj.type === "path") {
        // Freehand drawing - store full SVG path string to preserve curves
        const path = obj as Path;
        const rawPath = path.path;

        if (rawPath && Array.isArray(rawPath)) {
          // Build full SVG path string preserving all commands (M, L, Q, C, etc.)
          const pathString = rawPath.map((cmd: (string | number)[]) => cmd.join(" ")).join(" ");

          // Also extract simplified points for backward compatibility
          const points: { x: number; y: number }[] = [];
          rawPath.forEach((cmd: (string | number)[]) => {
            if (cmd[0] === "M" || cmd[0] === "L" || cmd[0] === "Q") {
              if (typeof cmd[1] === "number" && typeof cmd[2] === "number") {
                points.push({ x: cmd[1], y: cmd[2] });
              }
            }
          });

          drawings.push({
            id: extObj.id || crypto.randomUUID(),
            type: "draw",
            pathData: pathString,
            points,
            color: (path.stroke as string) || "#FF5733",
            strokeWidth: path.strokeWidth || 2,
          });
        }
      } else if (extObj.type === "rect") {
        // Rectangle shape
        const rect = obj as Rect;
        drawings.push({
          id: extObj.id || crypto.randomUUID(),
          type: "shape",
          shapeType: "rectangle",
          rect: {
            x: rect.left || 0,
            y: rect.top || 0,
            width: (rect.width || 0) * (rect.scaleX || 1),
            height: (rect.height || 0) * (rect.scaleY || 1),
          },
          color: (rect.stroke as string) || "#FF5733",
          strokeWidth: rect.strokeWidth || 2,
        });
      } else if (extObj.type === "ellipse") {
        // Circle/Ellipse shape
        const ellipse = obj as Ellipse;
        drawings.push({
          id: extObj.id || crypto.randomUUID(),
          type: "shape",
          shapeType: "circle",
          ellipse: {
            cx: (ellipse.left || 0) + (ellipse.rx || 0),
            cy: (ellipse.top || 0) + (ellipse.ry || 0),
            rx: ellipse.rx || 0,
            ry: ellipse.ry || 0,
          },
          color: (ellipse.stroke as string) || "#FF5733",
          strokeWidth: ellipse.strokeWidth || 2,
        });
      } else if (extObj.type === "line") {
        // Line or Arrow
        const line = obj as Line;
        const shapeType: ShapeType = extObj.shapeType || "line";
        drawings.push({
          id: extObj.id || crypto.randomUUID(),
          type: "shape",
          shapeType,
          line: {
            x1: line.x1 || 0,
            y1: line.y1 || 0,
            x2: line.x2 || 0,
            y2: line.y2 || 0,
          },
          color: (line.stroke as string) || "#FF5733",
          strokeWidth: line.strokeWidth || 2,
        });
      }
    });

    return drawings;
  }

  /**
   * Convert DrawingPath array to Fabric objects and add them to canvas
   */
  static async fromDrawingPaths(
    canvas: Canvas,
    drawings: DrawingPath[]
  ): Promise<void> {
    for (const drawing of drawings) {
      if (drawing.type === "draw" && (drawing.pathData || (drawing.points && drawing.points.length > 0))) {
        // Use full pathData if available (preserves curves), fall back to simplified points
        const pathString = drawing.pathData || this.pointsToPathString(drawing.points || []);

        const path = new Path(pathString, {
          stroke: drawing.color,
          strokeWidth: drawing.strokeWidth,
          fill: "transparent",
          strokeLineCap: "round",
          strokeLineJoin: "round",
          selectable: false,
          evented: false,
        }) as ExtendedFabricObject;

        path.id = drawing.id;
        path.pathType = "draw";

        canvas.add(path as FabricObject);
      } else if (drawing.type === "shape") {
        if (drawing.rect) {
          const rect = new Rect({
            left: drawing.rect.x,
            top: drawing.rect.y,
            width: drawing.rect.width,
            height: drawing.rect.height,
            stroke: drawing.color,
            strokeWidth: drawing.strokeWidth,
            fill: "transparent",
            selectable: false,
            evented: false,
          }) as ExtendedFabricObject;

          rect.id = drawing.id;
          rect.pathType = "shape";
          rect.shapeType = "rectangle";

          canvas.add(rect as FabricObject);
        } else if (drawing.ellipse) {
          const ellipse = new Ellipse({
            left: drawing.ellipse.cx - drawing.ellipse.rx,
            top: drawing.ellipse.cy - drawing.ellipse.ry,
            rx: drawing.ellipse.rx,
            ry: drawing.ellipse.ry,
            stroke: drawing.color,
            strokeWidth: drawing.strokeWidth,
            fill: "transparent",
            selectable: false,
            evented: false,
          }) as ExtendedFabricObject;

          ellipse.id = drawing.id;
          ellipse.pathType = "shape";
          ellipse.shapeType = "circle";

          canvas.add(ellipse as FabricObject);
        } else if (drawing.line) {
          const line = new Line(
            [drawing.line.x1, drawing.line.y1, drawing.line.x2, drawing.line.y2],
            {
              stroke: drawing.color,
              strokeWidth: drawing.strokeWidth,
              selectable: false,
              evented: false,
            }
          ) as ExtendedFabricObject;

          line.id = drawing.id;
          line.pathType = "shape";
          line.shapeType = drawing.shapeType || "line";

          canvas.add(line as FabricObject);
        }
      }
    }

    canvas.renderAll();
  }

  /**
   * Convert points array to SVG path string
   */
  private static pointsToPathString(points: { x: number; y: number }[]): string {
    if (points.length === 0) return "";

    let pathString = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
      pathString += ` L ${points[i].x} ${points[i].y}`;
    }

    return pathString;
  }

  /**
   * Export canvas state as JSON string
   */
  static exportJSON(canvas: Canvas): string {
    // @ts-expect-error - Fabric.js toJSON accepts propertiesToInclude array
    return JSON.stringify(canvas.toJSON(["id", "pathType", "shapeType"]));
  }

  /**
   * Import canvas state from JSON string
   */
  static async importJSON(canvas: Canvas, json: string): Promise<void> {
    const parsed = JSON.parse(json);
    await canvas.loadFromJSON(parsed);
    canvas.renderAll();
  }

  /**
   * Clear all drawings (but keep background image)
   */
  static clearDrawings(canvas: Canvas): void {
    const objects = canvas.getObjects();
    const toRemove = objects.filter((obj) => obj.type !== "image");
    toRemove.forEach((obj) => canvas.remove(obj));
    canvas.renderAll();
  }
}
