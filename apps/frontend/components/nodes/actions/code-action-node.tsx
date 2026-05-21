import { NodeProps } from "@xyflow/react";
import { Code2 } from "lucide-react";

import { CodeNodeType } from "@/app/types/actions";

import { ActionNodeBase } from "./action-node-base";

export function CodeNode({ id, data, selected }: NodeProps<CodeNodeType>) {
  return (
    <ActionNodeBase
      id={id}
      selected={selected}
      // tone="ai"
      icon={<Code2 />}
      onEdit={data.onEdit}
      outputs={[{ id: "out" }]}
      label={data.label ?? "Code"}
      subtitle="custom JS"
      badge="JS"
    />
  );
}
