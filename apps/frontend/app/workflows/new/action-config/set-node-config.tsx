"use client";

import React, { useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { SetNodeData } from "@/app/types/actions";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ActionConfigProps<T> {
  configData: T;
  setConfigData: React.Dispatch<React.SetStateAction<T>>;
}

/* ------------------------------------------------------------------ */
/*  Internal row type                                                  */
/* ------------------------------------------------------------------ */

type ValueType = "string" | "number" | "boolean" | "expression";

interface Row {
  key: string;
  type: ValueType;
  raw: string; // always stored as string; converted on commit
}

function toTyped(type: ValueType, raw: string): unknown {
  switch (type) {
    case "number":
      return raw === "" ? 0 : Number(raw);
    case "boolean":
      return raw === "true";
    case "string":
    case "expression":
    default:
      return raw;
  }
}

function fromTyped(value: unknown): { type: ValueType; raw: string } {
  if (typeof value === "number") {return { type: "number", raw: String(value) };}
  if (typeof value === "boolean")
    {return { type: "boolean", raw: value ? "true" : "false" };}
  if (typeof value === "string") {
    const isExpr = value.includes("{{");
    return { type: isExpr ? "expression" : "string", raw: value };
  }
  return { type: "string", raw: String(value ?? "") };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SetNodeConfig({
  configData,
  setConfigData,
}: ActionConfigProps<SetNodeData>) {
  const [rows, setRows] = useState<Row[]>(() =>
    Object.entries(configData.config.values ?? {}).map(([key, value]) => ({
      key,
      ...fromTyped(value),
    }))
  );

  const commit = (next: Row[]) => {
    setRows(next);
    const values: Record<string, unknown> = {};
    next
      .filter((r) => r.key.trim())
      .forEach((r) => {
        values[r.key] = toTyped(r.type, r.raw);
      });
    setConfigData((prev) => ({
      ...prev,
      config: { ...prev.config, values },
    }));
  };

  const updateRow = (idx: number, patch: Partial<Row>) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    // Reset raw value when type changes to avoid type confusion
    if (patch.type && patch.type !== rows[idx].type) {
      next[idx].raw =
        patch.type === "boolean" ? "false" : patch.type === "number" ? "0" : "";
    }
    commit(next);
  };

  const removeRow = (idx: number) => commit(rows.filter((_, i) => i !== idx));

  const addRow = () => {
    const next = [...rows, { key: "", type: "string" as ValueType, raw: "" }];
    setRows(next); // don't commit yet — blank key should not create a field
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ---- Node label ---- */}
      <Input
        label="Node Name"
        value={configData.label}
        placeholder="Set"
        onChange={(e) =>
          setConfigData((prev) => ({ ...prev, label: e.target.value }))
        }
      />

      {/* ---- Values ---- */}
      <div className="flex flex-col gap-2">
        <span className="text-h6 text-text-secondary tracking-wider uppercase">
          Values
        </span>

        {rows.length === 0 && (
          <p className="text-body-sm text-text-muted py-2">
            No values yet. Add a field below.
          </p>
        )}

        {rows.map((row, idx) => (
          <div key={idx} className="flex flex-col items-start gap-1">
            {/* Key */}
            <div className="flex h-auto w-full items-start gap-3">
              <Input
                placeholder="field_name"
                value={row.key}
                onChange={(e) => updateRow(idx, { key: e.target.value })}
                containerClassName="w-[160px] shrink-0"
              />

              {/* Type */}
              <div className="w-auto shrink-0">
                <Select
                  value={row.type}
                  onValueChange={(t) =>
                    updateRow(idx, { type: t as ValueType })
                  }
                >
                  <SelectTrigger className="w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">String</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                    <SelectItem value="expression">Expression</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Remove */}
              <div className="flex h-10 flex-1 items-center justify-end">
                <button
                  type="button"
                  aria-label="Remove row"
                  onClick={() => removeRow(idx)}
                  className="text-text-muted hover:text-error m-auto flex transition-colors"
                >
                  <Trash2Icon className="size-4" />
                </button>
              </div>
            </div>
            <div className="w-full">
              {/* Value */}

              {row.type === "boolean" ? (
                <Select
                  value={row.raw}
                  onValueChange={(v) => updateRow(idx, { raw: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">true</SelectItem>
                    <SelectItem value="false">false</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={row.type === "number" ? "number" : "text"}
                  placeholder={
                    row.type === "expression"
                      ? "{{ upstream.output.field }}"
                      : row.type === "number"
                        ? "0"
                        : "value"
                  }
                  value={row.raw}
                  mono={row.type === "expression"}
                  onChange={(e) => updateRow(idx, { raw: e.target.value })}
                />
              )}
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addRow}
          className="text-text-brand hover:text-text-primary text-body-sm flex w-fit items-center gap-1 transition-colors"
        >
          <PlusIcon className="size-3.5" />
          Add field
        </button>
      </div>
    </div>
  );
}
