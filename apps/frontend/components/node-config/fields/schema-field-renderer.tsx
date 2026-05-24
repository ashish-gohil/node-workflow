"use client";

import { type FieldValues, useFormContext } from "react-hook-form";
import type { FieldMeta } from "@repo/types";

import { cn } from "@/lib/utils";

import { ConditionalField } from "./conditional-field";
import { FieldArrayField } from "./field-array-field";
import { JsonEditorField } from "./json-editor-field";
import { KeyValueField } from "./key-value-field";
import { NumberField } from "./number-field";
import { ObjectField } from "./object-field";
import { SelectField } from "./select-field";
import { TextAreaField } from "./text-area-field";
import { TextField } from "./text-field";
import { evalShowWhen, joinPath, widthClass } from "./widget-utils";

interface SchemaFieldRendererProps {
  fields: Record<string, FieldMeta>;
  /** Used by nested ObjectField to scope sibling references. */
  pathPrefix?: string;
}

export function SchemaFieldRenderer({
  fields,
  pathPrefix = "",
}: SchemaFieldRendererProps) {
  const form = useFormContext<FieldValues>();

  return (
    <div className={cn("grid grid-cols-12 gap-4")}>
      {Object.entries(fields).map(([key, meta]) => {
        if (!evalShowWhen(meta.showWhen, pathPrefix, form)) {return null;}

        const path = joinPath(pathPrefix, key);

        return (
          <div key={path} className={widthClass(meta.width)}>
            <FieldDispatcher name={path} meta={meta} pathPrefix={pathPrefix} />
          </div>
        );
      })}
    </div>
  );
}

function FieldDispatcher({
  name,
  meta,
  pathPrefix,
}: {
  name: string;
  meta: FieldMeta;
  pathPrefix: string;
}) {
  switch (meta.widget) {
    case "text":
      return <TextField name={name} meta={meta} />;
    case "number":
      return <NumberField name={name} meta={meta} />;
    case "textArea":
      return <TextAreaField name={name} meta={meta} />;
    case "select":
      return <SelectField name={name} meta={meta} />;
    case "keyValueList":
      return <KeyValueField name={name} meta={meta} />;
    case "jsonEditor":
      return <JsonEditorField name={name} meta={meta} />;
    case "conditional":
      return (
        <ConditionalField name={name} meta={meta} pathPrefix={pathPrefix} />
      );
    case "object":
      return <ObjectField name={name} meta={meta} />;
    case "fieldArray":
      return <FieldArrayField name={name} meta={meta} />;
    default:
      return null;
  }
}
