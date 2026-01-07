import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
} from "@xyflow/react";

interface FlowState {
  nodes: Node[];
  edges: Edge[];
}

const initialState: FlowState = {
  nodes: [],
  edges: [],
};

const flowSlice = createSlice({
  name: "flow",
  initialState,
  reducers: {
    setNodes(state, action: PayloadAction<Node[]>) {
      state.nodes = action.payload;
    },
    setEdges(state, action: PayloadAction<Edge[]>) {
      state.edges = action.payload;
    },
    addNode(state, action: PayloadAction<Node>) {
      state.nodes.push(action.payload);
    },
    updateNodeData(state, action: PayloadAction<{ id: string; data: any }>) {
      const node = state.nodes.find((n) => n.id === action.payload.id);
      if (node) {
        node.data = { ...node.data, ...action.payload.data };
      }
    },
    onNodesChange(state, action: PayloadAction<NodeChange[]>) {
      state.nodes = applyNodeChanges(action.payload, state.nodes);
    },
    onEdgesChange(state, action: PayloadAction<EdgeChange[]>) {
      state.edges = applyEdgeChanges(action.payload, state.edges);
    },
  },
});

export const {
  setNodes,
  setEdges,
  addNode,
  updateNodeData,
  onNodesChange,
  onEdgesChange,
} = flowSlice.actions;

export default flowSlice.reducer;
