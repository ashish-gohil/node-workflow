import { ExecutionContext, ResolvedValue } from "../utils/expression-resolver";
import { BaseNode, NodeExecutionMeta } from "./BaseNode";

type IfOperator = "equals" | "notEquals" | "greaterThan" | "lessThan" | "exists" | "contains";

interface IfCondition {
  left: ResolvedValue;
  operator: IfOperator;
  right?: ResolvedValue;
}

function evaluate(condition: IfCondition): boolean {
  const { left, operator, right } = condition;

  switch (operator) {
    case "equals":
      // eslint-disable-next-line eqeqeq
      return left == right;
    case "notEquals":
      // eslint-disable-next-line eqeqeq
      return left != right;
    case "greaterThan":
      return Number(left) > Number(right);
    case "lessThan":
      return Number(left) < Number(right);
    case "exists":
      return left !== null && left !== undefined && left !== "";
    case "contains":
      if (Array.isArray(left)) return left.includes(right as never);
      return String(left ?? "").includes(String(right ?? ""));
    default:
      return false;
  }
}

/**
 * IF node — evaluates a list of conditions AND-combined.
 *
 * Output:
 *   {
 *     passed: boolean,                              // true if every condition is true
 *     results: [{ left, operator, right, passed }] // per-condition trace for debugging
 *   }
 *
 * Downstream nodes can branch via expressions like `{{If.output.passed}}`.
 */
export class IfNode extends BaseNode {
  async execute(
    inputs: ResolvedValue,
    _context: ExecutionContext,
    _meta: NodeExecutionMeta
  ): Promise<ResolvedValue> {
    const conditions = (inputs as { conditions?: IfCondition[] })?.conditions ?? [];

    const results = conditions.map((c) => ({
      left: c.left ?? null,
      operator: c.operator,
      right: c.right ?? null,
      passed: evaluate(c),
    }));

    const passed = results.length > 0 && results.every((r) => r.passed);

    return { passed, results } as ResolvedValue;
  }
}
