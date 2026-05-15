"use client";

import type { ObjectFieldMeta } from "@repo/types";

import { SchemaFieldRenderer } from "./schema-field-renderer";

interface ObjectFieldProps {
  name: string;
  meta: ObjectFieldMeta;
}

export function ObjectField({ name, meta }: ObjectFieldProps) {
  return (
    <fieldset className="border-border-subtle flex flex-col gap-4 border p-4">
      {meta.label && (
        <legend className="text-h6 text-text-secondary tracking-wider uppercase">
          {meta.label}
        </legend>
      )}
      <SchemaFieldRenderer fields={meta.fields} pathPrefix={name} />
    </fieldset>
  );
}
