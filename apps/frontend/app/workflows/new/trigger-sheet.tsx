"use client";
import React, { useState } from "react";

import {
  DEFAULT_MANUAL_TRIGGER_DATA,
  DEFAULT_SCHEDULER_TRIGGER_DATA,
  DEFAULT_WEBHOOK_TRIGGER_DATA,
} from "@/app/default-data/trigger-data";
import useFlow from "@/app/store/flow-store";
import {
  TriggerNode,
  TriggerNodeTypes,
  TriggerSheetElement,
} from "@/app/types/tirggers";

import { Button } from "../../../components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../../../components/ui/sheet";

const triggerNodes: TriggerSheetElement[] = [
  {
    type: TriggerNodeTypes.ManualTrigger,
    title: "Manual trigger",
    label: "Trigger manually",
    description: "Runs a workflow when execute button is cliecked.",
    requireDataFields: false,
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="size-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59"
        />
      </svg>
    ),
  },
  {
    type: TriggerNodeTypes.SchedulerTrigger,
    title: "Schedule trigger",
    label: "On a schedule",
    description: "Runs a workflow every sec, min, hour or day as specified.",
    requireDataFields: true,
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="size-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
      </svg>
    ),
  },
  {
    type: TriggerNodeTypes.Webhook,
    title: "Webhook",
    label: "On a webhook calls",
    description: "Runs a workflow when receiving HTTP response.",
    requireDataFields: true,
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="size-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418"
        />
      </svg>
    ),
  },
];

export default function TriggerSheet({
  setConfigNodeId,
}: {
  setConfigNodeId: (id: string) => void;
}) {
  const { setNodes } = useFlow();

  const [triggerSheetOpen, setTriggerSheetOpen] = useState<boolean>(false);

  function createTriggerNode(
    type: TriggerNodeTypes,
    position = { x: 0, y: 0 }
  ): TriggerNode {
    const base = {
      id: crypto.randomUUID(),
      position,
    };

    switch (type) {
      case TriggerNodeTypes.ManualTrigger:
        return {
          ...base,
          type,
          data: {
            ...DEFAULT_MANUAL_TRIGGER_DATA,
            onEdit: (id: string) => setConfigNodeId(id),
          },
        };

      case TriggerNodeTypes.SchedulerTrigger:
        return {
          ...base,
          type,
          data: {
            ...DEFAULT_SCHEDULER_TRIGGER_DATA,
            onEdit: (id: string) => setConfigNodeId(id),
          },
        };

      case TriggerNodeTypes.Webhook:
        return {
          ...base,
          type,
          data: {
            ...DEFAULT_WEBHOOK_TRIGGER_DATA,
            onEdit: (id: string) => setConfigNodeId(id),
          },
        };
    }
  }

  return (
    <Sheet open={triggerSheetOpen} onOpenChange={setTriggerSheetOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="bg-bg-surface hover:bg-bg-overlay border-border-strong hover:border-border-intense text-text-secondary hover:text-text-primary relative z-30 rounded-sm border-2 border-dashed p-10 transition-colors duration-[150ms]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-10"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full">
        <SheetHeader>
          <SheetTitle>Select trigger node from the list</SheetTitle>
          <SheetDescription>
            Trigger is a step that starts your workflow
          </SheetDescription>
          <div className="flex cursor-pointer flex-col gap-4 pt-6">
            {triggerNodes.map((node) => (
              <div
                onClick={() => {
                  setTriggerSheetOpen(false);
                  const newNode = createTriggerNode(node.type);
                  setNodes((nds) => [...nds, newNode]);
                  if (node.requireDataFields) {
                    setConfigNodeId(newNode.id);
                  }
                }}
                key={node.type}
                className="flex w-full items-start justify-start gap-3"
              >
                <div className="flex w-16 items-start justify-center p-2">
                  {node?.icon}
                </div>
                <div className="flex w-full flex-col gap-0">
                  <div className="text-text-primary">{node.label}</div>
                  <div className="text-text-muted">{node.description}</div>
                </div>
              </div>
            ))}
          </div>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}
