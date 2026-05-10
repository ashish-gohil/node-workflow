import * as React from "react";

import { cn } from "@/lib/utils";

/* ============================================================
   TEXT INPUT
   ============================================================ */

type InputProps = React.ComponentProps<"input"> & {
  label?: string;
  helper?: string;
  error?: string;
  mono?: boolean;
  leadingIcon?: React.ReactNode;
  containerClassName?: string;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      containerClassName,
      label,
      helper,
      error,
      mono = false,
      leadingIcon,
      type,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    const helperId = error
      ? `${inputId}-error`
      : helper
        ? `${inputId}-helper`
        : undefined;

    return (
      <div className={cn("flex flex-col gap-1.5", containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-h6 text-text-secondary tracking-wider uppercase"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leadingIcon && (
            <span className="text-text-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 [&_svg]:size-4">
              {leadingIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={helperId}
            data-slot="input"
            className={cn(
              "btn-stamp text-body-md text-text-primary h-10 w-full px-3.5 font-normal",
              "placeholder:text-text-muted",
              "focus:outline-none focus:[border-color:var(--color-border-focus)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "aria-invalid:border-error",
              mono && "text-mono-md font-mono tracking-wide tabular-nums",
              leadingIcon && "pl-10",
              className
            )}
            {...props}
          />
        </div>

        <span
          id={helperId}
          className={cn(
            "text-caption block min-h-4",
            error ? "text-error" : "text-text-muted"
          )}
        >
          {error ?? helper}
        </span>
      </div>
    );
  }
);

Input.displayName = "Input";

/* ============================================================
   TEXTAREA
   ============================================================ */

type TextareaProps = React.ComponentProps<"textarea"> & {
  label?: string;
  helper?: string;
  error?: string;
  mono?: boolean;
  containerClassName?: string;
};

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      containerClassName,
      label,
      helper,
      error,
      mono = false,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className={cn("flex flex-col gap-1.5", containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-h6 text-text-secondary tracking-wider uppercase"
          >
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={inputId}
          aria-invalid={error ? "true" : undefined}
          className={cn(
            "btn-stamp text-body-md text-text-primary w-full px-3.5 py-2.5 leading-[22px] font-normal",
            "placeholder:text-text-muted",
            "focus:outline-none focus:[border-color:var(--color-border-focus)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "min-h-[88px] resize-y",
            mono && "text-mono-md font-mono",
            "aria-invalid:border-error",
            className
          )}
          {...props}
        />

        <span
          className={cn(
            "text-caption block min-h-4",
            error ? "text-error" : "text-text-muted"
          )}
        >
          {error ?? helper}
        </span>
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export { Input, Textarea };
