"use client";

import { useFormContext } from "react-hook-form";
import type { TextAreaFieldMeta } from "@repo/types";

import { Textarea } from "@/components/ui/input";

import { useExpressionFocus } from "../focus-context";

interface TextAreaFieldProps {
  name: string;
  meta: TextAreaFieldMeta;
}

export function TextAreaField({ name, meta }: TextAreaFieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const { elementRef, onFocus, onBlur } = useExpressionFocus(name);

  const error = errors[name]?.message as string | undefined;
  const { ref: rhfRef, onBlur: rhfOnBlur, ...rest } = register(name);

  return (
    <Textarea
      label={meta.label}
      placeholder={meta.placeholder}
      rows={meta.rows ?? 6}
      mono={meta.mono}
      error={error}
      {...rest}
      ref={(el) => {
        rhfRef(el);
        elementRef.current = el;
      }}
      onFocus={onFocus}
      onBlur={(e) => {
        rhfOnBlur(e);
        onBlur();
      }}
    />
  );
}
