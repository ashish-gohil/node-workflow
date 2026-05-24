# CLAUDE.md — FLOW Workflow Automation Project

This is a node-based workflow automation platform using the **FLOW design system** — a Swiss-style, dark-mode-first system built on React 18, Next.js (App Router), Tailwind CSS v4, and Radix UI primitives.

---

## Project layout

```
apps/
├── frontend/                 Next.js 15 · React Flow editor · Tailwind v4
├── api/                      Express on Lambda — workflow CRUD, webhook reg, manual run
├── cron-workflow-poller/     EventBridge Lambda — queues due workflows
└── workflow-executor/        SQS Lambda — runs the DAG (honors IF branching)

packages/
├── types/                    Pure-TS shared types (NO Mongoose — frontend uses these)
├── db/                       Mongoose models + connection singleton
└── auth/                     JWT middleware
```

For backend/service work, read the matching per-service CLAUDE.md FIRST — they have
the entry points, build/deploy commands, contracts, and gotchas without you needing
to grep:

- `apps/api/CLAUDE.md`
- `apps/cron-workflow-poller/CLAUDE.md`
- `apps/workflow-executor/CLAUDE.md`
- `packages/db/CLAUDE.md`
- `packages/types/CLAUDE.md`

The rest of THIS file is the **frontend** rulebook (design system).

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

## Reference docs (read on demand)

These tables don't change session to session — load them only when you need them:

- **Semantic tokens** (`bg-bg-*`, `text-text-*`, `border-border-*`, `bg-accent-*`, `shadow-*`, status colors, palette classes) → `.claude/docs/flow-tokens.md`
- **Custom utility classes** (`card-surface`, `btn-stamp-*`, `section-container`, marketing/landing) → `.claude/docs/flow-utilities.md`
- **Typography classes** (`text-display-*`, `text-h*`, `text-body-*`, `text-mono-*`, font + tabular-nums rules) → `.claude/docs/flow-typography.md`
- **Theme hex values + theme rules** (dark / light / brutalist token map) → `.claude/docs/flow-themes.md`

Rule of thumb: if you're about to invent a class name or hardcode a hex, read the relevant doc first.

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
- Split each page region (header, sidebar, panel, FAB, controls) into its own co-located file. Page = thin composition layer.

---

## Compact instructions

When auto-compaction fires, preserve:

1. The three rules above (no style tags / no `[var()]` / reuse components) and the hard no-list.
2. The reference-doc pointers in this file — agents must know `.claude/docs/flow-*.md` exist.
3. The current task's file paths, the user's last decision, and any unresolved errors.
4. Any in-progress component split (which files were extracted, which still need extraction).

Drop: chat-level reasoning, intermediate exploration, output that's already in the diff.
