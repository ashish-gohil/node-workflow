"use client";

import { use, useEffect, useState } from "react";
import type { IWorkflow } from "@repo/types";

import { api } from "@/lib/api";
import { hydrateWorkflowForEditor } from "@/lib/workflow-payload";

import WorkflowEditor from "../new/workflow-editor";

type Props = { params: Promise<{ workflowId: string }> };

export default function EditWorkflow({ params }: Props) {
  const { workflowId } = use(params);

  const [hydrated, setHydrated] = useState<ReturnType<
    typeof hydrateWorkflowForEditor
  > | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = (await api.get(`workflows/${workflowId}`)) as
          | IWorkflow
          | { error: string };
        if (cancelled) return;
        if ("error" in res) {
          setError(res.error);
          return;
        }
        setHydrated(hydrateWorkflowForEditor(res));
      } catch {
        if (!cancelled) setError("Failed to load workflow");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workflowId]);

  if (error) {
    return (
      <div className="bg-bg-canvas flex h-screen items-center justify-center">
        <p className="text-text-muted text-body-sm">{error}</p>
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="bg-bg-canvas flex h-screen items-center justify-center">
        <p className="text-text-muted text-body-sm">Loading workflow…</p>
      </div>
    );
  }

  return (
    <WorkflowEditor
      workflowId={workflowId}
      initialName={hydrated.name}
      initialNodes={hydrated.nodes}
      initialEdges={hydrated.edges}
    />
  );
}
