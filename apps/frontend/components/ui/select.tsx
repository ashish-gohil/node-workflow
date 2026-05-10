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
        /* Stamp surface */
        "btn-stamp",
        "group justify-between data-[size=default]:h-10 data-[size=sm]:h-8",
        "text-body-sm px-3.5 font-medium",
        "data-placeholder:text-text-muted",

        /* Open state — depressed look */
        "data-[state=open]:btn-stamp-hover",

        /* Focus ring (keyboard nav) */
        "focus-visible:outline-none focus-visible:[border-color:var(--color-border-focus)]",

        /* Disabled */
        "disabled:cursor-not-allowed disabled:opacity-50",

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
        sideOffset={6}
        className={cn(
          "overlay-surface z-50 min-w-30 p-1.5",

          /* Animation */
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",

          /* Layout */
          "max-h-60 overflow-y-auto",

          className
        )}
        {...props}
      >
        <CornerIcons size="sm" />
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
        "focus:bg-accent-subtle focus:outline-none",

        /* Selected */
        "data-[state=checked]:bg-accent-subtle",
        "data-[state=checked]:text-text-brand",

        /* Disabled */
        "data-disabled:pointer-events-none data-disabled:opacity-50",

        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>

      <SelectPrimitive.ItemIndicator className="absolute right-2">
        <CheckIcon className="text-forest-300 size-4" />
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
      className={cn("my-1 h-px", "bg-border-subtle", className)}
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
