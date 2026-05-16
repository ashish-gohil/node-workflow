"use client";

import { ListOrdered } from "lucide-react";

interface EditorExecutionsPanelProps {
  hasTrigger: boolean;
}

export default function EditorExecutionsPanel({
  hasTrigger,
}: EditorExecutionsPanelProps) {
  return (
    <div className="flex h-full flex-col">
      {/* toolbar */}
      <div className="border-border-subtle flex items-center gap-3 border-b px-6 py-3">
        <span className="text-text-primary text-[13px] font-semibold">
          Execution history
        </span>
        <span className="text-text-muted ml-auto inline-flex items-center gap-1.5 font-mono text-[11px]">
          <span className="bg-text-disabled size-1.5 rounded-full" />
          inactive
        </span>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8">
        <div className="btn-stamp inline-grid size-16 place-items-center">
          <ListOrdered className="text-text-muted size-7" />
        </div>
        <div className="text-center">
          <p className="text-text-primary text-[15px] font-semibold">
            No executions yet
          </p>
          <p className="text-text-muted mt-1 max-w-xs text-[13px]">
            {hasTrigger
              ? "Save and activate this workflow to start seeing execution history here."
              : "Add a trigger node to your workflow, then save and activate it."}
          </p>
        </div>
      </div>
    </div>
  );
}
