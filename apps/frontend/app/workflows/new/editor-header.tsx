"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Copy,
  Download,
  HelpCircle,
  MoreHorizontal,
  Save,
  Settings,
  Share2,
  Trash2,
  Upload,
  XCircle,
  Zap,
} from "lucide-react";

import AppLogo from "@/components/ui/app-logo";
import { cn } from "@/lib/utils";

import EditorMenuItem from "./editor-menu-item";

export type EditorTab = "editor" | "executions";

interface EditorHeaderProps {
  workflowName: string;
  onWorkflowNameChange: (name: string) => void;
  activeTab: EditorTab;
  onActiveTabChange: (tab: EditorTab) => void;
  onSave: () => void;
  canSave: boolean;
}

export default function EditorHeader({
  workflowName,
  onWorkflowNameChange,
  activeTab,
  onActiveTabChange,
  onSave,
  canSave,
}: EditorHeaderProps) {
  const router = useRouter();

  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const saveMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  /* close menus when clicking outside them */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        saveMenuRef.current &&
        !saveMenuRef.current.contains(e.target as Node)
      ) {
        setSaveMenuOpen(false);
      }
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(e.target as Node)
      ) {
        setMoreMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSaveClick() {
    setSaveMenuOpen(false);
    onSave();
  }

  return (
    <header className="border-border-stamp bg-bg-canvas relative z-50 flex h-16 shrink-0 items-stretch border-b-[1.5px]">
      {/* Logo */}
      <div className="flex h-16 w-16 shrink-0 items-center justify-center">
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-label="Go home"
        >
          <AppLogo showWordmark={false} />
        </button>
      </div>

      {/* Workflow name + status */}
      <div className="flex min-w-0 flex-1 items-center gap-3 pr-4">
        <input
          value={workflowName}
          onChange={(e) => onWorkflowNameChange(e.target.value)}
          aria-label="Workflow name"
          className="text-text-primary hover:border-border-subtle hover:bg-bg-elevated focus:border-border-subtle focus:bg-bg-elevated h-7 max-w-60 border border-transparent bg-transparent px-2 text-[13px] font-semibold transition-colors duration-[120ms] outline-none"
        />
      </div>

      {/* ── Center: tabs floating over the header/canvas seam ── */}
      <div className="pointer-events-auto absolute bottom-[-19px] left-1/2 z-51 -translate-x-1/2">
        <div
          role="tablist"
          aria-label="Workflow view"
          className="border-border-stamp bg-bg-elevated inline-flex h-[38px] items-stretch border-[1.5px] shadow-[3px_3px_0_0_var(--hard-shadow-color)]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "editor"}
            onClick={() => onActiveTabChange("editor")}
            className={cn(
              "border-border-stamp inline-flex h-full items-center border-r-[1.5px] px-5 text-[13px] font-semibold transition-colors duration-[120ms]",
              activeTab === "editor"
                ? "bg-accent-primary text-accent-on"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            Editor
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "executions"}
            onClick={() => onActiveTabChange("executions")}
            className={cn(
              "duration-120ms inline-flex h-full items-center gap-2 px-5 text-[13px] font-semibold transition-colors",
              activeTab === "executions"
                ? "bg-accent-primary text-accent-on"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            Executions
            <span className="border-border-default bg-bg-canvas text-text-muted flex h-[18px] min-w-[20px] place-items-center border px-1.5 font-mono text-[11px] font-semibold">
              0
            </span>
          </button>
        </div>
      </div>

      {/* ── Right: save + more ── */}
      <div className="flex shrink-0 items-center gap-2 px-4">
        {/* Save split button */}
        <div ref={saveMenuRef} className="relative">
          <div className="border-border-stamp bg-accent-primary text-accent-on inline-flex h-9 items-stretch border-[1.5px] shadow-[3px_3px_0_0_var(--hard-shadow-color)] transition-[transform,box-shadow] duration-[120ms] hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_0_var(--hard-shadow-color)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none">
            <button
              type="button"
              onClick={handleSaveClick}
              disabled={!canSave}
              className="hover:bg-accent-hover inline-flex items-center gap-2 px-4 text-[13px] font-bold transition-colors duration-[120ms] disabled:opacity-50"
            >
              <Save className="size-3.5" />
              Save workflow
            </button>
            <button
              type="button"
              onClick={() => setSaveMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={saveMenuOpen}
              aria-label="More save options"
              className="duration-120ms hover:bg-accent-hover inline-flex w-8 items-center justify-center border-l border-[rgba(10,14,12,0.35)] transition-colors"
            >
              <ChevronDown className="size-3" />
            </button>
          </div>

          {saveMenuOpen && (
            <div
              role="menu"
              className="border-border-stamp bg-bg-elevated absolute top-[calc(100%+8px)] right-0 z-100 min-w-[280px] border-[1.5px] p-1.5 shadow-[4px_4px_0_0_var(--hard-shadow-color)]"
            >
              <p className="text-text-muted px-2.5 pt-1.5 pb-1 font-mono text-[10px] font-semibold tracking-[0.08em] uppercase">
                Save options
              </p>
              <EditorMenuItem
                icon={Save}
                label="Save draft"
                kbd={["⌘", "S"]}
                onClick={handleSaveClick}
              />
              <EditorMenuItem
                icon={Zap}
                label="Publish & activate"
                kbd={["⇧", "P"]}
                onClick={() => setSaveMenuOpen(false)}
              />
              <EditorMenuItem
                icon={XCircle}
                label="Unpublish"
                kbd={["⌘", "U"]}
                onClick={() => setSaveMenuOpen(false)}
              />
              <div className="bg-border-subtle my-1 h-px" />
              <EditorMenuItem
                icon={Copy}
                label="Duplicate workflow"
                onClick={() => setSaveMenuOpen(false)}
              />
              <EditorMenuItem
                icon={Download}
                label="Export as JSON"
                onClick={() => setSaveMenuOpen(false)}
              />
            </div>
          )}
        </div>

        {/* More ⋯ menu */}
        <div ref={moreMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setMoreMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={moreMenuOpen}
            aria-label="More actions"
            className="btn-stamp hover:btn-stamp-hover active:btn-stamp-active inline-grid size-9 place-items-center"
          >
            <MoreHorizontal className="size-4" />
          </button>

          {moreMenuOpen && (
            <div
              role="menu"
              className="border-border-stamp bg-bg-elevated absolute top-[calc(100%+8px)] right-0 z-[100] min-w-[240px] border-[1.5px] p-1.5 shadow-[4px_4px_0_0_var(--hard-shadow-color)]"
            >
              <EditorMenuItem
                icon={Settings}
                label="Workflow settings"
                onClick={() => setMoreMenuOpen(false)}
              />
              <EditorMenuItem
                icon={Copy}
                label="Duplicate"
                onClick={() => setMoreMenuOpen(false)}
              />
              <EditorMenuItem
                icon={Share2}
                label="Share workflow"
                onClick={() => setMoreMenuOpen(false)}
              />
              <div className="bg-border-subtle my-1 h-px" />
              <EditorMenuItem
                icon={Upload}
                label="Import from file"
                onClick={() => setMoreMenuOpen(false)}
              />
              <EditorMenuItem
                icon={HelpCircle}
                label="Help & shortcuts"
                onClick={() => setMoreMenuOpen(false)}
              />
              <div className="bg-border-subtle my-1 h-px" />
              <EditorMenuItem
                icon={Trash2}
                label="Delete workflow"
                destructive
                onClick={() => setMoreMenuOpen(false)}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
