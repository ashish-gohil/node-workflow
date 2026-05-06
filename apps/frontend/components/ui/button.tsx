"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-medium transition-colors duration-[120ms]",
    "focus-visible:outline focus-visible:outline-[1.5px] focus-visible:outline-offset-2",
    "focus-visible:outline-border-focus",
    "disabled:pointer-events-none",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: [
          "bg-forest-500 text-cream-50",
          "hover:bg-forest-400 active:bg-forest-600",
          "disabled:bg-neutral-300 disabled:text-neutral-500",
          "rounded-sm",
        ].join(" "),
        secondary: [
          "bg-bg-elevated text-text-primary border border-border-default",
          "hover:bg-bg-overlay hover:border-border-strong",
          "active:bg-bg-surface",
          "disabled:opacity-50",
          "rounded-sm",
        ].join(" "),
        ghost: [
          "bg-transparent text-text-primary",
          "hover:bg-white/[0.04] active:bg-white/[0.08]",
          "disabled:text-text-disabled",
          "rounded-sm",
        ].join(" "),
        destructive: [
          "bg-transparent text-error border border-error",
          "hover:bg-error/10 active:bg-error/20",
          "disabled:opacity-50",
          "rounded-sm",
        ].join(" "),
        link: [
          "bg-transparent text-forest-300 underline-offset-2",
          "hover:text-forest-200 hover:underline",
          "disabled:text-text-disabled",
        ].join(" "),
        stamp: [
          "rounded-none border-2 border-black bg-lime-200 text-black",
          "font-bold tracking-wide uppercase",
          "shadow-stamp transition-all duration-[120ms]",
          "hover:shadow-stamp-lg hover:-translate-x-0.5 hover:-translate-y-0.5",
          "active:shadow-stamp-pressed active:translate-x-[5px] active:translate-y-[5px]",
        ].join(" "),
      },
      size: {
        sm:      "h-8 px-3 text-body-sm",
        default: "h-9 px-4 text-body-md",
        lg:      "h-10 px-5 text-body-md",
        icon:    "size-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
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
                cx="8" cy="8" r="6"
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
