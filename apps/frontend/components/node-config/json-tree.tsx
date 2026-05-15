"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/* ============================================================
   JsonTree — collapsible JSON viewer used by the Input/Output
   data panels of the NodeConfigDialog.
   Mirrors the look of n8n's NDV JSON view but themed in the
   FLOW design system (mono font, neutral surface, forest accent
   for keys).
   ============================================================ */

export type JsonPathSegment = string | number;

type JsonTreeProps = {
  data: unknown;
  rootLabel?: string;
  defaultExpandedDepth?: number;
  className?: string;
  /** Fired when a primitive leaf is clicked, with its dotted/indexed path. */
  onLeafClick?: (path: JsonPathSegment[]) => void;
};

export function JsonTree({
  data,
  rootLabel,
  defaultExpandedDepth = 2,
  className,
  onLeafClick,
}: JsonTreeProps) {
  return (
    <div
      className={cn(
        "text-mono-sm text-text-primary font-mono leading-[18px]",
        className
      )}
    >
      <Node
        nodeKey={rootLabel}
        value={data}
        depth={0}
        defaultExpandedDepth={defaultExpandedDepth}
        path={[]}
        onLeafClick={onLeafClick}
        isLast
      />
    </div>
  );
}

function Node({
  nodeKey,
  value,
  depth,
  defaultExpandedDepth,
  isLast,
  path,
  onLeafClick,
}: {
  nodeKey?: string | number;
  value: unknown;
  depth: number;
  defaultExpandedDepth: number;
  isLast: boolean;
  path: JsonPathSegment[];
  onLeafClick?: (path: JsonPathSegment[]) => void;
}) {
  const isObject =
    value !== null && typeof value === "object" && !Array.isArray(value);
  const isArray = Array.isArray(value);
  const isExpandable = isObject || isArray;

  const [open, setOpen] = useState(depth < defaultExpandedDepth);

  const keyLabel =
    nodeKey === undefined ? null : (
      <span className="text-text-brand">
        {typeof nodeKey === "number" ? nodeKey : `"${nodeKey}"`}
      </span>
    );

  if (!isExpandable) {
    const leafContent = (
      <>
        {keyLabel}
        {keyLabel && <span className="text-text-muted">:</span>}
        <PrimitiveValue value={value} />
      </>
    );
    return (
      <div className="flex items-start gap-1 pl-5">
        {onLeafClick ? (
          <button
            type="button"
            onClick={() => onLeafClick(path)}
            title="Insert as expression"
            className="hover:bg-accent-subtle hover:text-accent-on flex items-center gap-1 rounded-sm px-1 py-0.5 transition-colors"
          >
            {leafContent}
          </button>
        ) : (
          <div className="flex items-center gap-1">{leafContent}</div>
        )}
        {!isLast && <span className="text-text-muted">,</span>}
      </div>
    );
  }

  const entries = isArray
    ? (value as unknown[]).map((v, i) => [i, v] as const)
    : Object.entries(value as Record<string, unknown>);

  const openBracket = isArray ? "[" : "{";
  const closeBracket = isArray ? "]" : "}";

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-bg-overlay group flex w-full items-center gap-1 rounded-sm px-1 py-0.5 text-left transition-colors"
      >
        <span className="text-text-muted group-hover:text-text-secondary [&_svg]:size-3.5">
          {open ? <ChevronDown /> : <ChevronRight />}
        </span>
        {keyLabel}
        {keyLabel && <span className="text-text-muted">:</span>}
        <span className="text-text-muted">{openBracket}</span>
        {!open && (
          <>
            <span className="text-text-muted text-caption italic">
              {entries.length} {isArray ? "items" : "keys"}
            </span>
            <span className="text-text-muted">{closeBracket}</span>
            {!isLast && <span className="text-text-muted">,</span>}
          </>
        )}
      </button>

      {open && (
        <div className="border-border-subtle ml-2 border-l pl-2">
          {entries.map(([k, v], i) => (
            <Node
              key={String(k)}
              nodeKey={k}
              value={v}
              depth={depth + 1}
              defaultExpandedDepth={defaultExpandedDepth}
              path={[...path, k]}
              onLeafClick={onLeafClick}
              isLast={i === entries.length - 1}
            />
          ))}
          <div className="text-text-muted pl-1">
            {closeBracket}
            {!isLast && ","}
          </div>
        </div>
      )}
    </div>
  );
}

function PrimitiveValue({ value }: { value: unknown }) {
  if (value === null) {
    return <span className="text-text-muted">null</span>;
  }
  if (value === undefined) {
    return <span className="text-text-muted">undefined</span>;
  }
  if (typeof value === "string") {
    return <span className="text-success">&quot;{value}&quot;</span>;
  }
  if (typeof value === "number") {
    return <span className="text-info">{value}</span>;
  }
  if (typeof value === "boolean") {
    return <span className="text-warning">{String(value)}</span>;
  }
  return <span>{String(value)}</span>;
}
