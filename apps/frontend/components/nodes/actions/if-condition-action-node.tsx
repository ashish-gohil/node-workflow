import { GitBranch } from "lucide-react";
import { ActionNodeBase } from "./action-node-base";
import { IfNodeType } from "@/app/types/actions";
import { NodeProps } from "@xyflow/react";

export function IfNode({ id, data, selected }: NodeProps<IfNodeType>) {
  return (
    <ActionNodeBase
      id={id}
      selected={selected}
      icon={<GitBranch className="size-5 text-text-secondary" />}
      onEdit={data.onEdit}
      outputs={[{ id: "true" }, { id: "false" }]}
    />
  );
}
