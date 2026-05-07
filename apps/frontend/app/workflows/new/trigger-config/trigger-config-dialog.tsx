"use client";
import React, { useState } from "react";
import { Clock, Webhook } from "lucide-react";

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
      outputData={outputData}
      outputPanel={{
        emptyHint:
          "Execute this trigger to see the data it will pass to the next step.",
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
