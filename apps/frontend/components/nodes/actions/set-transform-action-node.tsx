import { NodeProps } from "@xyflow/react";
import { Shuffle } from "lucide-react";

import { SetNodeType } from "@/app/types/actions";

import { ActionNodeBase } from "./action-node-base";














































export function SetNode({ id, data, selected }: NodeProps<SetNodeType>) {
  return (
    <ActionNodeBase
      id={id}
      selected={selected}
      icon={<Shuffle className="text-text-secondary size-5" />}
      onEdit={data.onEdit}
      outputs={[{ id: "output" }]}
    />
  );
}
