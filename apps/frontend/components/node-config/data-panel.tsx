"use client";

import { ReactNode, useMemo, useState } from "react";
import { ChevronRight, Database, Inbox } from "lucide-react";

import { cn } from "@/lib/utils";

import { JsonTree } from "./json-tree";






/* ============================================================
   DataPanel — n8n-style data viewer used as the left "Input"
   panel and the right "Output" panel of the NodeConfigDialog.
   Provides JSON / Schema view tabs and an empty state.
   ============================================================ */

type DataPanelKind = "input" | "output";
type ViewMode = "json" | "schema";

export type DataPanelProps = {
  kind: DataPanelKind;
  label?: string;
  data?: unknown;
  /** Custom empty-state message. Falls back to a sensible default. */
  emptyHint?: ReactNode;
  className?: string;
};

const DEFAULT_LABEL: Record<DataPanelKind, string> = {
  input: "Input",
  output: "Output",
};

const DEFAULT_EMPTY: Record<DataPanelKind, string> = {
  input:
    "No input data yet. Connect this node to a previous step or run the trigger.",
  output: "No output yet. Execute this step to see what it returns.",
};

export function DataPanel({
  kind,
  label,
  data,
  emptyHint,
  className,
}: DataPanelProps) {
  const [view, setView] = useState<ViewMode>("json");

  const hasData =
    data !== undefined &&
    data !== null &&
    !(typeof data === "object" && Object.keys(data as object).length === 0);

  const itemCount = useMemo(() => {
    if (!hasData) {
      return 0;
    }
    if (Array.isArray(data)) {
      return data.length;
    }
    if (typeof data === "object") {
      return Object.keys(data as object).length;
    }
    return 1;
  }, [data, hasData]);

  return (
    <section
      className={cn(
        "bg-bg-surface border-border-default flex h-full min-h-0 flex-col border",
        className
      )}
    >
      {/* Panel header */}
      <header className="border-border-subtle flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-h6 text-text-secondary tracking-wider uppercase">
            {label ?? DEFAULT_LABEL[kind]}
          </span>
          {hasData && (
            <span className="bg-bg-overlay text-text-muted text-mono-sm border-border-subtle rounded-full border px-1.5 py-0.5">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
          )}
        </div>

        {/* View tabs */}
        <div className="flex items-center gap-0">
          <ViewTab
            active={view === "json"}
            onClick={() => setView("json")}
            label="JSON"
          />
          <ViewTab
            active={view === "schema"}
            onClick={() => setView("schema")}
            label="Schema"
          />
        </div>
      </header>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-auto">
        {!hasData ? (
          <EmptyState kind={kind} hint={emptyHint} />
        ) : view === "json" ? (
          <div className="p-3">
            <JsonTree data={data} />
          </div>
        ) : (
          <div className="p-3">
            <SchemaView data={data} />
          </div>
        )}
      </div>
    </section>
  );
}

function ViewTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-h6 px-2 py-1 tracking-wider uppercase transition-colors",
        active
          ? "text-text-brand border-border-brand border-b-2"
          : "text-text-muted hover:text-text-secondary border-b-2 border-transparent"
      )}
    >
      {label}
    </button>
  );
}

function EmptyState({ kind, hint }: { kind: DataPanelKind; hint?: ReactNode }) {
  const Icon = kind === "input" ? Inbox : Database;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <Icon className="text-text-disabled size-8" />
      <p className="text-text-muted text-body-sm max-w-xs">
        {hint ?? DEFAULT_EMPTY[kind]}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SchemaView — flat list of `path : type` rows derived from data    */
/* ------------------------------------------------------------------ */

function SchemaView({ data }: { data: unknown }) {
  const rows = flatten(data);
  return (
    <ul className="text-mono-sm font-mono">
      {rows.map((row) => (
        <li
          key={row.path}
          className="hover:bg-bg-overlay flex items-center gap-2 px-1 py-0.5"
        >
          <ChevronRight className="text-text-muted size-3" />
          <span className="text-text-brand">{row.path}</span>
          <span className="text-text-muted">:</span>
          <span className="text-text-secondary">{row.type}</span>
        </li>
      ))}
    </ul>
  );
}

function flatten(
  value: unknown,
  path = "$",
  out: { path: string; type: string }[] = []
): { path: string; type: string }[] {
  if (value === null) {
    out.push({ path, type: "null" });
    return out;
  }
  if (Array.isArray(value)) {
    out.push({ path, type: `array[${value.length}]` });
    value.slice(0, 10).forEach((v, i) => flatten(v, `${path}[${i}]`, out));
    return out;
  }
  if (typeof value === "object") {
    out.push({ path, type: "object" });
    Object.entries(value as Record<string, unknown>).forEach(([k, v]) =>
      flatten(v, `${path}.${k}`, out)
    );
    return out;
  }
  out.push({ path, type: typeof value });
  return out;
}
