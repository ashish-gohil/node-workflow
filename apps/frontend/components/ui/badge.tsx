import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/* ============================================================
   BADGE / TAG / STATUS PILL
   ============================================================ */

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-xs font-medium",
  {
    variants: {
      variant: {
        /* Status — filled tinted surface + semantic text */
        success: "h-5 px-1.5 text-caption bg-success-surface text-success",
        error: "h-5 px-1.5 text-caption bg-error-surface text-error",
        warning: "h-5 px-1.5 text-caption bg-warning-surface text-warning",
        running: "h-5 px-1.5 text-caption bg-info-surface text-info",
        queued: "h-5 px-1.5 text-caption bg-bg-inset text-text-muted",
        /* Outline — neutral, for tags, categories */
        outline:
          "h-5 px-1.5 text-caption border border-border-default text-text-secondary",
        /* Solid — forest-tinted, for counts/KPIs */
        solid:
          "h-5 px-1.5 text-caption bg-forest-800 text-forest-200 tabular-nums",
        /* Mono — IDs, versions, hashes */
        mono: "h-5 px-1.5 font-mono text-mono-sm bg-bg-inset border border-border-subtle text-text-secondary",
        /* KBD — keyboard shortcut */
        kbd: "min-w-5 h-5 px-1 font-mono text-mono-sm bg-bg-inset border border-border-default text-text-secondary justify-center",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  }
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  pulse?: boolean;
  onRemove?: () => void;
}

function Badge({
  className,
  variant,
  dot = false,
  pulse = false,
  onRemove,
  children,
  ...props
}: BadgeProps) {
  const showDot =
    dot ||
    variant === "success" ||
    variant === "error" ||
    variant === "warning" ||
    variant === "running" ||
    variant === "queued";

  return (
    <span
      className={cn(
        badgeVariants({ variant }),
        onRemove && "h-6 pr-1",
        className
      )}
      {...props}
    >
      {showDot && (
        <span
          className={cn(
            "size-1 rounded-full",
            variant === "success" && "bg-success",
            variant === "error" && "bg-error",
            variant === "warning" && "bg-warning",
            variant === "running" && "bg-info animate-pulse-status",
            variant === "queued" && "bg-text-muted"
          )}
          aria-hidden="true"
        />
      )}
      {children}
      {onRemove && (
        <button
          aria-label={`Remove ${children}`}
          onClick={onRemove}
          className="inline-flex size-3 items-center justify-center text-current opacity-60 transition-opacity hover:opacity-100"
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}

/* ============================================================
   NOTIFICATION DOT (numeric badge on icons)
   ============================================================ */

interface NotificationBadgeProps {
  count?: number;
  children: React.ReactNode;
  "aria-label"?: string;
}

function NotificationBadge({
  count,
  children,
  "aria-label": ariaLabel,
}: NotificationBadgeProps) {
  return (
    <div className="relative inline-block">
      {children}
      {count !== undefined && count > 0 && (
        <span
          aria-label={ariaLabel ?? `${count} notifications`}
          className="bg-error text-cream-50 absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </div>
  );
}

export { Badge, badgeVariants, NotificationBadge };
