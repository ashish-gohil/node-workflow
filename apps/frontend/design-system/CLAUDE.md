# CLAUDE.md — Agent rules for FLOW design system

You are working inside a project that uses the FLOW design system. Read this file BEFORE generating any UI. This is the source of truth for _how to behave_; the rest of this folder is the source of truth for _what to produce_.

---

## Your job

Generate UI (React + Tailwind CSS) that exactly matches the FLOW design system. Treat `design-system/` as a hard contract: tokens, components, and patterns defined there are the only valid building blocks. Do not invent new visual patterns — follow what exists.

---

## Read order — always, before generating

1. **`design-system/CLAUDE.md`** (this file) — behavior rules
2. **`design-system/DESIGN_SYSTEM.md`** — color, type, spacing, motion foundations
3. **`app/globals.css`** — CSS custom properties + `@utility` classes (authoritative token values)
4. **`design-system/components/{relevant}.md`** — for any component you're rendering
5. **`design-system/patterns/{relevant}.md`** — for any full layout
6. **`design-system/icons.md`** — icon usage rules

If a relevant file doesn't exist, say so and propose adding it — don't invent.

---

## CRITICAL: Tailwind class rules

### Rule 1 — No style tags. No inline styles. Tailwind only.

```tsx
// WRONG — never
<div style={{ backgroundColor: 'var(--bg-canvas)' }}>
<div style={{ color: '#4fc97a' }}>
<style>{`.foo { color: red }`}</style>

// CORRECT
<div className="bg-bg-canvas">
<div className="text-accent-primary">
```

### Rule 2 — Use semantic class names, never CSS variable wrappers

Tailwind v4 maps `--color-*` properties to utility classes automatically. **Never use `[var(--...)]` syntax.**

```tsx
// WRONG — verbose and brittle
<div className="bg-[var(--color-bg-canvas)]">
<p className="text-[var(--color-text-primary)]">
<div className="border-[var(--color-border-subtle)]">

// CORRECT — clean, readable, theme-aware
<div className="bg-bg-canvas">
<p className="text-text-primary">
<div className="border-border-subtle">
```

### Rule 3 — Use custom utilities as plain classes

`@utility` rules defined in `globals.css` are usable as plain Tailwind classes:

```tsx
// CORRECT
<article className="card-surface relative overflow-hidden">
<button className="btn-stamp btn-stamp-primary hover:btn-stamp-hover">
<div className="overlay-surface p-6">
```

---

## Complete semantic token → Tailwind class map

### Backgrounds (theme-aware)

| Class              | Role                                              |
|--------------------|---------------------------------------------------|
| `bg-bg-canvas`     | Page base / infinite canvas                       |
| `bg-bg-surface`    | Cards, panels, sidebars                           |
| `bg-bg-elevated`   | Dropdowns, popovers, raised cards                 |
| `bg-bg-overlay`    | Modals, drawers                                   |
| `bg-bg-inset`      | Inset wells (code blocks, inputs, inner regions)  |

### Text (theme-aware)

| Class                | Role                                          |
|----------------------|-----------------------------------------------|
| `text-text-primary`  | Body copy, headings, default text             |
| `text-text-secondary`| Supporting labels, descriptions               |
| `text-text-muted`    | Placeholders, icon labels, timestamps         |
| `text-text-disabled` | Inactive / disabled states                    |
| `text-text-brand`    | Brand-colored text, inline links              |

### Borders (theme-aware)

| Class                   | Role                               |
|-------------------------|------------------------------------|
| `border-border-subtle`  | Dividers, faint section breaks     |
| `border-border-default` | Default element borders            |
| `border-border-strong`  | Emphasized / active borders        |
| `border-border-intense` | High-contrast borders              |
| `border-border-focus`   | Focus rings on interactive elements|
| `border-border-brand`   | Brand-colored borders              |
| `border-border-stamp`   | Stamp button / card outer border   |

### Accent (theme-aware)

| Class                | Role                                       |
|----------------------|--------------------------------------------|
| `bg-accent-primary`  | Primary action background (CTA fill)       |
| `bg-accent-hover`    | Hover state of primary actions             |
| `bg-accent-press`    | Active / pressed state                     |
| `bg-accent-subtle`   | Tinted bg for selected items, hover rows   |
| `text-accent-primary`| Brand-colored icon or text                 |
| `text-accent-on`     | Text on top of accent-primary background   |

