import * as React from "react";
import { cn } from "@/lib/utils";

type InputProps = React.ComponentProps<"input"> & {
  label?: string;
  containerClassName?: string;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, containerClassName, label, type, ...props }, ref) => {
    return (
      <div className={cn("flex flex-col gap-1", containerClassName)}>
        {label && (
          <label className="text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}

        <input
          ref={ref}
          type={type}
          data-slot="input"
          className={cn(
            // Base
            "h-9 w-full rounded-xs px-3 text-sm",
            "bg-surface text-text-primary",
            "border border-border-default",

            // Placeholder
            "placeholder:text-text-muted",

            // Hover
            "hover:border-border-strong",

            // Focus
            "focus-visible:outline-none",
            "focus-visible:ring-2 focus-visible:ring-state-focus/30",
            "focus-visible:border-state-focus",

            // Disabled
            "disabled:opacity-50 disabled:cursor-not-allowed",

            // Error
            "aria-invalid:border-destructive aria-invalid:ring-destructive/30",

            className
          )}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
