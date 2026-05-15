"use client";

import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { KeyValueFieldMeta } from "@repo/types";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Input } from "@/components/ui/input";

interface KeyValueFieldProps {
  name: string;
  meta: KeyValueFieldMeta;
}

type Row = [string, string];

export function KeyValueField({ name, meta }: KeyValueFieldProps) {
  const { control } = useFormContext();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const value = (field.value ?? {}) as Record<string, string>;
        return <KeyValueEditor meta={meta} value={value} onChange={field.onChange} />;
      }}
    />
  );
}

function KeyValueEditor({
  meta,
  value,
  onChange,
}: {
  meta: KeyValueFieldMeta;
  value: Record<string, string>;
  onChange: (v: Record<string, string> | undefined) => void;
}) {
  // Order needs to survive re-renders even with empty keys, so we own a local rows array
  // and only project non-empty keys back into the form value.
  const [rows, setRows] = useState<Row[]>(() => Object.entries(value));

  const commit = (next: Row[]) => {
    setRows(next);
    const obj = Object.fromEntries(next.filter(([k]) => k.trim()));
    onChange(Object.keys(obj).length > 0 ? obj : undefined);
  };

  const updateRow = (idx: number, key: string, val: string) => {
    const next = [...rows] as Row[];
    next[idx] = [key, val];
    commit(next);
  };

  const removeRow = (idx: number) => commit(rows.filter((_, i) => i !== idx));
  const addRow = () => setRows([...rows, ["", ""]]);

  const addLabel =
    meta.addLabel ?? `Add ${meta.label?.toLowerCase().replace(/s$/, "") ?? "row"}`;

  return (
    <div className="flex flex-col gap-2">
      {meta.label && (
        <span className="text-h6 text-text-secondary tracking-wider uppercase">
          {meta.label}
        </span>
      )}

      {rows.map(([k, v], idx) => (
        <div key={idx} className="flex items-start gap-2">
          <Input
            placeholder={meta.keyPlaceholder ?? "Key"}
            value={k}
            onChange={(e) => updateRow(idx, e.target.value, v)}
            containerClassName="flex-1"
          />
          <Input
            placeholder={meta.valuePlaceholder ?? "Value"}
            value={v}
            onChange={(e) => updateRow(idx, k, e.target.value)}
            containerClassName="flex-1"
          />
          <button
            type="button"
            aria-label="Remove row"
            onClick={() => removeRow(idx)}
            className="text-text-muted hover:text-error mt-2.5 p-1.5 transition-colors"
          >
            <Trash2Icon className="size-4" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="text-text-brand hover:text-text-primary text-body-sm flex w-fit items-center gap-1 transition-colors"
      >
        <PlusIcon className="size-3.5" />
        {addLabel}
      </button>
    </div>
  );
}
