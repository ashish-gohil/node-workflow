"use client";

import { ReactNode, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Database,
  Inbox,
  Pin,
  PinOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { type JsonPathSegment, JsonTree } from "./json-tree";

/* ============================================================
   DataPanel — n8n-style data viewer used as the left "Input"
   panel and the right "Output" panel of the NodeConfigDialog.
   Provides JSON / Schema view tabs and an empty state.

   The output variant also supports "Pin Data" — paste a JSON
   value to be used as this node's output for downstream nodes
   during development. This is what lets users build past an
   unreliable API.
   ============================================================ */

type DataPanelKind = "input" | "output";
type ViewMode = "json" | "schema";
type OutputTab = "output" | "pinned";

export type InputNode = {
  id: string;
  label: string;
  data: unknown;
};

export type PinControls = {
  isPinned: boolean;
  onPin: (value: unknown) => void;
  onUnpin: () => void;
};

export type DataPanelProps = {
  kind: DataPanelKind;
  label?: string;
  data?: unknown;
  /** Multi-node input mode: shows one collapsible section per upstream node. */
  nodes?: InputNode[];
  /**
   * Fired when a leaf in any JSON tree is clicked. The label is the upstream
   * node label (so the dialog can build an expression like `{{Label.output.x}}`).
   */
  onLeafClick?: (nodeLabel: string, path: JsonPathSegment[]) => void;
  /** Custom empty-state message. Falls back to a sensible default. */
  emptyHint?: ReactNode;
  className?: string;
  /** Output-only: pin/unpin controls. When present, a "Pinned" tab appears. */
  pin?: PinControls;
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
  nodes,
  onLeafClick,
  emptyHint,
  className,
  pin,
}: DataPanelProps) {
  const [view, setView] = useState<ViewMode>("json");
  // When the user explicitly clicks a tab we honor it; otherwise we default
  // to "pinned" whenever the node currently has pinned data so the pin is
  // visible the moment the dialog opens.
  const [outputTabOverride, setOutputTabOverride] = useState<OutputTab | null>(
    null
  );
  const outputTab: OutputTab =
    outputTabOverride ?? (pin?.isPinned ? "pinned" : "output");

  const isMulti = Array.isArray(nodes);
  const hasMulti = isMulti && nodes!.some((n) => hasContent(n.data));
  const hasData = !isMulti && hasContent(data);
  const hasContentOverall = isMulti ? hasMulti : hasData;
  const showPinTab = kind === "output" && !!pin;

  const itemCount = useMemo(() => {
    if (isMulti) {return nodes!.length;}
    if (!hasData) {return 0;}
    if (Array.isArray(data)) {return data.length;}
    if (typeof data === "object") {return Object.keys(data as object).length;}
    return 1;
  }, [data, hasData, isMulti, nodes]);

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
          {hasContentOverall && (
            <span className="bg-bg-overlay text-text-muted text-mono-sm border-border-subtle rounded-full border px-1.5 py-0.5">
              {itemCount}{" "}
              {isMulti
                ? itemCount === 1
                  ? "node"
                  : "nodes"
                : itemCount === 1
                  ? "item"
                  : "items"}
            </span>
          )}
          {showPinTab && pin?.isPinned && (
            <span className="text-accent-on bg-accent-subtle border-border-brand text-mono-sm inline-flex items-center gap-1 border px-1.5 py-0.5">
              <Pin className="size-3" />
              pinned
            </span>
          )}
        </div>

        {/* View tabs — JSON / Schema for "output" tab, or pinned / output */}
        {showPinTab ? (
          <div className="flex items-center gap-0">
            <ViewTab
              active={outputTab === "output"}
              onClick={() => setOutputTabOverride("output")}
              label="Output"
            />
            <ViewTab
              active={outputTab === "pinned"}
              onClick={() => setOutputTabOverride("pinned")}
              label="Pinned"
            />
          </div>
        ) : (
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
        )}
      </header>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-auto">
        {showPinTab && outputTab === "pinned" ? (
          <PinDataEditor pin={pin!} />
        ) : !hasContentOverall ? (
          <EmptyState kind={kind} hint={emptyHint} multi={isMulti} nodes={nodes} />
        ) : isMulti ? (
          <div className="flex flex-col">
            {nodes!.map((node) => (
              <UpstreamSection
                key={node.id}
                node={node}
                view={view}
                onLeafClick={onLeafClick}
              />
            ))}
          </div>
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

function hasContent(value: unknown): boolean {
  if (value === undefined || value === null) {return false;}
  if (typeof value === "object" && Object.keys(value as object).length === 0) {
    return false;
  }
  return true;
}

function UpstreamSection({
  node,
  view,
  onLeafClick,
}: {
  node: InputNode;
  view: ViewMode;
  onLeafClick?: (nodeLabel: string, path: JsonPathSegment[]) => void;
}) {
  const [open, setOpen] = useState(true);
  const present = hasContent(node.data);

  return (
    <div className="border-border-subtle border-b last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-bg-overlay flex w-full items-center justify-between px-3 py-2 text-left transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-text-muted [&_svg]:size-3.5">
            {open ? <ChevronDown /> : <ChevronRight />}
          </span>
          <span className="text-body-sm text-text-primary font-medium">
            {node.label}
          </span>
        </div>
        {!present && (
          <span className="text-caption text-text-muted">not run yet</span>
        )}
      </button>
      {open && (
        <div className="p-3 pt-0">
          {present ? (
            view === "json" ? (
              <JsonTree
                data={node.data}
                onLeafClick={
                  onLeafClick ? (path) => onLeafClick(node.label, path) : undefined
                }
              />
            ) : (
              <SchemaView data={node.data} />
            )
          ) : (
            <p className="text-text-muted text-body-sm">
              Run this node to capture its output here.
            </p>
          )}
        </div>
      )}
    </div>
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

function EmptyState({
  kind,
  hint,
  multi,
  nodes,
}: {
  kind: DataPanelKind;
  hint?: ReactNode;
  multi?: boolean;
  nodes?: InputNode[];
}) {
  const Icon = kind === "input" ? Inbox : Database;
  const message =
    multi && nodes && nodes.length > 0
      ? `${nodes.length} upstream ${nodes.length === 1 ? "node" : "nodes"} — run them to capture output here.`
      : (hint ?? DEFAULT_EMPTY[kind]);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <Icon className="text-text-disabled size-8" />
      <p className="text-text-muted text-body-sm max-w-xs">{message}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PinDataEditor — paste JSON, validate, save as pinned output       */
/* ------------------------------------------------------------------ */

function PinDataEditor({ pin }: { pin: PinControls }) {
  // Local draft so the user can iterate on JSON without disturbing
  // the saved pin until they click "Save".
  const [draft, setDraft] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const text = draft.trim();
    if (!text) {
      setError("Paste JSON to pin as this node's output.");
      return;
    }
    try {
      const parsed = JSON.parse(text);
      pin.onPin(parsed);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON");
    }
  };

  const handleClear = () => {
    pin.onUnpin();
    setDraft("");
    setError(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <p className="text-text-muted text-body-sm">
        Paste any JSON value to use as this node&apos;s output while
        you iterate downstream. Pinned data persists across page reloads
        and survives real runs until you unpin it.
      </p>
      <textarea
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          if (error) {setError(null);}
        }}
        spellCheck={false}
        placeholder={'{\n  "userId": 42,\n  "name": "Rahul"\n}'}
        className={cn(
          "bg-bg-inset border-border-default text-text-primary text-mono-sm flex-1 min-h-[180px] resize-none border p-2 font-mono leading-[18px] outline-none",
          "focus:border-border-focus",
          error && "border-error"
        )}
      />
      {error && (
        <p className="text-error text-body-sm" role="alert">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          onClick={handleClear}
          disabled={!pin.isPinned && !draft}
          className="gap-1 [&_svg]:size-3.5"
        >
          <PinOff />
          {pin.isPinned ? "Unpin" : "Clear"}
        </Button>
        <Button onClick={handleSave} className="gap-1 [&_svg]:size-3.5">
          <Pin />
          {pin.isPinned ? "Update pin" : "Pin data"}
        </Button>
      </div>
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
