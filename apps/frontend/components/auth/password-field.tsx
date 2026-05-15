"use client";

import { forwardRef, type ReactNode, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* ============================================================
   PasswordField — Input with show/hide toggle.

   Wraps the standard `Input` so the type can flip between
   "password" and "text" on demand. Renders a right-aligned
   eye icon button inside the field. The label/hint header is
   rendered above the field so callers can place inline content
   like "Forgot password?" alongside the label.
   ============================================================ */

type PasswordFieldProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "label"
> & {
  label: string;
  /** Right-aligned content next to the label (e.g. "Forgot password?"). */
  hint?: ReactNode;
};

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField({ label, hint, id, className, ...props }, ref) {
    const [visible, setVisible] = useState(false);
    const fieldId = id ?? "password";

    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor={fieldId}
            className="text-h6 text-text-secondary tracking-wider uppercase"
          >
            {label}
          </label>
          {hint && <span className="text-caption">{hint}</span>}
        </div>

        <div className="relative">
          <Input
            ref={ref}
            id={fieldId}
            type={visible ? "text" : "password"}
            containerClassName="gap-0"
            className={cn("pr-11", className)}
            // The wrapping div already renders our label, so skip Input's.
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            // 10 (input height) ≈ 40px; helper span below adds bottom padding,
            // so we anchor the toggle to the visual field area.
            className={cn(
              "text-text-muted hover:text-text-primary hover:bg-bg-inset",
              "absolute top-1 right-1 grid size-8 place-items-center",
              "transition-colors duration-[160ms] [&_svg]:size-4"
            )}
          >
            {visible ? <EyeOff /> : <Eye />}
          </button>
        </div>
      </div>
    );
  }
);
