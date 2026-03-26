import { NodeProps } from "@xyflow/react";
import { Shuffle } from "lucide-react";

import { SetNodeType } from "@/app/types/actions";

import { ActionNodeBase } from "./action-node-base";

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
