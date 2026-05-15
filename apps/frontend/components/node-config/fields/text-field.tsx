"use client";

import { useFormContext } from "react-hook-form";
import type { TextFieldMeta } from "@repo/types";

import { Input } from "@/components/ui/input";

import { useExpressionFocus } from "../focus-context";

interface TextFieldProps {
  name: string;
  meta: TextFieldMeta;
}

export function TextField({ name, meta }: TextFieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const { elementRef, onFocus, onBlur } = useExpressionFocus(name);

  const error = errors[name]?.message as string | undefined;
  const { ref: rhfRef, onBlur: rhfOnBlur, ...rest } = register(name);

  return (
    <Input
      label={meta.label}
      placeholder={meta.placeholder}
      type={meta.inputType ?? "text"}
      helper={meta.helper}
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
