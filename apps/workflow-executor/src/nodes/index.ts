// src/nodes/index.ts  — the registry

import { ActionNodeTypes, TriggerNodeTypes, FlowNodeType } from "@repo/db"
import { BaseNode } from "./BaseNode"
import { HttpRequestNode } from "./HttpRequestNode"
import { SetVariableNode } from "./SetVariableNode"
import { ManualTriggerNode } from "./ManualTriggerNode"
import { SchedulerTriggerNode } from "./SchedulerTriggerNode"
import { IfNode } from "./IfNode"

// One stateless instance per node type
// NodeRunner does: registry[node.nodeType]?.execute(inputs, context, meta)
// Adding a new node type = one new line here, NodeRunner never changes

export const nodeRegistry: Partial<Record<FlowNodeType, BaseNode>> = {
    [TriggerNodeTypes.ManualTrigger]: new ManualTriggerNode(),
    [TriggerNodeTypes.SchedulerTrigger]: new SchedulerTriggerNode(),
    [TriggerNodeTypes.Webhook]: new HttpRequestNode(), // this needs to tested first if this works or not..
    [ActionNodeTypes.HttpRequest]: new HttpRequestNode(),
    [ActionNodeTypes.Set]: new SetVariableNode(),
    [ActionNodeTypes.If]: new IfNode(),
    // [ActionNodeTypes.Code]:     new CodeNode(),
    // [ActionNodeTypes.Delay]:    new DelayNode(),
}