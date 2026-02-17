import { Node } from "@xyflow/react";
import { ExecutionStatus } from "./tirggers";

/* ------------------------------------------------------------------ */
/*  Action Node Types                                                  */
/* ------------------------------------------------------------------ */

export enum ActionNodeTypes {
  HttpRequest = "httpRequest",
  Set = "set",
  If = "if",
  Code = "code",
  Delay = "delay",
  Merge = "merge",
}

/* ------------------------------------------------------------------ */
/*  Base Action Node Data                                              */
/* ------------------------------------------------------------------ */

export type BaseActionNodeData = {
  execution?: ExecutionStatus;
  label: string;
  description?: string;
  onEdit?: (id: string) => void;
};

/* ------------------------------------------------------------------ */
/*  HTTP Request Node                                                  */
/* ------------------------------------------------------------------ */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type HttpAuth =
  | { type: "none" }
  | { type: "apiKey"; headerName: string; value: string }
  | { type: "bearer"; token: string };

export type HttpRequestConfig = {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  auth?: HttpAuth;
};

export type HttpRequestNodeData = BaseActionNodeData & {
  type: ActionNodeTypes.HttpRequest;
  config: HttpRequestConfig;
};

/* ------------------------------------------------------------------ */
/*  Set / Transform Node                                               */
/* ------------------------------------------------------------------ */

export type SetNodeConfig = {
  values: Record<string, unknown>;
};

export type SetNodeData = BaseActionNodeData & {
  type: ActionNodeTypes.Set;
  config: SetNodeConfig;
};

/* ------------------------------------------------------------------ */
/*  IF / Condition Node                                                */
/* ------------------------------------------------------------------ */

export type ConditionOperator =
  | "equals"
  | "notEquals"
  | "greaterThan"
  | "lessThan"
  | "exists"
  | "contains";

export type IfCondition = {
  left: string;
  operator: ConditionOperator;
  right?: unknown;
};

export type IfNodeConfig = {
  conditions: IfCondition[];
};

export type IfNodeData = BaseActionNodeData & {
  type: ActionNodeTypes.If;
  config: IfNodeConfig;
};

/* ------------------------------------------------------------------ */
/*  Code (JavaScript) Node                                             */
/* ------------------------------------------------------------------ */

export type CodeNodeConfig = {
  code: string;
};

export type CodeNodeData = BaseActionNodeData & {
  type: ActionNodeTypes.Code;
  config: CodeNodeConfig;
};

/* ------------------------------------------------------------------ */
/*  Delay / Wait Node                                                  */
/* ------------------------------------------------------------------ */

export type DelayNodeConfig =
  | { mode: "seconds"; seconds: number }
  | { mode: "until"; timestamp: string };

export type DelayNodeData = BaseActionNodeData & {
  type: ActionNodeTypes.Delay;
  config: DelayNodeConfig;
};

/* ------------------------------------------------------------------ */
/*  Merge Node (multiple input → single output, n8n-style)             */
/* ------------------------------------------------------------------ */

export type MergeMode = "append" | "byIndex" | "byKey";

export type MergeNodeConfig = {
  mode: MergeMode;
  key?: string; // required when mode === "byKey"
  inputs?: number; // default: 2
};

export type MergeNodeData = BaseActionNodeData & {
  inputs: number;
  type: ActionNodeTypes.Merge;
  config: MergeNodeConfig;
};

/* ------------------------------------------------------------------ */
/*  React Flow Node Types                                              */
/* ------------------------------------------------------------------ */

export type HttpRequestNodeType = Node<HttpRequestNodeData>;
export type SetNodeType = Node<SetNodeData>;
export type IfNodeType = Node<IfNodeData>;
export type CodeNodeType = Node<CodeNodeData>;
export type DelayNodeType = Node<DelayNodeData>;
export type MergeNodeType = Node<MergeNodeData>;

/* ------------------------------------------------------------------ */
/*  Action Node Unions                                                 */
/* ------------------------------------------------------------------ */

export type ActionNodeDataTypes =
  | HttpRequestNodeData
  | SetNodeData
  | IfNodeData
  | CodeNodeData
  | DelayNodeData
  | MergeNodeData;

export type ActionNode =
  | HttpRequestNodeType
  | SetNodeType
  | IfNodeType
  | CodeNodeType
  | DelayNodeType
  | MergeNodeType;