### Shadows (theme-aware)

| Class               | Role                                      |
|---------------------|-------------------------------------------|
| `shadow-sm`         | Subtle lift (default surface)             |
| `shadow-md`         | Elevated panels                           |
| `shadow-lg`         | Modals, overlays                          |
| `shadow-xl`         | Toasts, highest elevation                 |
| `shadow-glow-brand` | Active node / selected state glow         |
| `shadow-glow-error` | Error highlight glow                      |
| `shadow-card`       | Card with 2px left-edge accent inset      |
| `shadow-overlay`    | Drawer / sheet accent + depth shadow      |

### Semantic status (static — same across all themes)

| Class               | Value                       |
|---------------------|-----------------------------|
| `text-success`      | `#52B788`                   |
| `bg-success-surface`| `rgba(82,183,136,0.12)`     |
| `text-error`        | `#E5484D`                   |
| `bg-error-surface`  | `rgba(229,72,77,0.12)`      |
| `text-warning`      | `#F5A524`                   |
| `bg-warning-surface`| `rgba(245,165,36,0.12)`     |
| `text-info`         | `#5EB1EF`                   |
| `bg-info-surface`   | `rgba(94,177,239,0.12)`     |

---

## Custom utility classes (from globals.css @utility)

### Surface utilities

```tsx
className="card-surface"    // bg-elevated + 1.5px border + 2px hard shadow
className="overlay-surface" // bg-elevated + 1.5px border + 3px hard shadow
```

### Stamp button states

```tsx
className="btn-stamp"               // Base hard-shadow button
className="btn-stamp-hover"         // translate(1,1) + shrink shadow
className="btn-stamp-active"        // translate(2,2) + remove shadow
className="btn-stamp-primary"       // Accent fill + accent-on text
className="btn-stamp-primary-hover" // Accent hover fill
className="btn-stamp-ghost"         // Transparent + no shadow
className="btn-stamp-ghost-hover"   // Faint bg + stronger border
className="stamp-lg"                // 6px hard shadow
className="stamp-xl"                // 8px hard shadow
```

### Layout

```tsx
className="section-container"       // Max 1280px, auto margins, 32px padding
className="section-container-wide"  // Max 1440px, auto margins, 32px padding
className="rounded-node"            // 4px — workflow canvas nodes ONLY
```

### Marketing / landing only

```tsx
className="bento-card"              // Card with hard-shadow hover lift
className="landing-eyebrow"         // Uppercase eyebrow label in brand color
className="terminal-surface"        // Dark mono terminal block
className="cta-panel"               // Deep dark bg (auto-adapts light/dark)
```

---

## Typography classes

| Class           | Size  | Use                                           |
|-----------------|-------|-----------------------------------------------|
| `text-display-xl` | 56px | Hero headlines                               |
| `text-display-lg` | 44px | Section headlines                            |
| `text-h1`       | 32px  | Page titles                                   |
| `text-h2`       | 24px  | Section headings                              |
| `text-h3`       | 20px  | Card / widget titles                          |
| `text-h4`       | 17px  | Sub-headings                                  |
| `text-h5`       | 14px  | Compact headings                              |
| `text-h6`       | 12px  | Eyebrow labels — always pair with `uppercase tracking-wider` |
| `text-body-lg`  | 16px  | Lead paragraphs                               |
| `text-body-md`  | 14px  | Default body text                             |
| `text-body-sm`  | 13px  | Secondary / caption text                      |
| `text-caption`  | 12px  | Timestamps, meta, tiny labels                 |
| `text-mono-md`  | 13px  | IDs, env vars, inline code (use `font-mono`)  |
| `text-mono-sm`  | 12px  | Hashes, compact code (use `font-mono`)        |

**Typography rules:**
- `font-sans` (Inter) for all UI text
- `font-mono` (JetBrains Mono) for IDs, hashes, numbers in tables, code, env vars
- `tabular-nums` on every numeric value in aligned columns
- Labels: `text-h6 text-text-secondary uppercase tracking-wider`

