import {
  ActionNodeTypes,
  CodeNodeData,
  DelayNodeData,
  HttpRequestNodeData,
  IfNodeData,
  MergeNodeData,
  SetNodeData,
} from "../types/actions";

/* ------------------------------------------------------------------ */
/*  HTTP Request                                                       */
/* ------------------------------------------------------------------ */

export const DEFAULT_HTTP_REQUEST_NODE_DATA: HttpRequestNodeData = {
  type: ActionNodeTypes.HttpRequest,
  label: "HTTP Request",
  description: "Make an HTTP request",
  execution: "initial",
  config: {
    method: "GET",
    url: "",
    headers: {},
    query: {},
    auth: { type: "none" },
  },
};

/* ------------------------------------------------------------------ */
/*  Set / Transform                                                    */
/* ------------------------------------------------------------------ */

export const DEFAULT_SET_NODE_DATA: SetNodeData = {
  type: ActionNodeTypes.Set,
  label: "Set",
  description: "Set or modify fields",
  execution: "initial",
  config: {
    values: {},
  },
};

/* ------------------------------------------------------------------ */
/*  IF / Condition                                                     */
/* ------------------------------------------------------------------ */

export const DEFAULT_IF_NODE_DATA: IfNodeData = {
  type: ActionNodeTypes.If,
  label: "IF",
  description: "Conditionally route data",
  execution: "initial",
  config: {
    conditions: [
      {
        left: "",
        operator: "equals",
        right: "",
      },
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  Code (JavaScript)                                                  */
/* ------------------------------------------------------------------ */

export const DEFAULT_CODE_NODE_DATA: CodeNodeData = {
  type: ActionNodeTypes.Code,
  label: "Code",
  description: "Run custom JavaScript",
  execution: "initial",
  config: {
    code: `return items;`,
  },
};

/* ------------------------------------------------------------------ */
/*  Delay / Wait                                                       */
/* ------------------------------------------------------------------ */

export const DEFAULT_DELAY_NODE_DATA: DelayNodeData = {
  type: ActionNodeTypes.Delay,
  label: "Delay",
  description: "Pause workflow execution",
  execution: "initial",
  config: {
    mode: "seconds",
    seconds: 5,
  },
};

/* ------------------------------------------------------------------ */
/*  Merge (multiple input → single output)                             */
/* ------------------------------------------------------------------ */

export const DEFAULT_MERGE_NODE_DATA: MergeNodeData = {
  inputs: 2,
  type: ActionNodeTypes.Merge,
  label: "Merge",
  description: "Merge multiple inputs",
  execution: "initial",
  config: {
    mode: "append",
    inputs: 2,
  },
};
