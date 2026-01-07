"use client";

import React, { Dispatch, SetStateAction, useState } from "react";
import { Node } from "@xyflow/react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Globe,
  Wand2,
  Filter,
  Code2,
  Clock,
  GitMerge,
  PlusCircle,
} from "lucide-react";
import {
  DEFAULT_CODE_NODE_DATA,
  DEFAULT_DELAY_NODE_DATA,
  DEFAULT_HTTP_REQUEST_NODE_DATA,
  DEFAULT_IF_NODE_DATA,
  DEFAULT_MERGE_NODE_DATA,
  DEFAULT_SET_NODE_DATA,
} from "@/app/default-data/actions-data";

/* ------------------------------------------------------------------ */
/*  Action Node Types                                                  */
/* ------------------------------------------------------------------ */

export enum ActionNodeTypes {
  HttpRequest = "httpRequest",
  Set = "set",
  If = "if",
  Code = "code",
  Delay = "delay",
  Merge = "merge",
}

/* ------------------------------------------------------------------ */
/*  Action Sheet Element                                               */
/* ------------------------------------------------------------------ */

interface ActionSheetElement {
  type: ActionNodeTypes;
  title: string;
  label: string;
  description: string;
  requireDataFields: boolean;
  icon?: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Action Nodes List                                                  */
/* ------------------------------------------------------------------ */

const actionNodes: ActionSheetElement[] = [
  {
    type: ActionNodeTypes.HttpRequest,
    title: "HTTP Request",
    label: "HTTP Request",
    description: "Call any external API",
    requireDataFields: true,
    icon: <Globe className="size-6" />,
  },
  {
    type: ActionNodeTypes.Set,
    title: "Set",
    label: "Set / Transform",
    description: "Add, remove or modify fields",
    requireDataFields: true,
    icon: <Wand2 className="size-6" />,
  },
  {
    type: ActionNodeTypes.If,
    title: "IF",
    label: "IF Condition",
    description: "Branch workflow based on conditions",
    requireDataFields: true,
    icon: <Filter className="size-6" />,
  },
  {
    type: ActionNodeTypes.Code,
    title: "Code",
    label: "Code",
    description: "Run custom JavaScript",
    requireDataFields: true,
    icon: <Code2 className="size-6" />,
  },
  {
    type: ActionNodeTypes.Delay,
    title: "Delay",
    label: "Delay",
    description: "Pause execution",
    requireDataFields: true,
    icon: <Clock className="size-6" />,
  },
  {
    type: ActionNodeTypes.Merge,
    title: "Merge",
    label: "Merge",
    description: "Merge multiple branches",
    requireDataFields: true,
    icon: <GitMerge className="size-6" />,
  },
];

/* ------------------------------------------------------------------ */
/*  Action Sheet Component                                             */
/* ------------------------------------------------------------------ */

export default function ActionSheet({
  setConfigNodeId,
  setNodes,
}: {
  setConfigNodeId: (id: string) => void;
  setNodes: Dispatch<SetStateAction<Node[]>>;
}) {
  const [open, setOpen] = useState(false);

  function createActionNode(
    type: ActionNodeTypes,
    position = { x: 0, y: 0 }
  ): Node {
    const base = {
      id: crypto.randomUUID(),
      type,
      position,
    };

    switch (type) {
      case ActionNodeTypes.HttpRequest:
        return { ...base, data: DEFAULT_HTTP_REQUEST_NODE_DATA };
      case ActionNodeTypes.Set:
        return { ...base, data: DEFAULT_SET_NODE_DATA };
      case ActionNodeTypes.If:
        return { ...base, data: DEFAULT_IF_NODE_DATA };
      case ActionNodeTypes.Code:
        return { ...base, data: DEFAULT_CODE_NODE_DATA };
      case ActionNodeTypes.Delay:
        return { ...base, data: DEFAULT_DELAY_NODE_DATA };
      case ActionNodeTypes.Merge:
        return { ...base, data: DEFAULT_MERGE_NODE_DATA };
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <PlusCircle className="size-3 text-border-strong group-hover:text-text-secondary hover:cursor-pointer" />
      </SheetTrigger>

      <SheetContent>
        <SheetHeader>
          <SheetTitle>Select action node</SheetTitle>
          <SheetDescription>
            Action nodes perform work inside the workflow
          </SheetDescription>

          <div className="flex flex-col gap-4 pt-6">
            {actionNodes.map((node) => (
              <div
                key={node.type}
                onClick={() => {
                  setOpen(false);
                  const newNode = createActionNode(node.type);
                  setNodes((nds) => [...nds, newNode]);

                  if (node.requireDataFields) {
                    setConfigNodeId(newNode.id);
                  }
                }}
                className="flex gap-3 cursor-pointer"
              >
                <div className="w-16 flex justify-center p-2">{node.icon}</div>

                <div className="flex flex-col">
                  <div className="text-text-primary">{node.label}</div>
                  <div className="text-text-muted text-sm">
                    {node.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}
