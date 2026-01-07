import { Shuffle } from "lucide-react";
import { ActionNodeBase } from "./action-node-base";

export function SetNode({ id, data, selected }: NodeProps<any>) {
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
