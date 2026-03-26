// app/flow/types.ts
import { Edge, EdgeChange, Node, NodeChange } from "@xyflow/react";

import {
  ActionNodeTypes,
  CodeNodeData,
  DelayNodeData,
  HttpRequestNodeData,
  IfNodeData,
  MergeNodeData,
  SetNodeData,
} from "@/app/types/actions";
import {
  ManualTriggerDataTypes,
  SchedulerTriggerDataTypes,
  TriggerNodeTypes,
  WebhookTriggerDataTypes,
} from "@/app/types/tirggers";

export type FlowNodeData =
  | ManualTriggerDataTypes
  | SchedulerTriggerDataTypes
  | WebhookTriggerDataTypes
  | HttpRequestNodeData
  | SetNodeData
  | IfNodeData
  | CodeNodeData
  | DelayNodeData
  | MergeNodeData;

export type FlowNode = Node<FlowNodeData>;
export type FlowEdge = Edge;
export type FlowNodeChange = NodeChange<FlowNode>;
export type FlowEdgeChange = EdgeChange;
export type FlowType = ActionNodeTypes | TriggerNodeTypes;
