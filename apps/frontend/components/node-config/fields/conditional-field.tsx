"use client";

import { useFormContext } from "react-hook-form";
import type {
  ConditionalFieldMeta,
  FieldMeta,
  JsonEditorFieldMeta,
  KeyValueFieldMeta,
  TextAreaFieldMeta,
} from "@repo/types";

import { JsonEditorField } from "./json-editor-field";
import { KeyValueField } from "./key-value-field";
import { TextAreaField } from "./text-area-field";
import { joinPath } from "./widget-utils";

interface ConditionalFieldProps {
  name: string;
  meta: ConditionalFieldMeta;
  /** Path prefix used to resolve the sibling referenced by `dependsOn`. */
  pathPrefix: string;
}

export function ConditionalField({ name, meta, pathPrefix }: ConditionalFieldProps) {
  const form = useFormContext();
  const watchedPath = joinPath(pathPrefix, meta.dependsOn);
  const value = (form.watch(watchedPath) ?? "") as unknown as string;
  const widget = meta.widgetMap[value];

  if (!widget) {return null;}

  const inner: FieldMeta = buildInnerMeta(meta, widget);

  switch (widget) {
    case "jsonEditor":
      return <JsonEditorField name={name} meta={inner as JsonEditorFieldMeta} />;
    case "textArea":
      return <TextAreaField name={name} meta={inner as TextAreaFieldMeta} />;
    case "keyValueList":
      return <KeyValueField name={name} meta={inner as KeyValueFieldMeta} />;
    default:
      return null;
  }
}

function buildInnerMeta(meta: ConditionalFieldMeta, widget: string): FieldMeta {
  return { widget, label: meta.label } as FieldMeta;
}
