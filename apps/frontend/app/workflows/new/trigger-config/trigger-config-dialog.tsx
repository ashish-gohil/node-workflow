"use client";
import React, { useCallback, useState } from "react";
import { Clock, Webhook } from "lucide-react";

import useExecutionStore from "@/app/store/execution-store";
import {
  TriggerNode,
  TriggerNodesDataTypes,
  TriggerNodeTypes,
} from "@/app/types/tirggers";
import { NodeConfigDialog } from "@/components/node-config/node-config-dialog";

import { SchedulerTriggerConfig } from "./scheduler-trigger-config";
import { WebhookTriggerConfig } from "./webhook-trigger-config";

interface ITriggerConfigDialog {
  node: TriggerNode;
  onSave: (data: TriggerNodesDataTypes) => void;
  onClose: () => void;
  /** Output of upstream node (none for triggers — always empty). */
  inputData?: unknown;
  /** Last execution result for this trigger. */
  outputData?: unknown;
}

export interface TriggerConfigProps<T> {
  configData: T;
  setConfigData: React.Dispatch<React.SetStateAction<T>>;
}

//@ts-ignore
const triggerConfigMap = {
  [TriggerNodeTypes.SchedulerTrigger]: SchedulerTriggerConfig,
  [TriggerNodeTypes.Webhook]: WebhookTriggerConfig,
  // [TriggerNodeTypes.ManualTrigger]: null,
};

const triggerIconMap: Partial<Record<TriggerNodeTypes, React.ReactNode>> = {
  [TriggerNodeTypes.SchedulerTrigger]: <Clock className="size-5" />,
  [TriggerNodeTypes.Webhook]: <Webhook className="size-5" />,
};

export default function TriggerConfigDialog({
  node,
  onSave,
  onClose,
  inputData,
  outputData,
}: ITriggerConfigDialog) {
  //@ts-ignore
  const ConfigComponent = triggerConfigMap[node.type as TriggerNodeTypes];

  const [tempConfigData, setTempConfigData] = useState<TriggerNodesDataTypes>(
    node.data
  );

  const storedOutput = useExecutionStore((s) => s.outputs[node.id]?.data);
  const isPinned = useExecutionStore((s) => s.pinnedNodeIds.includes(node.id));
  const pinNodeOutput = useExecutionStore((s) => s.pinNodeOutput);
  const unpinNodeOutput = useExecutionStore((s) => s.unpinNodeOutput);

  const handlePin = useCallback(
    (value: unknown) => pinNodeOutput(node.id, value),
    [node.id, pinNodeOutput]
  );
  const handleUnpin = useCallback(
    () => unpinNodeOutput(node.id),
    [node.id, unpinNodeOutput]
  );

  if (!ConfigComponent) {
    return null;
  }

  return (
    <NodeConfigDialog
      open={true}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      title={node.data?.label}
      subtitle={node.data?.description}
      icon={triggerIconMap[node.type as TriggerNodeTypes]}
      // Triggers are the entry point — there's never input data.
      showInput={false}
      outputData={storedOutput ?? outputData}
      outputPanel={{
        emptyHint:
          "Execute this trigger, or paste a sample payload in the Pinned tab to test downstream nodes without firing it.",
        pin: {
          isPinned,
          onPin: handlePin,
          onUnpin: handleUnpin,
        },
      }}
      onSave={() => onSave(tempConfigData)}
      onCancel={onClose}
      inputData={inputData}
    >
      <ConfigComponent
        configData={tempConfigData}
        setConfigData={setTempConfigData}
      />
    </NodeConfigDialog>
  );
}
