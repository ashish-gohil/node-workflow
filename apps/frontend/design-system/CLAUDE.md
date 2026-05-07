# CLAUDE.md — Agent rules for FLOW design system

You are working inside a project that uses the FLOW design system. Read this file BEFORE generating any UI. This file is the source of truth for _how to behave_; the rest of the folder is the source of truth for _what to produce_.

---

## Your job

Generate UI (React, HTML, Vue, plain CSS — whatever the project uses) that matches the FLOW design system. Treat the `design-system/` folder as a hard contract: tokens, components, and patterns defined there are the only valid building blocks.

## Read order — always, before generating

For any UI request, read these files in order. Do not skip. Do not guess.

1. **`design-system/DESIGN_SYSTEM.md`** — foundations (color, type, spacing, motion)
2. **`design-system/tokens.css`** OR **`design-system/tailwind.config.js`** — actual values to use
3. **`design-system/components/{relevant}.md`** — for any component you're rendering
4. **`design-system/patterns/{relevant}.md`** — for any full layout
5. **`design-system/icons.md`** — for any icon usage

If a relevant file doesn't exist, say so and propose adding one — don't invent.

## Three themes

The system supports three themes. Pick one per page based on context:

| Theme              | When to use                                                             | Key visual cue                                                                                                          |
| ------------------ | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Dark** (default) | App shell, dashboard, workflow editor, settings, any in-product surface | Near-black canvas (#0A0E0C), forest green accent, subtle shadows, white-alpha borders                                   |
| **Light**          | Light-mode user preference within the app                               | Cream canvas, dark forest accent, light shadows                                                                         |
| **Brutalist**      | Marketing pages, landing, pricing, blog, portfolio                      | Cream + dot-grid background, lime-200 accent, **2px solid black borders, hard offset shadows (no blur)**, big bold type |

Switch theme via `<html data-theme="dark|light|brutalist">` or class.

## Hard rules — never violate

- **Boxy.** Max border-radius is 4px on UI, 8px on marketing/non-stamped, 0–2px on stamped/brutalist. Never use `rounded-full` or `rounded-2xl` — only the notification dot is round.
- **Color discipline.** Forest green + cream + green-tinted neutrals + semantic. Lime is reserved for brutalist accents. Never blue accents, never gradients (except shimmer skeletons or one optional hero radial), never pure black/white in dark mode (use `#0A0E0C` and `#FAF7F0`).
- **Typography.** Inter for UI text, JetBrains Mono for IDs / numbers / code / env vars / hashes. All numbers in tabular columns get `tabular-nums`.
- **Borders.** Dark/light themes: 1px white-alpha or black-alpha tokens (never gray fills). Brutalist: 2px solid pure black always.
- **Shadows.** Dark/light: subtle, dark-tuned, often paired with inset top highlight. Brutalist: hard offset (e.g. `6px 6px 0 0 #000`), no blur. **Never mix the two languages on one page.**
- **Status accent on cards.** 2px solid left edge using `box-shadow: inset 2px 0 0 0 <color>` (preserves outer border). Not `border-left`.
- **Active nav.** 2px left edge accent on sidebar items; 2px bottom border on tabs.
- **Spacing.** 4px base, 8px primary rhythm, 16/24px gap defaults, 12-col grid.
- **Layout.** Swiss: left-align text, right-align numeric/tabular columns. Never center content for dashboards/lists.

## Decision tree

When asked to build UI:

1. **Identify the surface type.** Is it in-product (app shell, dashboard, table, form, canvas)? → Use **dark theme** + standard subtle treatments. Is it marketing (landing, pricing, hero, testimonial, blog post)? → Use **brutalist theme** + stamp treatments.
2. **Pick the relevant pattern.** App shell? → `patterns/app-shell.md`. Dashboard? → `patterns/dashboard.md`. Form? → `patterns/forms.md`. Empty? → `patterns/empty-states.md`.
3. **For each component you place,** open the component file and follow its variant + state matrix exactly.
4. **For copy,** be terse. No marketing fluff in product UI; no apologies in error states; no "Oops!".
5. **For empty states,** always include all three variants (true empty / filtered / error) per `patterns/empty-states.md`.

## Component selection cheatsheet

- Action with side effects → button (primary if it's THE action, secondary otherwise, ghost in toolbars)
- Hero CTA on marketing page → **stamped** button (lime + 2px black + stamp shadow)
- KPI / metric → stat card (mono-tabular numbers)
- Resource list item → list card or table row
- Workflow node → workflow node card (the signature component, see `components/cards.md`)
- Marketing feature / testimonial → **stamped card** (`components/cards.md` § 7)
- Confirmation / single decision → modal
- Inspect-while-editing → drawer
- Quick command → command palette (⌘K)

## Code defaults

- **Framework.** Default to React 18+ functional components. Plain HTML if the project is plain HTML. Match the existing project.
- **Styling.** Default to Tailwind CSS using `tailwind.config.js`. If no Tailwind, use `tokens.css` custom properties via vanilla CSS or a CSS-in-JS library.
- **Icons.** Lucide. Import from `lucide-react`. 1.5px stroke at 16/24px.
- **Accessibility.** Always: semantic HTML, `aria-label` on icon-only buttons, keyboard support, focus rings, `prefers-reduced-motion`.
- **No dependencies** beyond what's standard (React, Tailwind, Lucide). Don't add a UI library; this is a UI library.

## What to produce

- **Default to a single self-contained file** unless the user asks for a multi-file structure.
- **Use real, semantic content.** Never `Lorem ipsum` or `Title Title Title` placeholder text — use realistic copy that fits a workflow automation product (workflows, executions, nodes, pipelines, integrations).
- **Wire up state and interactions** when reasonable (toggles work, dropdowns open, tabs switch). Use `useState` / vanilla JS as appropriate — no global state libraries.
- **Show all key states** for any component you build (default + hover + active/selected + disabled where relevant) — include them in the same artifact as separate examples.

## What to avoid

- Don't add gradient backgrounds to cards
- Don't use `rounded-lg`+ on UI surfaces
- Don't use `shadow-2xl` or other heavy soft shadows
- Don't mix Inter and another sans-serif
- Don't use emoji as functional icons
- Don't add framer-motion or other heavy animation libraries unless requested
- Don't use `text-center` on dashboard / table content
- Don't use Tailwind's default blue/indigo/purple palettes
- Don't generate 500-line files when 100 will do — be precise

## When the user gives ambiguous direction

Ask one focused question OR pick the most likely interpretation and state your assumption. Never ask three questions at once. Default toward shipping, not consulting.

## When you encounter undefined patterns

If the user asks for something not covered (e.g. a calendar component, a data import wizard), follow the **same visual rules**: 4px radius, 1px white-alpha borders, forest accent, mono-tabular numbers, subtle shadow. Then propose adding a doc at `design-system/components/<name>.md` so the next person doesn't re-derive it.

## File generation conventions

- New component file → `src/components/<Name>.tsx` (or `.jsx`)
- New page file → `src/pages/<name>.tsx` or `app/<name>/page.tsx` for Next.js
- One component per file unless tightly coupled
- Co-locate styles only if they don't fit Tailwind utilities

## Reference: minimum prompt that already works

If asked to build any UI without other context:

> Build it using the FLOW design system in `design-system/`. Dark mode, boxy (radius ≤ 4px), forest green + cream + neutrals, Inter + JetBrains Mono, 1px white-alpha borders, subtle shadows. Reference the matching component spec in `design-system/components/`. Use Tailwind from `tailwind.config.js`.

For marketing surfaces:

> Use the brutalist theme (`data-theme="brutalist"`). Cream canvas with dot grid, 2px solid black borders, hard offset shadows (`shadow-stamp` = 6px 6px 0 0 #000), lime-200 accent. Reference `components/buttons.md` § Stamped and `components/cards.md` § 7 Stamped/Brutalist.

---

## Quick checklist before submitting any UI

- [ ] Read the relevant component / pattern markdown
- [ ] Used tokens (CSS vars or Tailwind) — no hard-coded hex outside the brutalist theme's pure black
- [ ] Border-radius within limits (4px UI · 8px marketing · 0–2px stamped)
- [ ] All numbers in mono + tabular-nums
- [ ] Active states have the 2px accent (left edge for nav, bottom for tabs, inset for cards)
- [ ] Empty / loading / error states considered
- [ ] Icon-only buttons have `aria-label`
- [ ] No blue, no gradients (except where explicitly allowed), no pure black/white in dark mode
- [ ] One shadow language per page (subtle OR stamp, not both)
- [ ] Real content, not Lorem ipsum
