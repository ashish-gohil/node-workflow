"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import CornerIcons from "./corners";






/* ------------------------------------------------------------------ */
/* Root                                                               */
/* ------------------------------------------------------------------ */

function Select(props: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

/* ------------------------------------------------------------------ */
/* Group                                                              */
/* ------------------------------------------------------------------ */

function SelectGroup(
  props: React.ComponentProps<typeof SelectPrimitive.Group>
) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

/* ------------------------------------------------------------------ */
/* Value                                                              */
/* ------------------------------------------------------------------ */

function SelectValue(
  props: React.ComponentProps<typeof SelectPrimitive.Value>
) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

/* ------------------------------------------------------------------ */
/* Trigger                                                            */
/* ------------------------------------------------------------------ */

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default";
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        /* Layout */
        "group flex items-center justify-between gap-2",
        "data-[size=default]:h-9 data-[size=sm]:h-8",
        "px-3 rounded-xs",

        /* Surface */
        "bg-surface",
        "border border-border-default",

        /* Text */
        "text-sm text-text-primary",
        "data-placeholder:text-text-muted",

        /* Hover */
        "hover:border-border-strong",

        /* Focus */
        "focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-state-focus/30",
        "focus-visible:border-state-focus",

        /* OPEN STATE (dropdown visible) ⭐ */
        "data-[state=open]:border-state-focus",
        "data-[state=open]:ring-2",
        "data-[state=open]:ring-state-focus/30",

        /* Disabled */
        "disabled:opacity-50 disabled:cursor-not-allowed",

        /* Animation */
        "transition-colors",

        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 transition-transform duration-200 ease-out group-data-[state=open]:rotate-180" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

/* ------------------------------------------------------------------ */
/* Content                                                            */
/* ------------------------------------------------------------------ */

function SelectContent({
  className,
  children,
  position = "popper",
  align = "start",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position={position}
        align={align}
        className={cn(
          "z-50 min-w-30",
          /* Surface */
          "bg-surface",
          "border border-border-default",
          "rounded-xs shadow-lg",

          /* Animation */
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",

          /* Layout */
          "max-h-60 overflow-y-auto p-1",

          className
        )}
        {...props}
      >
        <div>
          <span
            className={cn(
              "size-2 absolute pointer-events-none border-border-strong",
              "top-1 left-1 border-t-2 border-l-2"
            )}
          />
          <span
            className={cn(
              "size-2 absolute pointer-events-none border-border-strong",
              "top-1 right-1 border-t-2 border-r-2"
            )}
          />
          <span
            className={cn(
              "size-2 absolute pointer-events-none border-border-strong",
              "bottom-1 left-1 border-b-2 border-l-2"
            )}
          />
          <span
            className={cn(
              "size-2 absolute pointer-events-none border-border-strong",
              "bottom-1 right-1 border-b-2 border-r-2"
            )}
          />
        </div>
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport className="p-2">
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

/* ------------------------------------------------------------------ */
/* Label                                                              */
/* ------------------------------------------------------------------ */

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn(
        "px-2 py-1 text-xs font-medium",
        "text-text-muted",
        className
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Item                                                               */
/* ------------------------------------------------------------------ */

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        /* Layout */
        "relative flex items-center rounded-md px-2 py-1.5 text-sm hover:cursor-pointer",

        /* Text */
        "text-text-primary",

        /* Hover / Focus */
        "focus:bg-state-hover focus:outline-none",

        /* Selected */
        "data-[state=checked]:bg-accent-muted/30",
        "data-[state=checked]:text-accent-primary",

        /* Disabled */
        "data-disabled:opacity-50 data-disabled:pointer-events-none",

        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>

      <SelectPrimitive.ItemIndicator className="absolute right-2">
        <CheckIcon className="text-accent-primary size-4" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

/* ------------------------------------------------------------------ */
/* Separator                                                          */
/* ------------------------------------------------------------------ */

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("my-1 h-px", "bg-border-muted", className)}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Scroll Buttons                                                     */
/* ------------------------------------------------------------------ */

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "flex items-center justify-center py-1",
        "text-text-muted",
        className
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "flex items-center justify-center py-1",
        "text-text-muted",
        className
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}

/* ------------------------------------------------------------------ */
/* Exports                                                            */
/* ------------------------------------------------------------------ */

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
