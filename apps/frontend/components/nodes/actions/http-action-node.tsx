import { Globe } from "lucide-react";
import { NodeProps } from "@xyflow/react";
import { ActionNodeBase } from "./action-node-base";
import { HttpRequestNodeType } from "@/app/types/actions";

export function HttpRequestNode({
  id,
  data,
  selected,
}: NodeProps<HttpRequestNodeType>) {
  return (
    <ActionNodeBase
      id={id}
      selected={selected}
      icon={<Globe className="size-5 text-text-secondary" />}
      onEdit={data.onEdit}
      outputs={[{ id: "success" }]}
    />
  );
}
