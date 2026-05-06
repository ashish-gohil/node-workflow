import { NodeProps } from "@xyflow/react";
import { Clock } from "lucide-react";

import { DelayNodeType } from "@/app/types/actions";

import { ActionNodeBase } from "./action-node-base";














































export function DelayNode({ id, data, selected }: NodeProps<DelayNodeType>) {
  return (
    <ActionNodeBase
      id={id}
      selected={selected}
      icon={<Clock className="text-text-secondary size-5" />}
      onEdit={data.onEdit}
      outputs={[{ id: "done" }]}
    />
  );
}
