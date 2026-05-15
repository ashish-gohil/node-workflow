import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ============================================================
   ExecutionStore — client-side execution context.

   This is the in-browser mirror of the backend's per-execution
   data map. Three concerns live here:

     • outputs        — last-known output for a node (real run OR pinned)
     • pinnedNodeIds  — nodes whose output has been pinned manually;
                        these survive across runs and are NOT overwritten
                        by execution results until the user unpins them
     • runStatus      — coarse status flag for surfacing "executing…" UI

   Why a separate store from `flow-store`?
   The graph is what gets saved to the backend. Execution state is
   ephemeral / per-session and shouldn't pollute the workflow payload.

   Persistence: outputs + pins are saved to localStorage so the user
   doesn't lose iteration state on a page reload. Run status is not
   persisted — a stale "running" flag after a reload would be a lie.
   ============================================================ */

export type NodeRunStatus = "idle" | "running" | "success" | "error";

export type NodeOutput = {
  /** The actual output payload. Untyped on purpose — node-shape varies. */
  data: unknown;
  /** Wall-clock time the output was captured (ms since epoch). */
  capturedAt: number;
  /** "execution" = from a real run, "pinned" = pasted by user. */
  source: "execution" | "pinned";
};

export interface ExecutionState {
  /** Output payload keyed by nodeId. */
  outputs: Record<string, NodeOutput>;
  /** Set of nodeIds with manually pinned data. */
  pinnedNodeIds: string[];
  /** Last known run status keyed by nodeId. Not persisted. */
  runStatus: Record<string, NodeRunStatus>;

  /** Replace or set a node's output. Pinning is a separate action. */
  setNodeOutput: (
    nodeId: string,
    data: unknown,
    source?: NodeOutput["source"]
  ) => void;

  /** Pin a JSON value as a node's output. Marks it pinned + sets source. */
  pinNodeOutput: (nodeId: string, data: unknown) => void;

  /** Remove the pinned flag (and the cached output) for a node. */
  unpinNodeOutput: (nodeId: string) => void;

  /** Clear cached output without affecting pin state. */
  clearNodeOutput: (nodeId: string) => void;

  isPinned: (nodeId: string) => boolean;

  setRunStatus: (nodeId: string, status: NodeRunStatus) => void;

  /** Wipe execution data for one node (used when a node is deleted). */
  resetForNode: (nodeId: string) => void;

  /** Wipe everything (used by "Reset execution" UI). */
  resetAll: () => void;
}

const useExecutionStore = create<ExecutionState>()(
  persist(
    (set, get) => ({
      outputs: {},
      pinnedNodeIds: [],
      runStatus: {},

      setNodeOutput: (nodeId, data, source = "execution") => {
        // Pinned outputs win over execution outputs — don't clobber a pin
        // when a real run finishes.
        const state = get();
        if (source === "execution" && state.pinnedNodeIds.includes(nodeId)) {
          return;
        }
        set({
          outputs: {
            ...state.outputs,
            [nodeId]: { data, capturedAt: Date.now(), source },
          },
        });
      },

      pinNodeOutput: (nodeId, data) => {
        const state = get();
        set({
          outputs: {
            ...state.outputs,
            [nodeId]: { data, capturedAt: Date.now(), source: "pinned" },
          },
          pinnedNodeIds: state.pinnedNodeIds.includes(nodeId)
            ? state.pinnedNodeIds
            : [...state.pinnedNodeIds, nodeId],
        });
      },

      unpinNodeOutput: (nodeId) => {
        const state = get();
        const nextOutputs = { ...state.outputs };
        delete nextOutputs[nodeId];
        set({
          outputs: nextOutputs,
          pinnedNodeIds: state.pinnedNodeIds.filter((id) => id !== nodeId),
        });
      },

      clearNodeOutput: (nodeId) => {
        const state = get();
        const nextOutputs = { ...state.outputs };
        delete nextOutputs[nodeId];
        set({ outputs: nextOutputs });
      },

      isPinned: (nodeId) => get().pinnedNodeIds.includes(nodeId),

      setRunStatus: (nodeId, status) => {
        const state = get();
        set({ runStatus: { ...state.runStatus, [nodeId]: status } });
      },

      resetForNode: (nodeId) => {
        const state = get();
        const nextOutputs = { ...state.outputs };
        const nextStatus = { ...state.runStatus };
        delete nextOutputs[nodeId];
        delete nextStatus[nodeId];
        set({
          outputs: nextOutputs,
          runStatus: nextStatus,
          pinnedNodeIds: state.pinnedNodeIds.filter((id) => id !== nodeId),
        });
      },

      resetAll: () => {
        set({ outputs: {}, pinnedNodeIds: [], runStatus: {} });
      },
    }),
    {
      name: "flow-execution-state",
      // Run status is per-session; outputs + pins survive reload.
      partialize: (state) => ({
        outputs: state.outputs,
        pinnedNodeIds: state.pinnedNodeIds,
      }),
    }
  )
);

export default useExecutionStore;
