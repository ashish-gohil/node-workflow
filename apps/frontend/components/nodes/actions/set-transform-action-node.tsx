import { Shuffle } from "lucide-react";
import { ActionNodeBase } from "./action-node-base";
import { SetNodeType } from "@/app/types/actions";
import { NodeProps } from "@xyflow/react";

export function SetNode({ id, data, selected }: NodeProps<SetNodeType>) {
  return (
    <ActionNodeBase
      id={id}
      selected={selected}
      icon={<Shuffle className="size-5 text-text-secondary" />}
      onEdit={data.onEdit}
      outputs={[{ id: "output" }]}
    />
  );
}
