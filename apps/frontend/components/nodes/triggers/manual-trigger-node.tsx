"use client";

import { NodeProps } from "@xyflow/react";
import { MousePointerClick } from "lucide-react";

import { ManualTriggerNodeType } from "@/app/types/tirggers";

import { TriggerNodeBase } from "./trigger-node-base";

export function ManualTriggerNode({
  id,
  data,
  selected,
}: NodeProps<ManualTriggerNodeType>) {
  return (
    <TriggerNodeBase
      id={id}
      selected={selected}
      status={data.execution!}
      onEdit={data.onEdit}
      icon={<MousePointerClick />}
      label="Manual"
      subtitle="On click"
      badge="Trigger"
    />
  );
}
