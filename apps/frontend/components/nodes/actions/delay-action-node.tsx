import { Clock } from "lucide-react";
import { ActionNodeBase } from "./action-node-base";
import { DelayNodeType } from "@/app/types/actions";
import { NodeProps } from "@xyflow/react";

export function DelayNode({ id, data, selected }: NodeProps<DelayNodeType>) {
  return (
    <ActionNodeBase
      id={id}
      selected={selected}
      icon={<Clock className="size-5 text-text-secondary" />}
      onEdit={data.onEdit}
      outputs={[{ id: "done" }]}
    />
  );
}
