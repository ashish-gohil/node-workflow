import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function BaseNode({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative rounded-lg",
        "bg-surface-elevated text-text-primary",
        "border-[3px] border-border",
        "transition-colors",
        "hover:ring-1 hover:ring-border-strong group-hover:ring-1 group-hover:ring-border-strong",
        className
      )}
      tabIndex={0}
      {...props}
    />
  );
}

/* ---------- Header ---------- */
export function BaseNodeHeader({
  className,
  ...props
}: ComponentProps<"header">) {
  return (
    <header
      {...props}
      className={cn("flex items-center gap-2 px-4 py-3", className)}
    />
  );
}

/* ---------- Title ---------- */
export function BaseNodeHeaderTitle({
  className,
  ...props
}: ComponentProps<"h3">) {
  return (
    <h3
      data-slot="base-node-title"
      className={cn("flex-1 font-medium user-select-none", className)}
      {...props}
    />
  );
}

/* ---------- Content ---------- */
export function BaseNodeContent({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="base-node-content"
      className={cn("px-4 pb-3", className)}
      {...props}
    />
  );
}

/* ---------- Footer (optional) ---------- */
export function BaseNodeFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="base-node-footer"
      className={cn(
        "flex items-center justify-center gap-2 border-t border-border px-4 pt-2 pb-3",
        className
      )}
      {...props}
    />
  );
}
