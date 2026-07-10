"use client"

import { cn } from "@/lib/utils"

/** A single brand (Pantone) color on a brief. `label` is a free-text Pantone name. */
export interface BrandColor {
  hex: string
  label: string
}

/** How many brand colors a brief holds (fixed). */
export const BRAND_COLOR_COUNT = 4

/** Coerce free-typed hex text into a valid `#rrggbb` (expands `#rgb`, adds `#`, falls back to black). */
export function toValidHex(value: string): string {
  if (!value) return "#000000"
  let v = value.trim()
  if (!v.startsWith("#")) v = "#" + v
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    v = "#" + v.slice(1).split("").map((ch) => ch + ch).join("")
  }
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : "#000000"
}

/** Default palette seeded into the picker so a swatch is never blank. */
export const DEFAULT_BRAND_COLORS: BrandColor[] = [
  { hex: "#1a1a1a", label: "" },
  { hex: "#5C6ECD", label: "" },
  { hex: "#888888", label: "" },
  { hex: "#ffffff", label: "" },
]

interface BrandColorSwatchProps {
  color: BrandColor
  className?: string
}

/** Read-only display of one brand color: a color chip + its label. */
export function BrandColorSwatch({ color, className }: BrandColorSwatchProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-lg border border-border bg-card",
        className
      )}
    >
      <span
        className="w-6 h-6 rounded-md border border-black/10 shrink-0"
        style={{ backgroundColor: color.hex }}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground truncate">
          {color.label || "Untitled color"}
        </p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
          {color.hex}
        </p>
      </div>
    </div>
  )
}
