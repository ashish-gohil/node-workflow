"use client";

import React, { useState } from "react";
import { Code2, Shuffle } from "lucide-react";

import {
  ActionNodeDataTypes,
  ActionNodeTypes,
  CodeNodeData,
  SetNodeData,
} from "@/app/types/actions";
import { FlowNode } from "@/app/types/flow";
import { NodeConfigDialog } from "@/components/node-config/node-config-dialog";
import { getNodeRegistryEntry } from "@/components/node-config/node-registry";
import { SchemaNodeConfigDialog } from "@/components/node-config/schema-node-config-dialog";

import { CodeNodeConfig } from "./code-node-config";
import { SetNodeConfig } from "./set-node-config";

interface ActionConfigDialogProps {
  node: FlowNode;
  onSave: (data: ActionNodeDataTypes) => void;
  onClose: () => void;
  inputData?: unknown;
  outputData?: unknown;
}

const actionIconMap: Partial<Record<ActionNodeTypes, React.ReactNode>> = {
  [ActionNodeTypes.Set]: <Shuffle className="size-5" />,
  [ActionNodeTypes.Code]: <Code2 className="size-5" />,
};

export default function ActionConfigDialog({
  node,
  onSave,
  onClose,
  inputData,
  outputData,
}: ActionConfigDialogProps) {
  const nodeType = node.type as ActionNodeTypes;
  const registryEntry = getNodeRegistryEntry(nodeType);

  // Schema-driven nodes route through SchemaNodeConfigDialog. Anything not yet
  // migrated falls back to the legacy hand-written dispatcher below.
  if (registryEntry) {
    return (
      <SchemaNodeConfigDialog
        nodeId={node.id}
        nodeType={nodeType}
        data={node.data as ActionNodeDataTypes}
        onSave={(next) => onSave(next as ActionNodeDataTypes)}
        onClose={onClose}
        outputData={outputData}
      />
    );
  }

  return (
    <LegacyActionConfigDialog
      node={node}
      onSave={onSave}
      onClose={onClose}
      inputData={inputData}
      outputData={outputData}
      iconMap={actionIconMap}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Legacy hand-written dispatcher — pending migration of remaining   */
/*  node types (Set/If/Code/Delay/Merge) to the schema-driven form.   */
/* ------------------------------------------------------------------ */

function LegacyActionConfigDialog({
  node,
  onSave,
  onClose,
  inputData,
  outputData,
  iconMap,
}: ActionConfigDialogProps & {
  iconMap: Partial<Record<ActionNodeTypes, React.ReactNode>>;
}) {
  const [tempConfigData, setTempConfigData] = useState<ActionNodeDataTypes>(
    node.data as ActionNodeDataTypes
  );
  const nodeType = node.type as ActionNodeTypes;
  const data = tempConfigData as ActionNodeDataTypes & {
    label?: string;
    description?: string;
  };

  let configContent: React.ReactNode;

  switch (nodeType) {
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
    case ActionNodeTypes.Code:
      configContent = (
        <CodeNodeConfig
          configData={tempConfigData as CodeNodeData}
          setConfigData={
            setTempConfigData as React.Dispatch<
              React.SetStateAction<CodeNodeData>
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
      open
      onOpenChange={(open) => {
        if (!open) {onClose();}
      }}
      title={data.label ?? nodeType}
      subtitle={data.description}
      icon={iconMap[nodeType]}
      inputData={inputData}
      outputData={outputData}
      outputPanel={{ emptyHint: "Run this node to see its output data." }}
      onSave={() => onSave(tempConfigData)}
      onCancel={onClose}
    >
      {configContent}
    </NodeConfigDialog>
  );
}
