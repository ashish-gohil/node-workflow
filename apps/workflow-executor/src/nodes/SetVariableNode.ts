import { ExecutionContext, ResolvedValue } from "../utils/expression-resolver";
import { BaseNode } from "./BaseNode";

class SetVariableNode extends BaseNode {

    execute(inputs: ResolvedValue, context: ExecutionContext, meta) {


        return inputs as unknown as ResolvedValue
    }

}