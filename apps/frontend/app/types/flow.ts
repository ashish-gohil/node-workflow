// app/flow/types.ts
import { Node, Edge, NodeChange, EdgeChange } from "@xyflow/react";
import {
  ManualTriggerDataTypes,
  SchedulerTriggerDataTypes,
  TriggerNodeTypes,
  WebhookTriggerDataTypes,
} from "@/app/types/tirggers";
import {
  HttpRequestNodeData,
  SetNodeData,
  IfNodeData,
  CodeNodeData,
  DelayNodeData,
  MergeNodeData,
  ActionNodeTypes,
} from "@/app/types/actions";

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
export type FlowType =
  | ActionNodeTypes
  | TriggerNodeTypes;