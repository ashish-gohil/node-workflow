"use client";
import React, { useState } from "react";

import { TriggerNode, TriggerNodesDataTypes, TriggerNodeTypes } from "@/app/types/tirggers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { SchedulerTriggerConfig } from "./scheduler-trigger-config";
import { WebhookTriggerConfig } from "./webhook-trigger-config";

interface ITriggerConfigDialog {
  node: TriggerNode;
  onSave: (data: any) => void;
  onClose: () => void;
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

export default function TriggerConfigDialog({ node, onSave, onClose }: ITriggerConfigDialog) {
  //@ts-ignore
  const ConfigComponent = triggerConfigMap[node.type as TriggerNodeTypes];

  const [tempConfigData, setTempConfigData] = useState<TriggerNodesDataTypes>(node.data);

  if (!ConfigComponent) return null;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{node.data?.label}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-auto">
          <ConfigComponent configData={tempConfigData} setConfigData={setTempConfigData} />
        </div>
        <DialogFooter className="flex gap-6 mt-0 p-0">
          <Button onClick={onClose} variant="outline" allowCorners cornerSize="sm" className="w-20">
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave(tempConfigData);
              onClose();
            }}
            allowCorners
            cornerSize="sm"
            className="w-20"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
