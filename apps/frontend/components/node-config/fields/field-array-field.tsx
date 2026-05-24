"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import type { FieldArrayMeta } from "@repo/types";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { SchemaFieldRenderer } from "./schema-field-renderer";

interface FieldArrayFieldProps {
  name: string;
  meta: FieldArrayMeta;
}

export function FieldArrayField({ name, meta }: FieldArrayFieldProps) {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });

  const addLabel =
    meta.addLabel ??
    `Add ${meta.label?.toLowerCase().replace(/s$/, "") ?? "item"}`;

  const blankItem = blankItemFromMeta(meta);

  return (
    <div className="flex flex-col gap-3">
      {meta.label && (
        <span className="text-h6 text-text-secondary tracking-wider uppercase">
          {meta.label}
        </span>
      )}

      {fields.map((row, idx) => (
        <fieldset
          key={row.id}
          className="border-border-subtle relative flex flex-col gap-4 border p-4"
        >
          <legend className="text-caption text-text-muted px-1 tracking-wider uppercase">
            {(meta.label ?? "Item").replace(/s$/, "")} {idx + 1}
          </legend>

          <SchemaFieldRenderer
            fields={meta.itemFields}
            pathPrefix={`${name}.${idx}`}
          />

          <button
            type="button"
            aria-label="Remove item"
            onClick={() => remove(idx)}
            className="text-text-muted hover:text-error absolute top-2 right-2 p-1.5 transition-colors"
          >
            <Trash2Icon className="size-4" />
          </button>
        </fieldset>
      ))}

      <button
        type="button"
        onClick={() => append(blankItem)}
        className="text-text-brand hover:text-text-primary text-body-sm flex w-fit items-center gap-1 transition-colors"
      >
        <PlusIcon className="size-3.5" />
        {addLabel}
      </button>
    </div>
  );
}

function blankItemFromMeta(meta: FieldArrayMeta): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(meta.itemFields)) {
    out[key] = blankValueForField(field);
  }
  return out;
}

function blankValueForField(field: import("@repo/types").FieldMeta): unknown {
  switch (field.widget) {
    case "number":
      return field.default ?? undefined;
    case "select":
      return field.default ?? "";
    case "multiSelect":
      return field.default ?? [];
    case "keyValueList":
      return {};
    case "jsonEditor":
      return "";
    case "object":
      return Object.fromEntries(
        Object.entries(field.fields).map(([k, f]) => [k, blankValueForField(f)])
      );
    case "fieldArray":
      return [];
    case "text":
    case "textArea":
    default:
      return "";
  }
}
