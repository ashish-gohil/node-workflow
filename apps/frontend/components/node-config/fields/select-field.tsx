"use client";

import { Controller, useFormContext } from "react-hook-form";
import type { SelectFieldMeta } from "@repo/types";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SelectFieldProps {
  name: string;
  meta: SelectFieldMeta;
}

export function SelectField({ name, meta }: SelectFieldProps) {
  const { control } = useFormContext();

  return (
    <div className="flex flex-col gap-1.5">
      {meta.label && (
        <span className="text-h6 text-text-secondary tracking-wider uppercase">
          {meta.label}
        </span>
      )}
      <Controller
        control={control}
        name={name}
        render={({ field, fieldState }) => (
          <>
            <Select value={field.value ?? ""} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={meta.placeholder ?? "Select…"} />
              </SelectTrigger>
              <SelectContent>
                {meta.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-caption text-error block min-h-4">
              {fieldState.error?.message}
            </span>
          </>
        )}
      />
    </div>
  );
}
