export type ResolvedValue =
    | string
    | number
    | boolean
    | null
    | ResolvedValue[]
    | { [key: string]: ResolvedValue }

export type ExecutionContext = Record<string, Record<string, unknown>>

export function expressionResolver(template: ResolvedValue, executionContext: ExecutionContext): ResolvedValue {

    if (typeof template === "string") {
        // Case: entire string is one expression → return raw typed value
        if (/^\{\{[^}]+\}\}$/.test(template.trim())) {
            let keys = template.trim().slice(2, -2).split(".")
            let value: unknown = executionContext;
            for (const key of keys) {
                value = (value as Record<string, unknown>)?.[key];
                if (value === undefined) return ""; // fallback
            }

            return value as ResolvedValue;
        }

        // Case: string with embedded expressions (or no expressions)
        return template.replace(/\{\{([^}]+)\}\}/g, (_, path: string) => {

            // nodeName.output.body
            const keys = path.trim().split(".");
            // [nodeName, output, body]

            let value: unknown = executionContext;

            for (const key of keys) {
                value = (value as Record<string, unknown>)?.[key];
                if (value === undefined) return ""; // fallback
            }

            return String(value);
        });

    }
    if (Array.isArray(template)) {
        return template.map((i: any) => {
            return expressionResolver(i, executionContext)
        })
    }
    if (template !== null && typeof template === "object") {
        const outputObj: Record<string, ResolvedValue> = {}
        Object.keys(template).forEach(i =>
            outputObj[i] = expressionResolver(template[i], executionContext)
        )
        return outputObj
    }
    return template

}