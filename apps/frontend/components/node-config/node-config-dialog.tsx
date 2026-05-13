"use client";

import { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { PlayIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import CornerIcons from "@/components/ui/corners";
import {
  Dialog,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { DataPanel, DataPanelProps } from "./data-panel";






/* ============================================================
   NodeConfigDialog — n8n NDV-style three-pane configuration
   dialog. Reusable across every node type:

     Left:   INPUT   (data flowing in from upstream node)
     Middle: PARAMS  (current node's config form, via children)
     Right:  OUTPUT  (last execution result of this node)

   Usage:
     <NodeConfigDialog
       open
       onOpenChange={...}
       title="Schedule trigger"
       inputData={prevNodeOutput}
       outputData={lastRun}
       onSave={save}
       onTestStep={run}
     >
       <SchedulerTriggerConfig configData={...} setConfigData={...} />
     </NodeConfigDialog>


    // generic example
       <NodeConfigDialog
        open={open}
        onOpenChange={setOpen}
        title="HTTP Request"
        subtitle="Make an outbound API call"
        icon={<Globe className="size-5" />}
        inputData={upstreamPayload}      // omit / undefined → empty state
        outputData={lastRunResult}        // ditto
        showInput={false}                 // hide left panel (triggers)
        showOutput={false}                // or right
        onSave={handleSave}
        onTestStep={runStep}              // optional "Test step" button
        testing={isRunning}
      >
        <YourParamsForm ... />            // anything goes here 
      </NodeConfigDialog>
   ============================================================ */

export type NodeConfigDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  /* Header */
  title: string;
  subtitle?: string;
  icon?: ReactNode;

  /* Left / right panel data and overrides */
  inputData?: unknown;
  outputData?: unknown;
  inputPanel?: Partial<Omit<DataPanelProps, "kind">>;
  outputPanel?: Partial<Omit<DataPanelProps, "kind">>;

  /* Hide either side panel for nodes that don't need it (e.g. manual trigger) */
  showInput?: boolean;
  showOutput?: boolean;

  /* Footer actions */
  onSave?: () => void;
  onCancel?: () => void;
  onTestStep?: () => void;
  testing?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  testLabel?: string;

  /* Center column — the parameter form */
  children: ReactNode;

  /* Optional className to override max-width / height */
  contentClassName?: string;
};

export function NodeConfigDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  icon,
  inputData,
  outputData,
  inputPanel,
  outputPanel,
  showInput = true,
  showOutput = true,
  onSave,
  onCancel,
  onTestStep,
  testing,
  saveLabel = "Save",
  cancelLabel = "Cancel",
  testLabel = "Test step",
  children,
  contentClassName,
}: NodeConfigDialogProps) {
  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleSave = () => {
    onSave?.();
    onOpenChange(false);
  };

  // Three-pane: input / params / output. Adapt grid to hidden panels.
  const cols =
    showInput && showOutput
      ? "grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)]"
      : showInput || showOutput
        ? "grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]"
        : "grid-cols-[minmax(0,1fr)]";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
            "h-[88vh] w-[95vw] max-w-[1400px]",
            "text-text-primary flex flex-col outline-none",
            "overlay-surface",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "duration-180ms",
            contentClassName
          )}
        >
          <CornerIcons />

          {/* ---------------- Header ---------------- */}
          <header className="border-border-default flex shrink-0 items-center justify-between gap-4 border-b px-5 py-3">
            <div className="flex min-w-0 items-center gap-3">
              {icon && (
                <div className="bg-bg-overlay border-border-default flex size-9 items-center justify-center border">
                  {icon}
                </div>
              )}
              <div className="flex min-w-0 flex-col">
                <DialogTitle className="text-h4 truncate font-semibold">
                  {title}
                </DialogTitle>
                {subtitle && (
                  <p className="text-text-muted text-body-sm truncate">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <DialogPrimitive.Close
              className="text-text-muted hover:text-text-primary p-1 opacity-70 transition-opacity hover:opacity-100 focus:ring-0 focus:outline-none [&_svg]:size-5"
              aria-label="Close"
            >
              <XIcon />
            </DialogPrimitive.Close>
          </header>

          {/* ---------------- Three-pane body ---------------- */}
          <div className={cn("grid min-h-0 flex-1 gap-3 p-3", cols)}>
            {showInput && (
              <DataPanel kind="input" data={inputData} {...inputPanel} />
            )}

            {/* Center: parameters */}
            <section className="bg-bg-surface border-border-default flex h-full min-h-0 flex-col border">
              <header className="border-border-subtle flex items-center justify-between border-b px-3 py-2">
                <span className="text-h6 text-text-secondary tracking-wider uppercase">
                  Parameters
                </span>
                {onTestStep && (
                  <button
                    type="button"
                    onClick={onTestStep}
                    disabled={testing}
                    className="text-text-brand hover:text-text-primary text-body-sm flex items-center gap-1 disabled:opacity-50 [&_svg]:size-3.5"
                  >
                    <PlayIcon />
                    {testing ? "Running…" : testLabel}
                  </button>
                )}
              </header>

              <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
            </section>

            {showOutput && (
              <DataPanel kind="output" data={outputData} {...outputPanel} />
            )}
          </div>

          {/* ---------------- Footer ---------------- */}
          <footer className="border-border-default flex shrink-0 items-center justify-end gap-3 border-t px-5 py-3">
            <Button variant="ghost" className="w-24" onClick={handleCancel}>
              {cancelLabel}
            </Button>
            <Button className="w-24" onClick={handleSave}>
              {saveLabel}
            </Button>
          </footer>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
