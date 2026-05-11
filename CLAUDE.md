# CLAUDE.md — FLOW Workflow Automation Project

This is a node-based workflow automation platform using the **FLOW design system** — a Swiss-style, dark-mode-first system built on React 18, Next.js (App Router), Tailwind CSS v4, and Radix UI primitives.

---

## Project layout

```
apps/frontend/          — Next.js app (main UI)
  app/                  — App Router pages
  components/ui/        — All reusable UI components
  design-system/        — Design system documentation + rules
apps/backend/           — Node.js backend
```

---

## Before writing any frontend code

**Read these files first — no exceptions:**

1. `apps/frontend/design-system/CLAUDE.md` — agent rules and hard constraints
2. `apps/frontend/design-system/DESIGN_SYSTEM.md` — color, type, spacing, motion foundations
3. `apps/frontend/app/globals.css` — all CSS custom properties and utility classes (source of truth)
4. `apps/frontend/components/ui/` — existing components to reuse, not reinvent

---

## The three rules that matter most

### 1. No style tags. No inline styles. Tailwind only.

```tsx
// WRONG — never do this
<div style={{ backgroundColor: 'var(--bg-canvas)' }}>
<div style={{ color: '#4fc97a' }}>
<style>{`.foo { color: red }`}</style>

// CORRECT — always this
<div className="bg-bg-canvas">
<div className="text-accent-primary">
```

### 2. Use semantic Tailwind classes, not CSS variable wrappers

Tailwind v4 maps CSS custom properties to utility classes directly. **Never wrap a variable in `[]`:**

```tsx
// WRONG
<div className="bg-[var(--color-bg-canvas)]">
<div className="text-[var(--color-text-primary)]">
<div className="border-[var(--color-border-subtle)]">

// CORRECT — clean semantic names
<div className="bg-bg-canvas">
<div className="text-text-primary">
<div className="border-border-subtle">
```

### 3. Reuse existing components — never reinvent

Before writing any UI element, check `components/ui/`. Every core primitive exists:
`Button`, `Card`, `Input`, `Textarea`, `Badge`, `Select`, `Dialog`, `Sheet`, `Toggle`, `Tooltip`, `Avatar`.

---

## Complete semantic token → Tailwind class reference

All of these are theme-aware: they automatically adapt for dark / light / brutalist.

### Backgrounds

| Tailwind class   | When to use                                       |
|------------------|---------------------------------------------------|
| `bg-bg-canvas`   | Page base / infinite canvas                       |
| `bg-bg-surface`  | Cards, panels, sidebars                           |
| `bg-bg-elevated` | Dropdowns, popovers, raised cards                 |
| `bg-bg-overlay`  | Modals, drawers                                   |
| `bg-bg-inset`    | Inset wells (code blocks, inputs, inner regions)  |

### Text

| Tailwind class      | When to use                            |
|---------------------|----------------------------------------|
| `text-text-primary` | Body copy, headings, default text      |
| `text-text-secondary` | Supporting labels, descriptions      |
| `text-text-muted`   | Placeholder, icon labels, timestamps  |
| `text-text-disabled` | Inactive / disabled states           |
| `text-text-brand`   | Brand-colored text, links             |

### Borders

| Tailwind class        | When to use                        |
|-----------------------|------------------------------------|
| `border-border-subtle`  | Dividers, faint section breaks   |
| `border-border-default` | Default element borders          |
| `border-border-strong`  | Emphasized / active borders      |
| `border-border-intense` | High-contrast borders            |
| `border-border-focus`   | Focus rings on interactive elems |
| `border-border-brand`   | Brand-colored borders            |
| `border-border-stamp`   | Stamp button / card borders      |

### Accents

| Tailwind class       | When to use                             |
|----------------------|-----------------------------------------|
| `bg-accent-primary`  | Primary action background (CTA)         |
| `bg-accent-hover`    | Hover state of primary actions          |
| `bg-accent-press`    | Active/pressed state                    |
| `bg-accent-subtle`   | Tinted background for selected items    |
| `text-accent-primary` | Brand-colored icons or text           |
| `text-accent-on`     | Text on top of accent background        |

