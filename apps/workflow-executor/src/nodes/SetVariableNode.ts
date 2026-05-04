import { ExecutionContext, ResolvedValue } from "../utils/expression-resolver";
import { BaseNode } from "./BaseNode";

class SetVariableNode extends BaseNode {

    execute(input: ResolvedValue, context: ExecutionContext) {

        console.log(output);
        return output
    }

}