---

## Color theme awareness

All semantic token classes auto-adapt. No `dark:` or `[data-theme]` prefixes needed in component code.

| Semantic token         | Dark theme          | Light theme         | Brutalist (marketing) |
|------------------------|---------------------|---------------------|-----------------------|
| `bg-bg-canvas`         | `#0A0E0C`           | `#F2EDE0`           | `#F5EFE0`             |
| `bg-bg-surface`        | `#101512`           | `#FAF7F0`           | `#FFFFFF`             |
| `bg-bg-elevated`       | `#161C18`           | `#FFFFFF`           | `#FFFFFF`             |
| `text-text-primary`    | `#FAF7F0` cream     | `#0E2B1C` forest    | `#0A0E0C`             |
| `text-text-secondary`  | `#A1ADA6`           | `#3A4540`           | `#1F2925`             |
| `text-text-muted`      | `#7A8881`           | `#5A675F`           | `#5A675F`             |
| `border-border-default`| `rgba(255,255,255,0.18)` | `rgba(14,43,28,0.18)` | `#0A0E0C` solid |
| `bg-accent-primary`    | `#4FC97A` mint      | `#4FC97A` mint      | `#C5F4A5` lime        |
| Shadow style           | Subtle multi-layer  | Subtle, light       | Hard offset, no blur  |

**What this means for you:**
- Write one component. It works in all three themes automatically.
- Never put theme-specific colors in component code — use semantic tokens.
- The **only** exception: `cta-panel` is declared in globals.css with a `[data-theme="light"]` override already baked in.

---

## Three themes

| Theme         | `data-theme` | Surface                | When to use                         |
|---------------|-------------|------------------------|-------------------------------------|
| **Dark**      | `"dark"` (default) | Near-black `#0A0E0C` | App shell, dashboard, editor, settings |
| **Light**     | `"light"`   | Cream `#F2EDE0`        | User preference (same app surfaces) |
| **Brutalist** | `"brutalist"` | Off-white, dot grid  | Marketing pages, landing, pricing   |

Brutalist-only differences:
- All borders become 2px solid `#0A0E0C` (black)
- Accent changes from mint to lime (`#C5F4A5`)
- All shadows become hard offset (e.g. `4px 4px 0 0 #000`) — no blur
- `stamp-xl` / `stamp-lg` classes produce much more pronounced offsets

---

## Hard rules — never violate

| Rule | Detail |
|------|--------|
| **Boxy** | Max `rounded-none` (0px) on all UI. Only `rounded-node` (4px) on workflow canvas nodes. `rounded-full` only on notification dots and avatar images. |
| **Color discipline** | Forest + cream + neutrals + semantic only. Lime only in brutalist. Never Tailwind blue / indigo / purple / gray. Never hardcoded hex in `className`. |
| **Typography** | Inter for UI. JetBrains Mono for IDs / numbers / code. `tabular-nums` on all aligned numerics. |
| **Borders** | Dark/light: 1px white-alpha or dark-alpha tokens. Brutalist: 2px solid black always. Never `border-gray-*`. |
| **Shadows** | Subtle multi-layer in dark/light. Hard offset in brutalist. Never `shadow-2xl`. Never mix shadow languages on one page. |
| **Status accents on cards** | `box-shadow: inset 2px 0 0 0 <color>` — NOT `border-left`. Use `shadow-card` or apply manually. |
| **Active nav** | 2px left-edge accent on sidebar items. 2px bottom border on tab items. |
| **Spacing** | 4px base, 8px rhythm. Default gaps: 16px / 24px. 12-col grid for layouts. |
| **Layout** | Swiss: left-align text, right-align numeric columns. Never `text-center` in dashboards / lists. |
| **No style tags** | Zero `<style>` elements, zero `style={}` props. All styling through Tailwind classes. |
| **No `[var()]`** | Never `bg-[var(--color-...)]`. Use the semantic class name directly. |

---

## Decision tree

When asked to build UI:

