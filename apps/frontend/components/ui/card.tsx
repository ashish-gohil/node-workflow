import * as React from "react";

import { cn } from "@/lib/utils";

import CornerIcons from "./corners";






/* ============================================================
   CONTENT CARD — generic workhorse: header + body + footer
   ============================================================ */

function Card({
  className,
  children,
  ...props
}: React.ComponentProps<"article">) {
  return (
    <article
      data-slot="card"
      className={cn(
        "card-surface hover:bento-card-hover relative overflow-hidden",
        className
      )}
      {...props}
    >
      <CornerIcons size="md" />
      {children}
    </article>
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"header">) {
  return (
    <header
      data-slot="card-header"
      className={cn(
        "border-border-subtle flex items-start justify-between gap-4 border-b px-6 py-5",
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
      className={cn(
        "text-h3 text-text-primary font-semibold tracking-tight",
        className
      )}
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
        "border-border-subtle flex items-center justify-between border-t px-6 py-4",
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
        "card-surface hover:bento-card-hover p-5",
        accent &&
          "border-l-accent-primary border-l-[3px] pl-[calc(1.25rem-3px)]",
        className
      )}
      {...props}
    >
      <p className="text-h6 text-text-muted tracking-wider uppercase">
        {label}
      </p>
      <div className="mt-3 flex items-baseline gap-3">
        <span className="text-display-lg text-text-primary font-mono font-medium tracking-tighter tabular-nums">
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
      {meta && <p className="text-caption text-text-secondary mt-2">{meta}</p>}
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
        "border-border-subtle flex items-center gap-3 border-b px-5 py-4",
        "hover:bg-accent-subtle/40 cursor-pointer transition-colors",
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
        "bg-bg-surface border-border-subtle rounded-sm border p-6",
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

function EmptyCard({
  icon,
  heading,
  description,
  action,
  className,
  ...props
}: EmptyCardProps) {
  return (
    <div
      data-slot="empty-card"
      className={cn(
        "border-border-default flex flex-col items-center justify-center gap-4 rounded-sm border border-dashed p-8 text-center",
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
        <h4 className="text-h4 text-text-primary font-semibold">{heading}</h4>
        {description && (
          <p className="text-body-sm text-text-secondary max-w-xs">
            {description}
          </p>
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
        "bg-bg-elevated border-border-stamp rounded-none border-2 p-8",
        "shadow-[6px_6px_0_0_var(--hard-shadow-color)]",
        "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_0_var(--hard-shadow-color)]",
        "transition-all duration-[120ms]",
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
