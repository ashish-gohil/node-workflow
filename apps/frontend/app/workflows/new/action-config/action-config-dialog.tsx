"use client";

import React, { useState } from "react";
import { Globe, Shuffle } from "lucide-react";

import {
  ActionNodeDataTypes,
  ActionNodeTypes,
  HttpRequestNodeData,
  SetNodeData,
} from "@/app/types/actions";
import { FlowNode } from "@/app/types/flow";
import { NodeConfigDialog } from "@/components/node-config/node-config-dialog";

import { HttpRequestConfig } from "./http-request-config";
import { SetNodeConfig } from "./set-node-config";

interface ActionConfigDialogProps {
  node: FlowNode;
  onSave: (data: ActionNodeDataTypes) => void;
  onClose: () => void;
  inputData?: unknown;
  outputData?: unknown;
}

const actionIconMap: Partial<Record<ActionNodeTypes, React.ReactNode>> = {
  [ActionNodeTypes.HttpRequest]: <Globe className="size-5" />,
  [ActionNodeTypes.Set]: <Shuffle className="size-5" />,
};

export default function ActionConfigDialog({
  node,
  onSave,
  onClose,
  inputData,
  outputData,
}: ActionConfigDialogProps) {
  const [tempConfigData, setTempConfigData] = useState<ActionNodeDataTypes>(
    node.data as ActionNodeDataTypes
  );

  const nodeType = node.type as ActionNodeTypes;
  const data = tempConfigData as ActionNodeDataTypes & { label?: string; description?: string };

  let configContent: React.ReactNode = null;

  switch (nodeType) {
    case ActionNodeTypes.HttpRequest:
      configContent = (
        <HttpRequestConfig
          configData={tempConfigData as HttpRequestNodeData}
          setConfigData={
            setTempConfigData as React.Dispatch<
              React.SetStateAction<HttpRequestNodeData>
            >
          }
        />
      );
      break;
    case ActionNodeTypes.Set:
      configContent = (
        <SetNodeConfig
          configData={tempConfigData as SetNodeData}
          setConfigData={
            setTempConfigData as React.Dispatch<
              React.SetStateAction<SetNodeData>
            >
          }
        />
      );
      break;
    default:
      return null;
  }

  return (
    <NodeConfigDialog
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={data.label ?? nodeType}
      subtitle={data.description}
      icon={actionIconMap[nodeType]}
      inputData={inputData}
      outputData={outputData}
      outputPanel={{
        emptyHint: "Run this node to see its output data.",
      }}
      onSave={() => onSave(tempConfigData)}
      onCancel={onClose}
    >
      {configContent}
    </NodeConfigDialog>
  );
}
