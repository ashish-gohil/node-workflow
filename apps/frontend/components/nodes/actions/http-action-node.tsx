import { NodeProps } from "@xyflow/react";
import { Globe } from "lucide-react";

import { HttpRequestNodeType } from "@/app/types/actions";

import { ActionNodeBase } from "./action-node-base";

export function HttpRequestNode({
  id,
  data,
  selected,
}: NodeProps<HttpRequestNodeType>) {
  return (
    <ActionNodeBase
      id={id}
      selected={selected}
      icon={<Globe />}
      onEdit={data.onEdit}
      outputs={[{ id: "success" }]}
      label="HTTP"
      subtitle="REST"
      badge="GET"
    />
  );
}
