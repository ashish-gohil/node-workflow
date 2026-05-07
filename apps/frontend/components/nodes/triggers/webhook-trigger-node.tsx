"use client";

import { NodeProps } from "@xyflow/react";
import { Webhook } from "lucide-react";

import { WebhookTriggerNodeType } from "@/app/types/tirggers";

import { TriggerNodeBase } from "./trigger-node-base";






export function WebhookTriggerNode({
  id,
  data,
  selected,
}: NodeProps<WebhookTriggerNodeType>) {
  return (
    <TriggerNodeBase
      id={id}
      selected={selected}
      status={data.execution!}
      onEdit={data.onEdit}
      icon={<Webhook className="text-text-secondary size-5" />}
    />
  );
}
