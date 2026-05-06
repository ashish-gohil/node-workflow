# FLOW Design System

A Swiss-style, dark-mode-first design system for a node-based workflow automation platform.
Drop this folder into Claude (Project knowledge, Claude Code, or any AI design tool) and reference it when generating UI.

---

## How to use this folder with AI

**When prompting an AI to build UI from this system, give it this instruction first:**

> Use the design system in this folder. Load `DESIGN_SYSTEM.md` for foundations, then `tokens.css` (or `tailwind.config.js` if using Tailwind) for the actual values. Reference the matching file in `components/` for anything you build, and the matching file in `patterns/` for any full layout. Stay boxy (radius ≤ 4px), dark-mode-first, forest-green + cream + neutrals only. No gradients except where specified. Inter for UI, JetBrains Mono for IDs/code/data.

---

## File map (read in this order)

```
design-system/
├── README.md                ← you are here
├── CLAUDE.md                ← agent rules for Claude Code (read first in any project)
├── .cursorrules             ← Cursor-specific rules (auto-loaded by Cursor)
├── DESIGN_SYSTEM.md         ← foundations (colors, type, spacing, motion)
├── tokens.json              ← machine-readable design tokens
├── tokens.css               ← drop-in CSS custom properties (dark + light + brutalist)
├── tailwind.config.js       ← Tailwind v3+ config with all tokens mapped
├── icons.md                 ← icon library, sizes, stroke, usage
├── ai-prompts.md            ← prompt templates for generating UI from this system
│
├── components/              ← reusable building blocks
│   ├── buttons.md           ← incl. stamped/brutalist variant
│   ├── cards.md             ← incl. stamped/brutalist variant + workflow node
│   ├── inputs.md            ← text, select, combobox, textarea, mono input
│   ├── tables.md
│   ├── modals-drawers.md
│   ├── badges-tags.md
│   └── navigation.md        ← incl. brutalist black-panel dropdown
│
├── patterns/                ← composed layouts
    ├── app-shell.md         ← the workflow editor frame
    ├── dashboard.md
    ├── forms.md
    └── empty-states.md

```

---

## TL;DR cheat sheet

**Colors (dark mode defaults)**
- Canvas: `#0A0E0C` — surface: `#101512` — elevated: `#161C18` — overlay: `#1D241F`
- Primary text: `#FAF7F0` (cream) — secondary: `#A1ADA6` — muted: `#7A8881`
- Brand: `#2D6A4F` (forest.500) — hover `#4A9163` — pressed `#1F5237`
- Borders: `rgba(255,255,255,0.06 | 0.10 | 0.16)` (subtle / default / strong)

**Type**
- Sans: `Inter` — Mono: `JetBrains Mono`
- Default body: 14px / 22 lh / 400
- Default heading weight: 600, tight tracking
- Numbers + IDs: `tabular-nums`, mono

**Spacing**
- 4px base, 8px primary rhythm
- Default gap: 16px — section gap: 32px — page gap: 48px

**Boxy rules**
- Max radius: 4px on UI, 8px on marketing cards, 0–2px on stamped/brutalist
- Status: 2px solid left-edge accent on cards
- Borders are 1px white-alpha (dark/light) or 2px solid black (brutalist)
- Shadows: subtle + inset highlight (dark) OR hard offset like `6px 6px 0 0 #000` (brutalist) — never mix on one page

**Three themes**
- `data-theme="dark"` (default) — app shell, dashboard, editor, in-product surfaces
- `data-theme="light"` — light-mode user preference within the app
- `data-theme="brutalist"` — marketing pages, landing, pricing, blog (cream + lime + black + stamp shadows)

**Don't**
- Gradients (unless explicitly speced for skeletons or progress)
- Border-radius > 8px
- Shadows + heavy borders together
- Pure black (`#000`) or pure white (`#FFF`)
- Soft rounded "consumer" feel

---

## Library version assumptions

- **React** 18+ (hooks, no class components)
- **Tailwind CSS** v3.4+ (or v4 — both work with `tokens.css`)
- **Lucide** for icons (`lucide-react`)
- **shadcn/ui** patterns are compatible — restyle with these tokens

---

## Quick start examples

### Plain HTML/CSS
```html
<link rel="stylesheet" href="./tokens.css">
<button class="btn-primary">Run workflow</button>
```

### Tailwind
```jsx
import './tokens.css'; // or extend in tailwind.config.js

<button className="bg-forest-500 hover:bg-forest-400 active:bg-forest-600
                   text-cream-50 px-4 h-9 rounded-sm text-sm font-medium
                   transition-colors duration-fast">
  Run workflow
</button>
```

### Reference for AI
> "Build a workflow node card per `components/cards.md` § Workflow Node, with status=success."