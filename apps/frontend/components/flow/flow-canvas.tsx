"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  type DefaultEdgeOptions,
  type FitViewOptions,
  MiniMap,
  type OnConnectEnd,
  ReactFlow,
} from "@xyflow/react";

import useFlow from "@/app/store/flow-store";
import { ActionNodeTypes } from "@/app/types/actions";
import { FlowEdge, FlowNode } from "@/app/types/flow";
import { TriggerNodeTypes } from "@/app/types/tirggers";

import { DelayNode } from "../nodes/actions/delay-action-node";
import { HttpRequestNode } from "../nodes/actions/http-action-node";
import { IfNode } from "../nodes/actions/if-condition-action-node";
import { MergeNode } from "../nodes/actions/merge-action-node";
import { SetNode } from "../nodes/actions/set-transform-action-node";
import { ManualTriggerNode } from "../nodes/triggers/manual-trigger-node";
import { SchedulerTriggerNode } from "../nodes/triggers/schedule-trigger-node";
import { WebhookTriggerNode } from "../nodes/triggers/webhook-trigger-node";

import "@xyflow/react/dist/style.css";

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
    if (initialized.current) {
      return;
    }

    if (initialNodes) {
      setNodes(initialNodes);
    }
    if (initialEdges) {
      setEdges(initialEdges);
    }

    initialized.current = true;
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  /**
   * Attach listeners only if editable
   */
  const eventHandlers = useMemo(() => {
    if (readOnly) {
      return {};
    }

    return {
      onNodesChange,
      onEdgesChange,
      onConnect,
      onConnectEnd,
    };
  }, [readOnly, onNodesChange, onEdgesChange, onConnect, onConnectEnd]);

  return (
    <div className={className ?? "h-full w-full"}>
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
