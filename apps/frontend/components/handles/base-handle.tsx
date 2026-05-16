import type { ComponentProps } from "react";
import { Handle, type HandleProps } from "@xyflow/react";

import { cn } from "@/lib/utils";

/* ============================================================
   BASE HANDLE — n8n-style edge dot

   Small, flush against the tile edge. Hover scales up and shifts
   the border to the brand accent so users can find the target.
   ============================================================ */

export type BaseHandleProps = HandleProps;

export function BaseHandle({
  className,
  children,
  ...props
}: ComponentProps<typeof Handle>) {
  return (
    <Handle
      {...props}
      className={cn(
        // Override react-flow's defaults — !important needed because
        // react-flow ships its own .react-flow__handle rules.
        "size-2.5! rounded-full!",
        "bg-bg-canvas! border-text-primary! dark:border-border-strong!",
        "border-2!",
        // Invisible larger hit-target — prevents hover flicker on the
        // tiny 10px dot. Pseudo doesn't affect layout or visuals.
        "before:absolute before:content-[''] before:rounded-full before:-inset-2",
        "transition-[border-color,box-shadow] duration-[140ms] ease-out",
        // Subtle stamp shadow so the dot pops off the canvas grid.
        "shadow-[1px_1px_0_0_var(--hard-shadow-color)]",
        // Hover: brand border + soft accent ring (no scale → no flicker).
        "hover:border-accent-primary!",
        "hover:shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent-primary)_18%,transparent),1px_1px_0_0_var(--hard-shadow-color)]",
        className
      )}
    >
      {children}
    </Handle>
  );
}
