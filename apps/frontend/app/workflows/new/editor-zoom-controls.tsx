"use client";

import { useReactFlow, useViewport } from "@xyflow/react";
import { Lock, Plus, Unlock } from "lucide-react";

import { cn } from "@/lib/utils";

interface EditorZoomControlsProps {
  canvasLocked: boolean;
  onToggleLock: () => void;
}

export default function EditorZoomControls({
  canvasLocked,
  onToggleLock,
}: EditorZoomControlsProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { zoom } = useViewport();
  const zoomPercent = Math.round((zoom || 1) * 100);

  return (
    <div className="border-border-stamp bg-bg-elevated absolute bottom-6 left-6 z-10 inline-flex items-stretch border-[1.5px] shadow-[3px_3px_0_0_var(--hard-shadow-color)]">
      <button
        type="button"
        aria-label="Zoom out"
        onClick={() => zoomOut({ duration: 200 })}
        className="border-border-subtle text-text-secondary hover:bg-bg-canvas hover:text-text-primary inline-grid size-[34px] place-items-center border-r transition-colors duration-[120ms]"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Live zoom percentage */}
      <button
        type="button"
        aria-label="Reset zoom to 100%"
        title="Reset to 100%"
        onClick={() => fitView({ duration: 300, padding: 0.15 })}
        className="border-border-subtle text-text-secondary hover:bg-bg-canvas hover:text-text-primary inline-flex w-12 items-center justify-center border-r font-mono text-[11px] transition-colors duration-[120ms]"
      >
        {zoomPercent}%
      </button>

      <button
        type="button"
        aria-label="Zoom in"
        onClick={() => zoomIn({ duration: 200 })}
        className="border-border-subtle text-text-secondary hover:bg-bg-canvas hover:text-text-primary inline-grid size-[34px] place-items-center border-r transition-colors duration-[120ms]"
      >
        <Plus className="size-3.5" />
      </button>

      <button
        type="button"
        aria-label="Fit view"
        title="Fit all nodes in view"
        onClick={() => fitView({ duration: 400, padding: 0.2 })}
        className="border-border-subtle text-text-secondary hover:bg-bg-canvas hover:text-text-primary inline-grid size-[34px] place-items-center border-r transition-colors duration-[120ms]"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
        >
          <polyline points="4 14 4 20 10 20" />
          <polyline points="20 10 20 4 14 4" />
          <line x1="14" y1="10" x2="21" y2="3" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </svg>
      </button>

      {/* Canvas lock — disables drag/pan/zoom when active */}
      <button
        type="button"
        aria-label={canvasLocked ? "Unlock canvas" : "Lock canvas"}
        aria-pressed={canvasLocked}
        title={
          canvasLocked
            ? "Unlock canvas"
            : "Lock canvas (disable dragging & panning)"
        }
        onClick={onToggleLock}
        className={cn(
          "text-text-secondary hover:bg-bg-canvas hover:text-text-primary inline-grid size-[34px] place-items-center transition-colors duration-[120ms]",
          canvasLocked && "bg-accent-subtle text-text-brand"
        )}
      >
        {canvasLocked ? (
          <Lock className="size-3.5" />
        ) : (
          <Unlock className="size-3.5" />
        )}
      </button>
    </div>
  );
}