### Shadows

| Tailwind class       | When to use                             |
|----------------------|-----------------------------------------|
| `shadow-sm`          | Subtle lift (default)                   |
| `shadow-md`          | Elevated panels                         |
| `shadow-lg`          | Modals, overlays                        |
| `shadow-xl`          | Toasts, highest elevation               |
| `shadow-glow-brand`  | Active node / selected state glow       |
| `shadow-glow-error`  | Error highlight glow                    |
| `shadow-card`        | Card with left-edge accent              |
| `shadow-overlay`     | Drawer / sheet accent shadow            |

### Semantic status colors (static, theme-independent)

| Tailwind class       | Value     |
|----------------------|-----------|
| `text-success`       | `#52B788` |
| `bg-success-surface` | `rgba(82, 183, 136, 0.12)` |
| `text-error`         | `#E5484D` |
| `bg-error-surface`   | `rgba(229, 72, 77, 0.12)` |
| `text-warning`       | `#F5A524` |
| `bg-warning-surface` | `rgba(245, 165, 36, 0.12)` |
| `text-info`          | `#5EB1EF` |
| `bg-info-surface`    | `rgba(94, 177, 239, 0.12)` |

---

## Custom utility classes (defined in globals.css)

These are `@utility` classes — use them as plain Tailwind classes, no prefix needed.

### Surfaces

| Class             | What it does                                           |
|-------------------|--------------------------------------------------------|
| `card-surface`    | Elevated bg + 1.5px border-stamp + 2px hard shadow     |
| `overlay-surface` | Elevated bg + 1.5px border-stamp + 3px hard shadow     |

### Stamp button states

| Class                   | What it does                            |
|-------------------------|-----------------------------------------|
| `btn-stamp`             | Base Swiss hard-shadow button           |
| `btn-stamp-hover`       | Translate (1,1) + shrink shadow         |
| `btn-stamp-active`      | Translate (2,2) + remove shadow         |
| `btn-stamp-primary`     | Accent background + text                |
| `btn-stamp-primary-hover` | Accent hover background              |
| `btn-stamp-ghost`       | Transparent + no shadow                 |
| `btn-stamp-ghost-hover` | Faint bg + stronger border              |
| `stamp-lg`              | 6px hard shadow (CTA / hero)            |
| `stamp-xl`              | 8px hard shadow (hero highlight)        |

### Layout

| Class                    | What it does                  |
|--------------------------|-------------------------------|
| `section-container`      | Max 1280px centered container |
| `section-container-wide` | Max 1440px centered container |
| `rounded-node`           | 4px radius (workflow nodes only) |

### Marketing / landing

| Class              | What it does                             |
|--------------------|------------------------------------------|
| `bento-card`       | Marketing card with hard-shadow hover    |
| `bento-card-hover` | Lifts card (-1,-1) + expands shadow      |
| `landing-eyebrow`  | Uppercase eyebrow label (brand color)    |
| `terminal-surface` | Dark terminal with mono font             |
| `cta-panel`        | Deep dark bg (dark: near-black, light: forest) |

---

## Typography classes

| Tailwind class   | Size / Use                                    |
|------------------|-----------------------------------------------|
| `text-display-xl` | 56px — hero headlines                        |
| `text-display-lg` | 44px — section headlines                     |
| `text-h1`        | 32px — page titles                            |
| `text-h2`        | 24px — section headings                       |
| `text-h3`        | 20px — card titles                            |
| `text-h4`        | 17px — widget headings                        |
| `text-h5`        | 14px — compact headings                       |
| `text-h6`        | 12px / +0.04em tracking — eyebrow labels, uppercase |
| `text-body-lg`   | 16px — lead paragraphs                        |
| `text-body-md`   | 14px — default body                           |
| `text-body-sm`   | 13px — secondary text, captions              |
| `text-caption`   | 12px — timestamps, meta, tiny labels         |
| `text-mono-md`   | 13px mono — IDs, env vars, code              |
| `text-mono-sm`   | 12px mono — inline code, hashes             |

