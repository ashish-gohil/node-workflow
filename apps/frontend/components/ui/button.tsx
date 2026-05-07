"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/* ============================================================
   STAMP BUTTON — Swiss/brutalist hard-shadow style
   - 1.5px solid border in primary text color
   - 4px 4px 0 hard shadow in forest deep
   - Hover translates +2/+2, shrinks shadow to 2px
   - Active translates +4/+4, shadow → 0
   ============================================================ */

const stampBase =
  "btn-stamp hover:btn-stamp-hover active:btn-stamp-active " +
  "focus-visible:outline focus-visible:outline-[2px] focus-visible:outline-offset-2 focus-visible:outline-border-focus " +
  "disabled:pointer-events-none disabled:opacity-50 " +
  "[&_svg]:pointer-events-none [&_svg]:shrink-0";

const buttonVariants = cva(stampBase, {
  variants: {
    variant: {
      primary: "btn-stamp-primary hover:btn-stamp-primary-hover",
      secondary: "",
      ghost: "btn-stamp-ghost hover:btn-stamp-ghost-hover",
      destructive:
        "bg-error-surface text-error border-error hover:bg-error-surface/80",
      link:
        "border-transparent bg-transparent text-text-brand shadow-none hover:underline " +
        "hover:bg-transparent hover:translate-x-0 hover:translate-y-0 hover:shadow-none",
    },
    size: {
      sm: "h-8 px-3 text-body-sm [&_svg]:size-3.5",
      default: "h-10 px-[18px] text-body-sm [&_svg]:size-4",
      lg: "h-12 px-[22px] text-body-md [&_svg]:size-4",
      icon: "size-10 px-0 [&_svg]:size-4",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "default",
  },
});

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="size-4 animate-spin"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="8"
                cy="8"
                r="6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="28"
                strokeDashoffset="14"
              />
            </svg>
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
