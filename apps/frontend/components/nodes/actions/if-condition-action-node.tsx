import { NodeProps } from "@xyflow/react";
import { GitBranch } from "lucide-react";

import { IfNodeType } from "@/app/types/actions";

import { ActionNodeBase } from "./action-node-base";

export function IfNode({ id, data, selected }: NodeProps<IfNodeType>) {
  return (
    <ActionNodeBase
      id={id}
      selected={selected}
      tone="branch"
      icon={<GitBranch />}
      onEdit={data.onEdit}
      outputs={[
        { id: "true", label: "true" },
        { id: "false", label: "false" },
      ]}
      label={data.label}
      subtitle="condition"
      badge="Branch"
    />
  );
}
