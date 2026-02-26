"use client";

 import { useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type OnConnectEnd,
  type DefaultEdgeOptions,
  type FitViewOptions,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";
import { FlowEdge, FlowNode } from "@/app/types/flow";
import useFlow from "@/app/store/flow-store";

import { TriggerNodeTypes } from "@/app/types/tirggers";
import { ActionNodeTypes } from "@/app/types/actions";

import { ManualTriggerNode } from "../nodes/triggers/manual-trigger-node";
import { SchedulerTriggerNode } from "../nodes/triggers/schedule-trigger-node";
import { WebhookTriggerNode } from "../nodes/triggers/webhook-trigger-node";

import { HttpRequestNode } from "../nodes/actions/http-action-node";
import { IfNode } from "../nodes/actions/if-condition-action-node";
import { MergeNode } from "../nodes/actions/merge-action-node";
import { SetNode } from "../nodes/actions/set-transform-action-node";
import { DelayNode } from "../nodes/actions/delay-action-node";

type Props = {
  initialNodes?: FlowNode[];
  initialEdges?: FlowEdge[];
  readOnly?: boolean;
  onConnectEnd?: OnConnectEnd;
  fitView?: boolean;
  className?: string;
  children?: React.ReactNode;
};

const fitViewOptions: FitViewOptions = {
  padding: 1,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  animated: true,
};

export const nodeTypes = {
  [TriggerNodeTypes.ManualTrigger]: ManualTriggerNode,
  [TriggerNodeTypes.SchedulerTrigger]: SchedulerTriggerNode,
  [TriggerNodeTypes.Webhook]: WebhookTriggerNode,

  [ActionNodeTypes.Delay]: DelayNode,
  [ActionNodeTypes.HttpRequest]: HttpRequestNode,
  [ActionNodeTypes.If]: IfNode,
  [ActionNodeTypes.Merge]: MergeNode,
  [ActionNodeTypes.Set]: SetNode,
};

export default function FlowCanvas({
  initialNodes,
  initialEdges,
  readOnly = false,
  onConnectEnd,
  fitView = true,
  className,
  children,
}: Props) {
  const initialized = useRef(false);

  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
  } = useFlow();

  /**
   * Initialize ONLY ONCE
   */
  useEffect(() => {
    if (initialized.current) return;

    if (initialNodes) setNodes(initialNodes);
    if (initialEdges) setEdges(initialEdges);

    initialized.current = true;
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  /**
   * Attach listeners only if editable
   */
  const eventHandlers = useMemo(() => {
    if (readOnly) return {};

    return {
      onNodesChange,
      onEdgesChange,
      onConnect,
      onConnectEnd,
    };
  }, [readOnly, onNodesChange, onEdgesChange, onConnect, onConnectEnd]);

  return (
    <div className={className ?? "w-full h-full"}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView={fitView}
        fitViewOptions={fitViewOptions}
        defaultEdgeOptions={defaultEdgeOptions}
        {...eventHandlers}
      >
        <Background
          gap={10}
          color="var(--color-bg-muted)"
          variant={BackgroundVariant.Dots}
        />

        {!readOnly && <MiniMap />}
        {!readOnly && <Controls />}

        {children}
      </ReactFlow>
    </div>
  );
}
