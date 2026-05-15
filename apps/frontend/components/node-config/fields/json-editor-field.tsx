"use client";

import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { JsonEditorFieldMeta } from "@repo/types";

import { Textarea } from "@/components/ui/input";

interface JsonEditorFieldProps {
  name: string;
  meta: JsonEditorFieldMeta;
}

export function JsonEditorField({ name, meta }: JsonEditorFieldProps) {
  const { control } = useFormContext();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <JsonEditor
          meta={meta}
          value={field.value}
          onChange={field.onChange}
        />
      )}
    />
  );
}

function JsonEditor({
  meta,
  value,
  onChange,
}: {
  meta: JsonEditorFieldMeta;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const [text, setText] = useState(() =>
    value === undefined || value === null ? "" : JSON.stringify(value, null, 2)
  );
  const [error, setError] = useState("");

  const handleChange = (next: string) => {
    setText(next);
    if (!next.trim()) {
      setError("");
      onChange(undefined);
      return;
    }
    try {
      onChange(JSON.parse(next));
      setError("");
    } catch {
      setError("Invalid JSON");
    }
  };

  return (
    <Textarea
      label={meta.label}
      mono
      rows={meta.rows ?? 8}
      value={text}
      placeholder={meta.placeholder ?? '{\n  "key": "value"\n}'}
      error={error}
      onChange={(e) => handleChange(e.target.value)}
    />
  );
}
