"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { FieldValues } from "react-hook-form";

import useExecutionStore from "@/app/store/execution-store";
import useFlow from "@/app/store/flow-store";
import type { BaseActionNodeData } from "@/app/types/actions";
import { Input } from "@/components/ui/input";
import { getUpstreamNodes } from "@/lib/workflow-graph";

import type { InputNode } from "./data-panel";
import { FocusProvider } from "./focus-context";
import { NodeConfigDialog } from "./node-config-dialog";
import { getNodeRegistryEntry } from "./node-registry";
import {
  SchemaNodeConfigForm,
  type SchemaNodeConfigFormHandle,
} from "./schema-node-config-form";

/* ============================================================
   SchemaNodeConfigDialog — drives the NodeConfigDialog shell
   from a Zod schema + UIMeta entry in the node registry.

   Data flow:
     • Upstream input data is sourced from the client-side
       execution store, falling back to the node's own data.output
       (mainly so legacy nodes that wrote into data.output keep
       working until they're migrated).
     • The output panel surfaces the current node's last captured
       output and exposes a "Pinned" tab that lets the user pin
       arbitrary JSON as this node's output.
   ============================================================ */

export interface NodeConfigData<T extends FieldValues> {
  type: string;
  label: string;
  description?: string;
  config: T;
  [key: string]: unknown;
}

interface SchemaNodeConfigDialogProps {
  nodeId: string;
  nodeType: string;
  data: BaseActionNodeData & { config: unknown };
  onSave: (next: BaseActionNodeData & { config: unknown }) => void;
  onClose: () => void;
  /**
   * Optional override. Most callers should leave this unset and let the
   * execution store provide output data for the current node.
   */
  outputData?: unknown;
  /** Hide the input panel — used by triggers, which have no upstream. */
  showInput?: boolean;
}

export function SchemaNodeConfigDialog({
  nodeId,
  nodeType,
  data,
  onSave,
  onClose,
  outputData,
  showInput = true,
}: SchemaNodeConfigDialogProps) {
  const entry = getNodeRegistryEntry(nodeType);
  const [label, setLabel] = useState(data.label);
  const formRef = useRef<SchemaNodeConfigFormHandle<FieldValues>>(null);

  const nodes = useFlow((s) => s.nodes);
  const edges = useFlow((s) => s.edges);

  const outputs = useExecutionStore((s) => s.outputs);
  const pinnedNodeIds = useExecutionStore((s) => s.pinnedNodeIds);
  const pinNodeOutput = useExecutionStore((s) => s.pinNodeOutput);
  const unpinNodeOutput = useExecutionStore((s) => s.unpinNodeOutput);

  const upstreamNodes: InputNode[] = useMemo(
    () =>
      getUpstreamNodes(nodeId, nodes, edges).map((n) => {
        const d = n.data as { label?: string; output?: unknown };
        // Prefer the live execution-store output (which is what pinned data
        // lives in too); fall back to whatever the node wrote into its own
        // data.output before we migrated to the store.
        const captured = outputs[n.id]?.data;
        return {
          id: n.id,
          label: d.label ?? n.id,
          data: captured ?? d.output,
        };
      }),
    [nodeId, nodes, edges, outputs]
  );

  const currentOutput = outputs[nodeId]?.data ?? outputData;
  const isCurrentPinned = pinnedNodeIds.includes(nodeId);

  const handlePin = useCallback(
    (value: unknown) => {
      pinNodeOutput(nodeId, value);
    },
    [nodeId, pinNodeOutput]
  );

  const handleUnpin = useCallback(() => {
    unpinNodeOutput(nodeId);
  }, [nodeId, unpinNodeOutput]);

  if (!entry) {return null;}

  const handleSave = async () => {
    const handle = formRef.current;
    if (!handle) {return false;}
    // submit() resolves false when Zod validation fails — propagate that so
    // the dialog stays open and the form can surface field errors.
    return await handle.submit();
  };

  const handleFormSubmit = (config: FieldValues) => {
    onSave({ ...data, label, config });
  };

  return (
    <FocusProvider>
      <NodeConfigDialog
        open
        onOpenChange={(open) => {
          if (!open) {onClose();}
        }}
        title={label || entry.uiMeta.displayName}
        subtitle={data.description ?? entry.uiMeta.description}
        icon={entry.icon}
        showInput={showInput}
        inputNodes={upstreamNodes}
        outputData={currentOutput}
        outputPanel={{
          emptyHint:
            "Run this node, or paste JSON in the Pinned tab to test downstream nodes.",
          pin: {
            isPinned: isCurrentPinned,
            onPin: handlePin,
            onUnpin: handleUnpin,
          },
        }}
        onSave={handleSave}
        onCancel={onClose}
      >
        <div className="flex flex-col gap-6">
          <Input
            label="Node Name"
            value={label}
            placeholder={entry.uiMeta.displayName}
            onChange={(e) => setLabel(e.target.value)}
          />

          <SchemaNodeConfigForm
            schema={entry.schema as never}
            uiMeta={entry.uiMeta}
            defaultValues={data.config as FieldValues}
            onSubmit={handleFormSubmit}
            formRef={formRef}
          />
        </div>
      </NodeConfigDialog>
    </FocusProvider>
  );
}