**Typography rules:**
- `font-sans` (Inter) for all UI text
- `font-mono` (JetBrains Mono) for IDs, hashes, timestamps, code, env vars, numbers in tables
- Always add `tabular-nums` to numbers in aligned columns
- `text-h6 uppercase tracking-wider` for all section / field labels

---

## Color theme awareness

The app uses three themes via `[data-theme="dark|light|brutalist"]` on `<html>`.

| Token            | Dark (`#0A0E0C` canvas) | Light (`#F2EDE0` canvas) | Brutalist (marketing) |
|------------------|-------------------------|--------------------------|-----------------------|
| `bg-bg-canvas`   | `#0A0E0C`               | `#F2EDE0`                | `#F5EFE0`             |
| `bg-bg-surface`  | `#101512`               | `#FAF7F0`                | `#FFFFFF`             |
| `bg-bg-elevated` | `#161C18`               | `#FFFFFF`                | `#FFFFFF`             |
| `text-text-primary` | `#FAF7F0` (cream)    | `#0E2B1C` (forest dark)  | `#0A0E0C`             |
| `text-text-muted` | `#7A8881`              | `#5A675F`                | `#5A675F`             |
| `border-border-default` | `rgba(255,255,255,0.18)` | `rgba(14,43,28,0.18)` | `#0A0E0C` (solid) |
| `bg-accent-primary` | `#4FC97A`            | `#4FC97A`                | `#C5F4A5` (lime)      |
| Hard shadow      | `#1F4D38`               | `#0E2B1C`                | `#000000`             |
| Shadow style     | Subtle multi-layer      | Subtle, less blur        | Hard offset, no blur  |

**Theme rules:**
- Component code never needs to branch on theme — use semantic tokens and the CSS does the work
- Shadows switch automatically (`shadow-sm` is subtle in dark/light, hard-offset in brutalist)
- Brutalist theme is **only for marketing pages** (`data-theme="brutalist"`), never in the app shell

---

## Palette classes (use sparingly — prefer semantic tokens)

Only use raw palette classes when semantic tokens don't cover your case:

```
Forest: bg-forest-{50|100|200|300|400|500|600|700|800|900}
Cream:  bg-cream-{50|100|200|300|400}
Lime:   bg-lime-{50|100|200|300|400|500|600|700}  ← brutalist only
Neutral: bg-neutral-{0|50|100|200|300|400|500|600|700|800}
```

---

## Hard no-list

| Never do this                              | Do this instead                     |
|--------------------------------------------|-------------------------------------|
| `style={{ color: 'var(--text-primary)' }}` | `className="text-text-primary"`     |
| `<style>{ `.foo { ... }` }</style>`        | Tailwind class or `@utility` in globals.css |
| `bg-[var(--color-accent-primary)]`         | `bg-accent-primary`                 |
| `text-[var(--color-text-muted)]`           | `text-text-muted`                   |
| `rounded-lg`, `rounded-xl`, `rounded-2xl` | `rounded-none` (0px), `rounded-node` (4px nodes only) |
| `rounded-full` on buttons                  | Only on notification dots           |
| `bg-blue-500`, `text-indigo-600`           | `bg-accent-primary`, `text-forest-500` |
| Hardcoded hex in `className`               | Named token class                   |
| `shadow-2xl`, generic heavy shadows        | `shadow-lg`, `shadow-overlay`       |
| Gradient backgrounds on cards/panels       | Flat surfaces with subtle border    |
| `text-center` in lists / dashboards        | `text-left` (text) + `text-right` (numbers) |
| Framer Motion, GSAP, or animation libs     | CSS transitions with `duration-fast/base/slow` |
| `border-gray-*` or `bg-gray-*`             | Semantic border / bg tokens         |

---

## File conventions

- New UI component → `apps/frontend/components/ui/<Name>.tsx`
- New page → `apps/frontend/app/<route>/page.tsx`
- One component per file unless tightly coupled (e.g. trigger + content)
- Import from `@/components/ui/<name>`, not relative paths from pages
- Use `cn()` from `@/lib/utils` for conditional class merging (never string concatenation)
