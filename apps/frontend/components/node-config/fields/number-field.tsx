"use client";

import { useFormContext } from "react-hook-form";
import type { NumberFieldMeta } from "@repo/types";

import { Input } from "@/components/ui/input";

interface NumberFieldProps {
  name: string;
  meta: NumberFieldMeta;
}

export function NumberField({ name, meta }: NumberFieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const error = errors[name]?.message as string | undefined;

  return (
    <Input
      type="number"
      label={meta.label}
      placeholder={meta.placeholder}
      min={meta.min}
      max={meta.max}
      helper={meta.helper}
      error={error}
      {...register(name, { valueAsNumber: true })}
    />
  );
}
