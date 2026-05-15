/**
 * Build an n8n-style expression that references another node's output.
 *
 *   buildExpression("HTTP Request", ["body", "user", "name"])
 *     // → "{{ HTTP Request.output.body.user.name }}"
 *   buildExpression("HTTP Request", ["items", 0, "id"])
 *     // → "{{ HTTP Request.output.items[0].id }}"
 *
 * Numeric segments render as `[i]`. String segments that don't look like
 * a JS identifier render as `["..."]`. The node label is used as-is so the
 * expression stays readable in the form input.
 */
export function buildExpression(
  nodeLabel: string,
  path: (string | number)[]
): string {
  const trail = path.map((segment) => formatSegment(segment)).join("");
  return `{{ ${nodeLabel}.output${trail} }}`;
}

const IDENT = /^[A-Za-z_$][\w$]*$/;

function formatSegment(segment: string | number): string {
  if (typeof segment === "number") {return `[${segment}]`;}
  if (IDENT.test(segment)) {return `.${segment}`;}
  return `[${JSON.stringify(segment)}]`;
}