1. **Identify surface type.** In-product (dashboard, table, form, editor)? → Dark theme + standard treatments. Marketing (landing, pricing, hero)? → Brutalist theme + stamp treatments.
2. **Pick the pattern.** App shell → `patterns/app-shell.md`. Dashboard → `patterns/dashboard.md`. Form → `patterns/forms.md`. Empty state → `patterns/empty-states.md`.
3. **For each component,** check `components/ui/` for an existing implementation. Use it; don't rewrite it.
4. **For copy,** be terse. No marketing fluff in product UI. No "Oops!" in error states.
5. **For empty states,** always include all three variants: true empty / filtered / error.

---

## Component selection cheatsheet

| Need                        | Use                                             |
|-----------------------------|-------------------------------------------------|
| Primary action              | `<Button variant="primary">`                   |
| Secondary / toolbar action  | `<Button variant="secondary">` / `variant="ghost"` |
| Destructive action          | `<Button variant="destructive">`               |
| KPI / metric                | `<StatCard>` (mono + tabular-nums value)        |
| Resource list item          | `<ListCard>` or `<tr>` in a table              |
| Confirmation dialog         | `<Dialog>` with `<DialogContent>`              |
| Inspect while editing       | `<Sheet>` (right-anchored drawer)              |
| Status indicator            | `<Badge variant="success|error|warning|running|queued">` |
| ID / hash / version         | `<Badge variant="mono">`                       |
| Keyboard shortcut           | `<Badge variant="kbd">`                        |
| Tag / category              | `<Badge variant="outline">`                    |
| Dropdown picker             | `<Select>` (Radix-based)                       |
| Marketing feature card      | `<StampCard>`                                  |
| Settings section            | `<SettingsCard>`                               |
| Empty / first-run state     | `<EmptyCard>`                                  |

---

## Code defaults

- **Framework:** React 18+ functional components with hooks
- **Styling:** Tailwind CSS classes only — never `style={}`, never `<style>`
- **Class merging:** `cn()` from `@/lib/utils` for conditional classes
- **Icons:** Lucide (`lucide-react`). `size-4` (16px) default, `strokeWidth={1.5}`
- **Accessibility:** Semantic HTML, `aria-label` on icon-only buttons, keyboard support, focus rings
- **State:** `useState` / `useReducer` — no global state libraries for component demos

---

## What to produce

- **Single self-contained file** unless asked for multi-file
- **Real semantic content** — no Lorem ipsum; use workflow automation domain copy (workflows, executions, nodes, pipelines, integrations, triggers, credentials)
- **Wire up interactions** — toggles toggle, dropdowns open, tabs switch. Use `useState`.
- **Show all key states** — default, hover, active/selected, disabled, empty, loading, error

---

## What to avoid

- Gradient backgrounds on cards
- `rounded-lg` or larger on any UI surface
- `shadow-2xl` or other heavy soft shadows
- Mixing Inter with another sans-serif
- Emoji as functional icons
- Framer Motion or heavy animation libraries
- `text-center` on dashboard / list / table content
- Tailwind's default blue / indigo / purple palettes
- 500-line files when 150 will do — be precise

---

## When encountering undefined patterns

Follow the same visual rules: 0px radius, 1px white-alpha borders, forest accent, mono-tabular numbers, subtle shadow. Then propose adding `design-system/components/<name>.md` for future reference.

---

## Quick checklist before submitting any UI

- [ ] Read the relevant component + pattern markdown
- [ ] Used semantic tokens — no hardcoded hex, no `[var()]` wrappers, no `style={}`
- [ ] No `<style>` tags anywhere
- [ ] Border-radius within limits (0px UI · 4px nodes only · `rounded-full` notification dots only)
- [ ] All aligned numbers in `font-mono tabular-nums`
- [ ] Labels use `text-h6 uppercase tracking-wider text-text-secondary`
- [ ] Active states have 2px accent (left edge nav · bottom border tabs · inset shadow cards)
- [ ] Empty / loading / error states considered
- [ ] Icon-only buttons have `aria-label`
- [ ] No blue, no gradients (except explicit hero radial), no pure black/white in dark mode components
- [ ] One shadow language per page (subtle OR stamp, not both)
- [ ] Real domain content, not Lorem ipsum
- [ ] Accessible: semantic HTML, focus rings, `prefers-reduced-motion` respected
