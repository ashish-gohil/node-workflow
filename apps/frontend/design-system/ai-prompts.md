# Prompting Claude with this design system

How to get Claude (or any other AI design tool) to generate UI that looks like FLOW. Copy any prompt below into your conversation, replacing `{...}` with specifics.

---

## The system prompt (drop this once at the start of any project)

```
You are designing for FLOW, a workflow automation product. Use only the design system in this folder.

Constraints, in priority order:
1. Boxy aesthetic — max border-radius is 4px on UI, 8px on marketing cards. No pills, no rounded buttons.
2. Dark mode is the default. Light mode only on explicit request.
3. Color palette: forest green (#2D6A4F primary), cream (#FAF7F0), and green-tinted neutrals (canvas #0A0E0C). Never use blue accents, gradients (except where specified), or pure black/white.
4. Typography: Inter for UI, JetBrains Mono for IDs / numbers / code / env vars. Numbers always tabular-nums.
5. Borders are 1px white-alpha (rgba 255,255,255,0.06–0.16). Never gray fills for borders.
6. Shadows are subtle and dark-mode tuned. Use shadow-sm by default; reserve shadow-lg for modals; reserve glow-brand for active/selected states.
7. Status accent on cards = 2px solid left edge (use box-shadow inset, not border, to keep outer border consistent).
8. 4px spacing base, 8px primary rhythm, 16/24px gap defaults, 12-col grid for layouts.
9. Active nav items get a 2px left-edge accent in forest-500. Active tabs get a 2px bottom border.

Files in this folder are the source of truth:
- DESIGN_SYSTEM.md — foundations
- tokens.css / tokens.json — actual values
- tailwind.config.js — Tailwind mapping
- components/* — per-component specs
- patterns/* — composed layouts
- icons.md — Lucide, 1.5px stroke

Always reference the matching file before generating. If a component or pattern exists in this folder, use it verbatim. If something isn't covered, propose an addition that follows the same rules.
```

---

## Prompt templates

### Generate a single component

```
Build a {component name} per components/{component}.md. Use Tailwind with the tokens from tailwind.config.js. {Specific variant}, {state}, {data}.
```

**Example:**

> Build a workflow node card per `components/cards.md` § Workflow Node. Status = success, with one input port and two output ports, label "Webhook", subtitle "POST /api/orders", and "142 runs" meta. Use Tailwind.

### Generate a full page

```
Build a {page name} for FLOW following patterns/{pattern}.md. Use the app shell from patterns/app-shell.md. {Specific content}.
```

**Example:**

> Build the Workflows index page following `patterns/dashboard.md`. Use the app shell from `patterns/app-shell.md`. Include: page header with "New workflow" CTA, a 24h/7d/30d range bar, four KPI cards (executions today, success rate, avg duration, failed runs), and a table listing 8 workflows with name, status pill, last run time, and a row menu.

### Generate the workflow editor (canvas)

```
Build the FLOW workflow editor:
- App shell from patterns/app-shell.md with sidebar collapsed and inspector open at 480px
- Canvas with .canvas-grid background, 4 connected nodes per components/cards.md § Workflow Node
- Nodes: Webhook (trigger) → HTTP Request → Code → Slack
- Connect them with thin curves (1.5px, border-default, slightly curved bezier)
- Inspector shows config for the selected HTTP Request node
- Topbar: workflow name "Order pipeline", status pill "Active", and a primary "Run" button with ⌘ Enter hint
```

### Restyle an existing screenshot/design

```
Restyle the attached UI to match the FLOW design system. Keep the structure and content, but apply:
- Dark canvas (#0A0E0C), elevated cards (#161C18)
- Forest green for primary actions and accents
- 4px max radius
- Inter for UI text, JetBrains Mono for any numbers or IDs
- 1px white-alpha borders, no gray fills
- Subtle shadows only
Reference DESIGN_SYSTEM.md and components/*.md.
```

### Generate marketing variant

```
Build a marketing {section} for FLOW. Use the design system but apply the marketing variant rules from patterns/dashboard.md § Marketing variant: max-w-content, larger headlines (display-xl), generous whitespace, optional radius up to 8px, allow one subtle radial gradient behind the hero.
```

### Generate empty / loading / error states

```
For the {component/page}, generate the three states from patterns/empty-states.md:
1. True empty (first-time user, no data ever)
2. Filtered empty (search yielded nothing)
3. Error (loading failed)
Each should be self-contained and use line-art icons only.
```

---

## Anti-patterns — tell Claude to avoid these

