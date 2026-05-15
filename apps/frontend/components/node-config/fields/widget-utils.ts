import type { FieldValues, UseFormReturn } from "react-hook-form";
import type { FieldWidth, ShowWhen } from "@repo/types";

/** Convert a UIMeta width literal to a Tailwind col-span class. */
export function widthClass(width: FieldWidth | undefined): string {
  switch (width) {
    case "twoThirds":
      return "col-span-8";
    case "half":
      return "col-span-6";
    case "third":
      return "col-span-4";
    case "quarter":
      return "col-span-3";
    case "full":
    default:
      return "col-span-12";
  }
}

/** Join a parent path with a field key, producing the RHF dotted path. */
export function joinPath(prefix: string, key: string): string {
  return prefix ? `${prefix}.${key}` : key;
}

/**
 * Evaluate a `showWhen` clause against the current form values, resolving the
 * referenced field relative to the enclosing scope so sibling references work
 * inside nested object fields.
 */
export function evalShowWhen(
  showWhen: ShowWhen | undefined,
  pathPrefix: string,
  form: UseFormReturn<FieldValues>
): boolean {
  if (!showWhen) {return true;}
  const watchedPath = joinPath(pathPrefix, showWhen.field);
  const value = form.watch(watchedPath) as unknown as string | undefined;
  if (showWhen.in && !showWhen.in.includes(value ?? "")) {return false;}
  if (showWhen.notIn && showWhen.notIn.includes(value ?? "")) {return false;}
  return true;
}
