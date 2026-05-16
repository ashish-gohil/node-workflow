import type {
  CodeNode,
  DelayNode,
  HttpRequest,
  If,
  IfCondition as SharedIfCondition,
  IfOperator,
  MergeNode,
  SetVariable,
} from "@repo/types";
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
  /** Last captured output from this node's most recent execution. */
  output?: unknown;
};

/* ------------------------------------------------------------------ */
/*  HTTP Request Node                                                  */
/* ------------------------------------------------------------------ */

export type HttpMethod = HttpRequest["method"];
export type HttpAuth = NonNullable<HttpRequest["auth"]>;
export type HttpRequestConfig = HttpRequest;

export type HttpRequestNodeData = BaseActionNodeData & {
  type: ActionNodeTypes.HttpRequest;
  config: HttpRequestConfig;
};

/* ------------------------------------------------------------------ */
/*  Set / Transform Node                                               */
/* ------------------------------------------------------------------ */

export type SetNodeConfig = SetVariable;

export type SetNodeData = BaseActionNodeData & {
  type: ActionNodeTypes.Set;
  config: SetNodeConfig;
};

/* ------------------------------------------------------------------ */
/*  IF / Condition Node                                                */
/* ------------------------------------------------------------------ */

export type ConditionOperator = IfOperator;
export type IfCondition = SharedIfCondition;
export type IfNodeConfig = If;

export type IfNodeData = BaseActionNodeData & {
  type: ActionNodeTypes.If;
  config: IfNodeConfig;
};

/* ------------------------------------------------------------------ */
/*  Code (JavaScript) Node                                             */
/* ------------------------------------------------------------------ */

export type CodeNodeConfig = CodeNode;

export type CodeNodeData = BaseActionNodeData & {
  type: ActionNodeTypes.Code;
  config: CodeNodeConfig;
};

/* ------------------------------------------------------------------ */
/*  Delay / Wait Node                                                  */
/* ------------------------------------------------------------------ */

export type DelayNodeConfig = DelayNode;

export type DelayNodeData = BaseActionNodeData & {
  type: ActionNodeTypes.Delay;
  config: DelayNodeConfig;
};

/* ------------------------------------------------------------------ */
/*  Merge Node (multiple input → single output, n8n-style)             */
/* ------------------------------------------------------------------ */

export type MergeMode = MergeNode["mode"];
export type MergeNodeConfig = MergeNode;

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