If output drifts, paste this correction:

```
The output drifted from the FLOW design system. Specifically:
- [ ] Border-radius too large (must be ≤ 4px on UI, ≤ 8px on marketing)
- [ ] Used a blue accent (only forest green and semantic colors allowed)
- [ ] Used a gradient (only allowed on shimmer skeleton or explicit hero radial)
- [ ] Used pure black or pure white (use neutral-0 #0A0E0C and cream-50 #FAF7F0)
- [ ] Used sans-serif for numbers (numbers must be JetBrains Mono + tabular-nums)
- [ ] Used gray border fills (borders are rgba white-alpha tokens)
- [ ] Used heavy soft shadows (shadows are dark-mode tuned, subtle)
- [ ] Centered text in a list/dashboard (Swiss = left-align text, right-align numbers)
- [ ] Used "rounded-full" on buttons (only the notification dot is round)
- [ ] Used emoji as functional icons (Lucide line-art only)

Regenerate fixing these.
```

---

## Few-shot example pairs

When prompting, including 1–2 example pairs from this list dramatically improves output quality:

### Pair 1 — primary button

**Bad (generic AI default):**

```html
<button
  class="rounded-lg bg-blue-500 px-4 py-2 text-white shadow-md hover:bg-blue-600"
>
  Run workflow
</button>
```

**Good (FLOW):**

```html
<button
  class="bg-forest-500 hover:bg-forest-400 active:bg-forest-600 text-cream-50 text-body-md duration-fast h-9 rounded-sm px-4 font-medium transition-colors"
>
  Run workflow
</button>
```

### Pair 2 — stat card

**Bad:**

```html
<div
  class="rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-6 shadow-2xl"
>
  <h3 class="text-white">Executions</h3>
  <p class="text-4xl font-bold text-white">1284</p>
</div>
```

**Good:**

```html
<div class="bg-bg-elevated border-default rounded-sm border p-5">
  <p class="text-h6 text-text-muted tracking-wider uppercase">
    Executions today
  </p>
  <div class="mt-3 flex items-baseline gap-3">
    <span
      class="text-display-lg font-mono font-medium tracking-tighter tabular-nums"
    >
      1,284
    </span>
    <span class="text-body-sm text-success font-medium">↗ 12.3%</span>
  </div>
</div>
```

### Pair 3 — table row

**Bad:**

```html
<tr class="odd:bg-gray-50 hover:bg-gray-100">
  <td>order-pipeline</td>
  <td>
    <span class="rounded-full bg-green-100 px-2 py-0.5 text-green-800"
      >Success</span
    >
  </td>
  <td>1.24</td>
</tr>
```

**Good:**

```html
<tr
  class="border-subtle duration-fast cursor-pointer border-b transition-colors hover:bg-white/[0.03]"
>
  <td class="text-body-md px-4 py-3">Order pipeline</td>
  <td class="px-4 py-3">
    <span
      class="bg-success-surface text-success text-caption inline-flex h-5 items-center gap-1.5 rounded-xs px-1.5 font-medium"
    >
      <span class="bg-success size-1 rounded-full"></span> Success
    </span>
  </td>
  <td
    class="text-mono-md text-text-secondary px-4 py-3 text-right font-mono tabular-nums"
  >
    1.24s
  </td>
</tr>
```

---

## Tool-specific notes

### Claude.ai Projects

- Upload the entire `design-system/` folder to **Project knowledge**
- In the project's **system prompt**, paste the system prompt block from the top of this file
- Reference files by name in conversations: "Build X per `components/cards.md`"

### Claude Code

- Run from the parent directory of `design-system/`
- Claude Code will read files on demand — no upload needed
- Use slash commands or just reference the path: `Read design-system/components/buttons.md and build me a primary button`

### Cursor / Windsurf / Copilot Chat

- Add `design-system/` to context (`@design-system` or similar)
- Paste the system prompt as a custom rule

### Figma → code (with AI)

- Reference `tokens.json` as the source of truth for colors, spacing, type
- Paste the relevant component spec from `components/*.md` alongside the Figma frame

---

## Quick reference (copy-paste for any prompt)

Stick this at the top of any AI conversation when working in FLOW:

> Use FLOW design system: dark mode, boxy (radius ≤ 4px), forest green + cream + neutrals, Inter + JetBrains Mono, 1px white-alpha borders, subtle shadows, no gradients, Swiss left-aligned text and right-aligned tabular numbers. Reference design-system/ folder for tokens, components, and patterns.
