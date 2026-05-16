"use client";

import React, { useMemo, useRef } from "react";
import { Code2, RotateCcw } from "lucide-react";

import { CodeNodeData } from "@/app/types/actions";
import { cn } from "@/lib/utils";

import type { ActionConfigProps } from "./set-node-config";

const DEFAULT_CODE = "return items;";
const TAB_SPACES = "  ";

/* ============================================================
   CODE NODE CONFIG
   ------------------------------------------------------------
   Mac-style editor pane with line numbers, mono code body, and
   a Tab-key handler that inserts two spaces instead of moving
   focus. The pane mirrors the FLOW stamp aesthetic used across
   the rest of the editor.
   ============================================================ */

export function CodeNodeConfig({
  configData,
  setConfigData,
}: ActionConfigProps<CodeNodeData>) {
  const code = configData.config.code ?? "";

  const lines = useMemo(() => code.split("\n"), [code]);
  const lineCount = Math.max(lines.length, 12);

  const commit = (next: string) =>
    setConfigData((prev) => ({
      ...prev,
      config: { ...prev.config, code: next },
    }));

  const gutterRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const syncScroll = () => {
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab") {return;}
    e.preventDefault();
    const target = e.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const next = code.slice(0, start) + TAB_SPACES + code.slice(end);
    commit(next);
    requestAnimationFrame(() => {
      target.selectionStart = target.selectionEnd = start + TAB_SPACES.length;
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header — language label + reset action ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="border-border-stamp bg-bg-elevated text-text-secondary inline-grid size-9 place-items-center border-[1.5px] shadow-[2px_2px_0_0_var(--hard-shadow-color)]">
            <Code2 className="size-4" />
          </span>
          <div className="flex flex-col">
            <span className="text-text-primary text-[13px] font-semibold leading-tight">
              JavaScript code
            </span>
            <span className="text-text-muted mt-0.5 font-mono text-[10px] font-semibold tracking-[0.06em] uppercase">
              transform · sandboxed
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => commit(DEFAULT_CODE)}
          className="btn-stamp hover:btn-stamp-hover active:btn-stamp-active inline-flex h-8 items-center gap-1.5 px-2.5 text-[11px] font-semibold"
        >
          <RotateCcw className="size-3" />
          Reset
        </button>
      </div>

      {/* ── Editor pane ── */}
      <div className="border-border-stamp bg-bg-elevated border-[1.5px] shadow-[3px_3px_0_0_var(--hard-shadow-color)]">
        {/* Mac-style window chrome — matches the editor's visual language. */}
        <div className="border-border-subtle bg-bg-canvas relative flex h-9 items-center border-b px-3">
          <div className="flex items-center gap-1.5">
            <span className="bg-mac-red size-2.5 rounded-full" />
            <span className="bg-mac-yellow size-2.5 rounded-full" />
            <span className="bg-mac-green size-2.5 rounded-full" />
          </div>
          <span className="text-text-muted absolute left-1/2 -translate-x-1/2 font-mono text-[11px] font-semibold">
            transform.js
          </span>
          <span className="text-text-brand bg-accent-primary/10 border-accent-primary/25 ml-auto border px-1.5 py-px font-mono text-[9px] font-bold tracking-[0.08em] uppercase">
            JS
          </span>
        </div>

        {/* Line numbers + textarea — share a fixed line height (20px). */}
        <div className="grid grid-cols-[48px_1fr]">
          <div
            ref={gutterRef}
            aria-hidden
            className="border-border-subtle bg-bg-canvas/30 text-text-muted flex flex-col items-end overflow-hidden border-r px-2 py-3 font-mono text-[12px] leading-[20px] tabular-nums select-none"
          >
            {Array.from({ length: lineCount }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  i < lines.length ? "opacity-100" : "opacity-30"
                )}
              >
                {i + 1}
              </span>
            ))}
          </div>

          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => commit(e.target.value)}
            onKeyDown={handleKey}
            onScroll={syncScroll}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            wrap="off"
            rows={lineCount}
            placeholder={DEFAULT_CODE}
            className={cn(
              "text-text-primary placeholder:text-text-muted bg-transparent",
              "font-mono text-[12px] leading-[20px] tracking-wide",
              "resize-none border-0 px-3 py-3 outline-none",
              "overflow-x-auto whitespace-pre"
            )}
          />
        </div>
      </div>

      {/* ── Footer hint — explains the runtime contract ── */}
      <div className="border-border-subtle bg-bg-elevated/40 flex items-start gap-2.5 border p-3">
        <span
          className="bg-info mt-1.5 size-1.5 shrink-0 rounded-full"
          style={{ boxShadow: "0 0 0 3px rgba(94,177,239,0.18)" }}
        />
        <p className="text-text-secondary text-[12px] leading-[1.5]">
          Input items are available as{" "}
          <code className="text-text-brand bg-accent-primary/10 mx-0.5 inline-block px-1.5 py-px font-mono text-[11px]">
            items
          </code>{" "}
          (array of upstream outputs). Return any value — array, object or
          primitive — to pass downstream. Press{" "}
          <kbd className="border-border-default text-text-muted mx-0.5 inline-flex h-[18px] min-w-[22px] items-center justify-center border px-1 font-mono text-[10px]">
            Tab
          </kbd>{" "}
          to indent two spaces.
        </p>
      </div>
    </div>
  );
}
