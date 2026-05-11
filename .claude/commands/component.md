# /component — Generate a new FLOW design system component

Generate a new UI component for the FLOW design system. This command reads the design system rules and produces a properly styled, accessible React component.

---

## What to read before generating

1. `apps/frontend/design-system/CLAUDE.md` — all rules and token reference
2. `apps/frontend/app/globals.css` — CSS custom properties and @utility classes
3. `apps/frontend/components/ui/` — existing components (reuse, don't reinvent)
4. The relevant `apps/frontend/design-system/components/*.md` if one exists for this component type

---

## Output location

`apps/frontend/components/ui/<ComponentName>.tsx`

---

## Code rules (enforce all)

### Class rules
- Use semantic Tailwind classes: `bg-bg-canvas`, `text-text-primary`, `border-border-subtle`, etc.
- Use custom utilities: `btn-stamp`, `card-surface`, `overlay-surface`, `stamp-lg`, etc.
- NEVER: `style={}`, `<style>` tags, `bg-[var(--...)]`, hardcoded hex in className
- NEVER: `rounded-lg` / `rounded-xl` / `rounded-2xl` — use `rounded-none`, `rounded-node` (nodes only)
- NEVER: Tailwind default colors (blue, indigo, purple, gray-*)

### Component structure
- React 18+ functional component with `forwardRef` if it wraps a DOM element
- Use CVA (`cva` from `class-variance-authority`) for variant management
- Merge classes with `cn()` from `@/lib/utils`
- One component per file unless sub-components are tightly coupled
- Export all sub-components and prop types

### Interactions
- Radix UI primitives for all interactive components (Select, Dialog, Popover, Tooltip, etc.)
- `data-[state=*]` selectors for open/closed/checked states — no JS class toggling
- Keyboard support via Radix (included automatically)
- `aria-label` on every icon-only button

### Variants to implement
Always include these states in the component or in the usage example below it:
- Default
- Hover (via `hover:*` Tailwind classes)
- Active / selected
- Disabled (`disabled:opacity-50 disabled:pointer-events-none`)
- Loading (if it's an action button)

---

## Token reference (quick)

### Backgrounds
`bg-bg-canvas` · `bg-bg-surface` · `bg-bg-elevated` · `bg-bg-overlay` · `bg-bg-inset`

### Text
`text-text-primary` · `text-text-secondary` · `text-text-muted` · `text-text-disabled` · `text-text-brand`

### Borders
`border-border-subtle` · `border-border-default` · `border-border-strong` · `border-border-focus` · `border-border-stamp`

### Accent
`bg-accent-primary` · `bg-accent-hover` · `bg-accent-press` · `bg-accent-subtle` · `text-accent-primary` · `text-accent-on`

### Shadows
`shadow-sm` · `shadow-md` · `shadow-lg` · `shadow-xl` · `shadow-glow-brand` · `shadow-card` · `shadow-overlay`

### Status
`text-success bg-success-surface` · `text-error bg-error-surface` · `text-warning bg-warning-surface` · `text-info bg-info-surface`

### Typography
`text-h1` through `text-h6` · `text-body-lg/md/sm` · `text-caption` · `text-mono-md/sm`
- Labels: `text-h6 uppercase tracking-wider text-text-secondary`
- Numbers: `font-mono tabular-nums`

### Surfaces
`card-surface` · `overlay-surface` · `btn-stamp` · `btn-stamp-primary` · `btn-stamp-ghost`

---

## Example output structure

```tsx
"use client"; // only if needed

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const componentVariants = cva(
  // base classes
  "inline-flex items-center gap-2 text-body-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-bg-elevated border-border-default text-text-primary border",
        accent:  "bg-accent-primary text-accent-on border-border-stamp border",
      },
      size: {
        sm: "h-8 px-3",
        default: "h-10 px-4",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

interface ComponentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof componentVariants> {
  // component-specific props
}

function ComponentName({
  className,
  variant,
  size,
  ...props
}: ComponentProps) {
  return (
    <div
      className={cn(componentVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { ComponentName };
```

---

## After generating

1. Check: does it pass the checklist in `design-system/CLAUDE.md`?
2. If this is a new pattern not in the design system, propose creating `design-system/components/<name>.md`
