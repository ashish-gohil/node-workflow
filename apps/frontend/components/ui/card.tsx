import * as React from "react";

import { cn } from "@/lib/utils";

/* ============================================================
   CONTENT CARD — generic workhorse: header + body + footer
   ============================================================ */

function Card({ className, ...props }: React.ComponentProps<"article">) {
  return (
    <article
      data-slot="card"
      className={cn(
        "bg-bg-elevated border border-border-default rounded-sm shadow-sm overflow-hidden",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"header">) {
  return (
    <header
      data-slot="card-header"
      className={cn(
        "flex items-start justify-between gap-4 border-b border-border-subtle px-6 py-5",
        className
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn("text-h3 font-semibold tracking-tight text-text-primary", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-body-sm text-text-secondary mt-1", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("shrink-0", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6 py-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"footer">) {
  return (
    <footer
      data-slot="card-footer"
      className={cn(
        "flex items-center justify-between border-t border-border-subtle px-6 py-4",
        className
      )}
      {...props}
    />
  );
}

/* ============================================================
   STAT CARD — single KPI / metric
   ============================================================ */

interface StatCardProps extends React.ComponentProps<"div"> {
  label: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  meta?: string;
  accent?: boolean;
}

function StatCard({
  label,
  value,
  delta,
  deltaPositive = true,
  meta,
  accent = false,
  className,
  ...props
}: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-bg-elevated border border-border-default rounded-sm p-5 shadow-sm transition-colors hover:border-border-strong",
        accent && "border-l-2 border-l-forest-500 pl-[calc(1.25rem-2px)]",
        className
      )}
      {...props}
    >
      <p className="text-h6 text-text-muted uppercase tracking-wider">{label}</p>
      <div className="mt-3 flex items-baseline gap-3">
        <span className="text-display-lg font-mono font-medium tracking-tighter tabular-nums text-text-primary">
          {value}
        </span>
        {delta && (
          <span
            className={cn(
              "text-body-sm inline-flex items-center gap-1 font-medium",
              deltaPositive ? "text-success" : "text-error"
            )}
          >
            {deltaPositive ? "↗" : "↘"} {delta}
          </span>
        )}
      </div>
      {meta && (
        <p className="text-caption text-text-secondary mt-2">{meta}</p>
      )}
    </div>
  );
}

/* ============================================================
   LIST CARD ROW — each item in a resource list
   ============================================================ */

function ListCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="list-card"
      className={cn(
        "flex items-center gap-3 border-b border-border-subtle px-5 py-4",
        "hover:bg-white/[0.02] transition-colors cursor-pointer",
        className
      )}
      {...props}
    />
  );
}

/* ============================================================
   SETTINGS CARD — inset feel for config/settings pages
   ============================================================ */

function SettingsCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="settings-card"
      className={cn(
        "bg-bg-surface border border-border-subtle rounded-sm p-6",
        className
      )}
      {...props}
    />
  );
}

/* ============================================================
   EMPTY CARD — placeholder with dashed border
   ============================================================ */

interface EmptyCardProps extends React.ComponentProps<"div"> {
  icon?: React.ReactNode;
  heading: string;
  description?: string;
  action?: React.ReactNode;
}

function EmptyCard({ icon, heading, description, action, className, ...props }: EmptyCardProps) {
  return (
    <div
      data-slot="empty-card"
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-sm border border-dashed border-border-default p-8 text-center",
        className
      )}
      {...props}
    >
      {icon && (
        <span className="text-text-muted [&_svg]:size-10 [&_svg]:stroke-[1.5px]">
          {icon}
        </span>
      )}
      <div className="space-y-1">
        <h4 className="text-h4 font-semibold text-text-primary">{heading}</h4>
        {description && (
          <p className="text-body-sm text-text-secondary max-w-xs">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/* ============================================================
   STAMPED CARD — brutalist/marketing only
   ============================================================ */

function StampCard({ className, ...props }: React.ComponentProps<"article">) {
  return (
    <article
      data-slot="stamp-card"
      className={cn(
        "rounded-none border-2 border-black bg-white p-8 shadow-stamp",
        "transition-all duration-[120ms] hover:shadow-stamp-lg hover:-translate-x-0.5 hover:-translate-y-0.5",
        className
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  EmptyCard,
  ListCard,
  SettingsCard,
  StampCard,
  StatCard,
};
