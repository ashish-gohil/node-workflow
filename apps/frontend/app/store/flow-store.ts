import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
} from "@xyflow/react";
import { create } from "zustand";

import { FlowEdge, FlowNode } from "../types/flow";

export type FlowState = {
  nodes: FlowNode[];
  edges: FlowEdge[];

  onNodesChange: OnNodesChange<FlowNode>;
  onEdgesChange: OnEdgesChange<FlowEdge>;
  onConnect: OnConnect;

  setNodes: (nodes: FlowNode[] | ((nodes: FlowNode[]) => FlowNode[])) => void;
  setEdges: (edges: FlowEdge[] | ((edges: FlowEdge[]) => FlowEdge[])) => void;

  editingActionNodeId: string | null;
  setEditingActionNodeId: (id: string | null) => void;

  reset: () => void;
};

const useFlow = create<FlowState>((set, get) => ({
  nodes: [],
  edges: [],

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });
  },

  setNodes: (updater) => {
    set((state) => ({
      nodes: typeof updater === "function" ? updater(state.nodes) : updater,
    }));
  },

  setEdges: (updater) => {
    set((state) => ({
      edges: typeof updater === "function" ? updater(state.edges) : updater,
    }));
  },

  editingActionNodeId: null,
  setEditingActionNodeId: (id) => set({ editingActionNodeId: id }),

  reset: () => {
    set({
      nodes: [],
      edges: [],
      editingActionNodeId: null,
    });
  },
}));

export default useFlow;
