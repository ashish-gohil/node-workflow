import { ExecutionContext, ResolvedValue } from "../utils/expression-resolver";
import { BaseNode, NodeExecutionMeta } from "./BaseNode";

export class ManualTriggerNode extends BaseNode {

    execute(inputs: ResolvedValue, context: ExecutionContext, meta: NodeExecutionMeta): Promise<ResolvedValue> {
        return new Promise((resolve) => {
            resolve(inputs);
        });
    }

}