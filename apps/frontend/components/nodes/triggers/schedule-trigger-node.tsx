"use client";

import { NodeProps } from "@xyflow/react";
import { TimerIcon } from "lucide-react";

import { SchedulerTriggerNodeType } from "@/app/types/tirggers";

import { TriggerNodeBase } from "./trigger-node-base";






export function SchedulerTriggerNode({
  id,
  data,
  selected,
}: NodeProps<SchedulerTriggerNodeType>) {
  return (
    <TriggerNodeBase
      id={id}
      selected={selected}
      status={data.execution!}
      onEdit={data.onEdit}
      icon={<TimerIcon className="text-text-secondary size-5" />}
    />
  );
}
