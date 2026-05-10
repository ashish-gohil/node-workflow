import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/* ============================================================
   BASE NODE — FLOW workflow node card
   Spec: bg-bg-elevated, 1px border, 4px radius, shadow-sm
   Status accent: inset 2px left-edge box-shadow
   Ports: 8px circles, top/bottom edge
   ============================================================ */

type NodeStatus = "default" | "running" | "success" | "error" | "disabled";

interface BaseNodeProps extends ComponentProps<"div"> {
  status?: NodeStatus;
  selected?: boolean;
}

export function BaseNode({
  className,
  status = "default",
  selected = false,
  ...props
}: BaseNodeProps) {
  return (
    <div
      className={cn(
        "rounded-node relative max-w-[320px] min-w-[240px] cursor-grab",
        "bg-bg-elevated border-border-default border",
        "shadow-sm transition-all duration-[120ms]",
        // Hover
        "hover:border-border-strong",
        // Selected
        selected &&
          "border-forest-500 border-2 shadow-glow-brand",
        // Running — animated border pulse via outline
        status === "running" && [
          "border-forest-300",
          "animate-[border-pulse_1.4s_ease-in-out_infinite]",
        ],
        // Success — 2px inset left accent
        status === "success" &&
          "shadow-[inset_2px_0_0_0_var(--color-success),var(--ds-shadow-sm)]",
        // Error — inset left accent + glow
        status === "error" &&
          "shadow-[inset_2px_0_0_0_var(--color-error),var(--ds-shadow-glow-error)]",
        // Disabled
        status === "disabled" && "opacity-50",
        className
      )}
      tabIndex={0}
      {...props}
    />
  );
}

/* ---------- Header ---------- */
export function BaseNodeHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-2 px-4 py-3",
        className
      )}
      {...props}
    />
  );
}

/* ---------- Title area ---------- */
export function BaseNodeTitle({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex min-w-0 items-center gap-2", className)}
      {...props}
    />
  );
}

/* ---------- Subtitle / mono descriptor ---------- */
export function BaseNodeSubtitle({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "text-mono-sm text-text-muted mt-0.5 truncate px-4 font-mono",
        className
      )}
      {...props}
    />
  );
}

/* ---------- Divider ---------- */
export function BaseNodeDivider({ className }: { className?: string }) {
  return <div className={cn("border-border-subtle border-t", className)} />;
}

/* ---------- Footer / status row ---------- */
export function BaseNodeFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center gap-2 px-4 py-2.5", className)}
      {...props}
    />
  );
}

/* ---------- Port (connection handle visual) ---------- */

interface PortProps {
  position?: "top" | "bottom" | "left" | "right";
  offset?: string;
  className?: string;
}

export function BaseNodePort({
  position = "bottom",
  offset = "50%",
  className,
}: PortProps) {
  const posStyle: React.CSSProperties = {};

  switch (position) {
    case "top":
      posStyle.top = "-4px";
      posStyle.left = offset;
      break;
    case "bottom":
      posStyle.bottom = "-4px";
      posStyle.left = offset;
      break;
    case "left":
      posStyle.left = "-4px";
      posStyle.top = offset;
      break;
    case "right":
      posStyle.right = "-4px";
      posStyle.top = offset;
      break;
  }

  return (
    <span
      style={posStyle}
      className={cn(
        "absolute size-2 -translate-x-1/2 rounded-full",
        "bg-bg-canvas border-border-strong border-[1.5px]",
        "hover:border-forest-400 transition-colors duration-[120ms]",
        className
      )}
    />
  );
}
