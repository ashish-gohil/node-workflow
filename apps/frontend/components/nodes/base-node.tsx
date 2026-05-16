"use client";

import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

/* ============================================================
   BASE NODE — FLOW workflow node, n8n classic icon-tile style

   Layout per node:

     ┌──────────┐
     │          │   ← 80x80 tile (bounding box / handle anchor)
     │   icon   │
     │          │
     └──────────┘
        label       ← absolute, centered below the tile
        subtitle    ← absolute, mono caption below the label

   - Tile background: bg-bg-elevated, 1.5px stamp border, 3px hard shadow.
   - Label sits OUTSIDE the bounding box (absolute, pointer-events-none)
     so handles attach to the tile edges, not the label width.
   - Status (running/success/error) is baked in — no external indicator
     wrapper is required to render correctly.
   ============================================================ */

type NodeStatus = "default" | "running" | "success" | "error" | "disabled";

interface BaseNodeProps extends ComponentProps<"div"> {
  status?: NodeStatus;
  selected?: boolean;
  /** Name rendered below the tile. */
  label?: string;
  /** Small mono caption rendered below the label. */
  subtitle?: string;
  /** Optional small chip slot rendered top-left of the tile. */
  badge?: ReactNode;
  /** Tone tints the left stamp stripe — purely decorative. */
  tone?: "default" | "trigger" | "action" | "branch" | "ai";
}

const TONE_STRIPE: Record<NonNullable<BaseNodeProps["tone"]>, string> = {
  default: "",
  trigger: "shadow-[inset_3px_0_0_0_var(--color-warning)]",
  action: "shadow-[inset_3px_0_0_0_var(--accent-primary)]",
  branch: "shadow-[inset_3px_0_0_0_var(--color-info)]",
  ai: "shadow-[inset_3px_0_0_0_var(--color-forest-300)]",
};

export function BaseNode({
  className,
  status = "default",
  selected = false,
  label,
  subtitle,
  badge,
  tone = "default",
  children,
  ...props
}: BaseNodeProps) {
  return (
    <div
      tabIndex={0}
      className={cn(
        // Bounding box = tile. Label below is absolute and doesn't affect size.
        "relative size-20 cursor-grab focus:outline-none",
        "rounded-node bg-bg-elevated",
        "border-text-primary dark:border-border-default border-[1.5px]",
        // Refined stamp shadow — softer than landing surfaces so nodes
        // read as precise UI elements rather than poster graphics.
        "shadow-[2px_2px_0_0_var(--hard-shadow-color)]",
        "transition-[transform,box-shadow,border-color] duration-[160ms] ease-out",
        // Hover lift.
        "hover:-translate-x-px hover:-translate-y-px",
        "hover:shadow-[3px_3px_0_0_var(--hard-shadow-color)]",
        "hover:border-border-strong",
        // Decorative tone stripe (only renders if tone provided).
        tone !== "default" && TONE_STRIPE[tone],
        // Selected — muted neutral stamp so it can't be mistaken
        // for the green success/running states.
        selected && [
          "border-text-muted",
          "shadow-[3px_3px_0_0_var(--text-muted)]",
          "hover:shadow-[3px_3px_0_0_var(--text-muted)]",
        ],
        // Status states.
        status === "running" && [
          "border-forest-300",
          "animate-[border-pulse_1.4s_ease-in-out_infinite]",
        ],
        status === "success" &&
          "border-success shadow-[2px_2px_0_0_var(--color-success)]",
        status === "error" &&
          "border-error shadow-[2px_2px_0_0_var(--color-error)]",
        status === "disabled" && "opacity-50 saturate-0",
        // Focus ring for keyboard nav.
        "focus-visible:ring-accent-primary focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas",
        className
      )}
      {...props}
    >
      {children}

      {/* Status corner dot — top-right. */}
      {(status === "running" ||
        status === "success" ||
        status === "error") && (
        <span
          aria-hidden
          className={cn(
            "absolute -top-1.5 -right-1.5 size-2.5 rounded-full",
            "border-bg-canvas border-2",
            status === "running" && "bg-forest-300 animate-pulse",
            status === "success" && "bg-success",
            status === "error" && "bg-error"
          )}
        />
      )}

      {/* Badge slot — top-left chip (e.g. "POST", "1/3"). */}
      {badge && (
        <span className="absolute -top-2 left-1.5 z-10">{badge}</span>
      )}

      {/* Label block — rendered below the tile, outside the bounding box. */}
      {(label || subtitle) && (
        <div
          className={cn(
            "absolute top-full left-1/2 -translate-x-1/2 mt-2",
            "flex w-[164px] flex-col items-center gap-0.5",
            "pointer-events-none select-none"
          )}
        >
          {label && (
            <span className="text-text-primary max-w-full truncate text-center text-[13px] font-semibold leading-tight tracking-[-0.005em]">
              {label}
            </span>
          )}
          {subtitle && (
            <span className="text-text-muted max-w-full truncate text-center font-mono text-[10px] leading-tight tracking-[0.04em] uppercase">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Icon slot ---------- */

/** Centered icon container for the tile. Children should be a lucide icon
 *  (or any element); size is fixed at 32px, stroke 1.5 for a confident
 *  visual weight that reads at canvas zoom. */
export function BaseNodeIcon({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 flex items-center justify-center",
        "text-text-secondary",
        "[&_svg]:size-8 [&_svg]:stroke-[1.5]",
        className
      )}
      {...props}
    />
  );
}

/* ---------- Badge ---------- */

/** Small uppercase mono chip — pairs with the badge slot on BaseNode. */
export function BaseNodeBadge({
  className,
  ...props
}: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "border-text-primary dark:border-border-default bg-bg-canvas text-text-primary",
        "inline-flex items-center border px-1 py-px font-mono text-[9px] font-bold leading-none tracking-[0.08em] uppercase",
        className
      )}
      {...props}
    />
  );
}
