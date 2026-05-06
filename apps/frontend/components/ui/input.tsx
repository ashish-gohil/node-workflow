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
    const helperId = error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined;

    return (
      <div className={cn("flex flex-col gap-1.5", containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-h6 uppercase tracking-wider text-text-secondary"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leadingIcon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted [&_svg]:size-4">
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
              // Base
              "h-9 w-full rounded-sm px-3 text-body-md",
              "bg-bg-surface text-text-primary",
              "border border-border-strong",
              // Placeholder
              "placeholder:text-text-muted",
              // Hover
              "hover:border-border-intense",
              // Focus
              "focus:outline-none focus:border-border-focus",
              "focus:[box-shadow:var(--ds-shadow-focus-ring)]",
              // Disabled
              "disabled:bg-bg-inset disabled:text-text-disabled disabled:border-border-subtle disabled:cursor-not-allowed",
              // Error
              "aria-invalid:border-error aria-invalid:[box-shadow:0_0_0_3px_rgba(229,72,77,0.2)]",
              // Mono variant
              mono && "font-mono text-mono-md bg-bg-inset tracking-wide tabular-nums",
              // Leading icon padding
              leadingIcon && "pl-9",
              "transition-colors duration-[120ms]",
              className
            )}
            {...props}
          />
        </div>

        <span
          id={helperId}
          className={cn(
            "block min-h-4 text-caption",
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
  ({ className, containerClassName, label, helper, error, mono = false, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className={cn("flex flex-col gap-1.5", containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-h6 uppercase tracking-wider text-text-secondary"
          >
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={inputId}
          aria-invalid={error ? "true" : undefined}
          className={cn(
            "w-full rounded-sm px-3 py-2 text-body-md leading-[22px]",
            "bg-bg-surface text-text-primary",
            "border border-border-strong",
            "placeholder:text-text-muted",
            "hover:border-border-intense",
            "focus:outline-none focus:border-border-focus",
            "focus:[box-shadow:var(--ds-shadow-focus-ring)]",
            "disabled:bg-bg-inset disabled:text-text-disabled disabled:cursor-not-allowed",
            "resize-y min-h-[88px]",
            mono && "font-mono text-mono-md bg-bg-inset",
            "transition-colors duration-[120ms]",
            className
          )}
          {...props}
        />

        <span className={cn("block min-h-4 text-caption", error ? "text-error" : "text-text-muted")}>
          {error ?? helper}
        </span>
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export { Input, Textarea };
