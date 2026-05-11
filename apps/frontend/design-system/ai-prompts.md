# Prompting AI with the FLOW design system

How to get Claude Code, Claude.ai, Cursor, or any AI tool to generate UI that looks exactly like FLOW. Copy any block below, replace `{...}` with specifics.

---

## The system prompt (paste once at the start of any session)

```
You are building for FLOW, a node-based workflow automation platform.
Use only the design system in design-system/.

Non-negotiable constraints:
1. Tailwind classes only — zero style={} props, zero <style> tags.
2. Semantic class names, never CSS variable wrappers:
   - CORRECT: bg-bg-canvas, text-text-primary, border-border-subtle, bg-accent-primary
   - WRONG:   bg-[var(--color-bg-canvas)], text-[var(--color-text-primary)], bg-[#4fc97a]
3. Boxy — max border-radius is 0px on UI (rounded-none), 4px on workflow canvas nodes (rounded-node).
   rounded-full only on notification dots and avatar images.
4. Three themes: dark (default, all app surfaces), light (user pref), brutalist (marketing only).
   Use semantic tokens — they auto-adapt. No dark: prefix needed.
5. Color palette: forest green + cream + neutrals. Lime = brutalist only.
   Never Tailwind blue/indigo/purple/gray-*. Never hardcoded hex in className.
6. Typography: font-sans (Inter) for UI, font-mono (JetBrains Mono) for IDs / numbers / code.
   tabular-nums on any aligned numeric column.
7. Borders: 1px white-alpha tokens (dark/light), 2px solid black (brutalist). Never border-gray-*.
8. Shadows: subtle multi-layer in dark/light, hard offset stamp in brutalist — never mix on one page.
9. Status accent on cards: box-shadow inset 2px 0 on left edge — NOT border-left.
10. Layout: Swiss — text-left for text, text-right for numeric columns. No text-center in lists/dashboards.

Source of truth: app/globals.css (tokens), design-system/components/*.md (components), design-system/patterns/*.md (layouts).
Before generating any component, check components/ui/ for an existing implementation.
```

---

## Prompt templates

### Generate a single component

```
Build a {component name} following the FLOW design system.

Read: design-system/components/{component}.md and app/globals.css first.

Rules:
- Tailwind classes only. No style={}, no <style> tags.
- Use semantic tokens: bg-bg-elevated, text-text-primary, border-border-subtle, bg-accent-primary, etc.
- Never bg-[var(--...)]. Never hardcoded hex. Never rounded-lg or larger.
- Variants needed: {list variants}
- States needed: default, hover, active, disabled{, loading if action button}
```

### Generate a full page

```
Build the {page name} page for FLOW.

Read: design-system/patterns/app-shell.md, design-system/patterns/{pattern}.md first.

Content:
- {describe what goes on the page}

States to include:
- Loading (skeleton placeholders)
- Empty (EmptyCard with icon + CTA)
- Error (EmptyCard with retry)
- Populated (realistic domain data)
```

### Generate the workflow editor

```
Build the FLOW workflow editor canvas:
- App shell from patterns/app-shell.md, sidebar collapsed, inspector open at 480px
- Canvas with .canvas-grid background (radial-gradient dots, 16px spacing)
- Four connected nodes: Webhook (trigger) → HTTP Request → Code → Slack
- Nodes: rounded-node (4px), card-surface, 1.5px border-border-stamp, shadow-sm
- Connections: 1.5px bezier curves, border-default color
- Inspector: Sheet (right drawer) showing HTTP Request node config
- Topbar: workflow name "Order pipeline", Badge variant="success", primary Run button
```

### Restyle an existing design

```
Restyle the attached UI to match FLOW exactly. Keep structure and content, apply:
- Dark canvas (bg-bg-canvas = #0A0E0C)
- Elevated cards (bg-bg-elevated = #161C18)
- 0px border-radius on all surfaces (rounded-none)
- font-sans (Inter) for UI, font-mono (JetBrains Mono) for numbers and IDs with tabular-nums
- 1px white-alpha borders (border-border-default)
- Semantic accent: bg-accent-primary (not hardcoded green)
- Subtle shadows (shadow-sm default, shadow-lg for modals)
- No gradients, no blue, no rounded-full buttons
Read design-system/DESIGN_SYSTEM.md and components/*.md first.
```

### Generate marketing / landing variant

```
Build a marketing {section} for FLOW using data-theme="brutalist":
- Cream canvas (#F5EFE0) with dot-grid background
- Lime accent (#C5F4A5 = bg-accent-primary in brutalist)
- 2px solid black borders (border-border-default in brutalist = #0A0E0C)
- Hard offset shadows: shadow-sm = 2px, shadow-md = 4px, shadow-lg = 6px, stamp-xl = 8px, all 0 blur
- Large headlines (text-display-xl or text-display-lg)
- Generous whitespace (py-24 to py-32 sections)
- StampCard for feature cards, stamped buttons for CTAs
```

### Generate empty / loading / error states

```
For {component/page}, generate all three states from patterns/empty-states.md:
1. True empty — first-time user, no data ever
2. Filtered empty — search/filter yielded nothing
3. Error — loading failed
Each state uses EmptyCard with: icon (Lucide line-art, size-10, stroke-[1.5px]), heading, description, CTA.
No emoji. No color fills on icons. Real domain copy — no Lorem ipsum.
```

---

## Correct vs. wrong code pairs

### Primary button

```tsx
// WRONG — generic AI default
<button className="rounded-lg bg-blue-500 px-4 py-2 text-white shadow-md hover:bg-blue-600">
  Run workflow
</button>

// CORRECT — FLOW
<Button variant="primary" size="default">
  Run workflow
</Button>
// Expands to: btn-stamp btn-stamp-primary hover:btn-stamp-hover active:btn-stamp-active h-10 px-[18px] text-body-sm
```

### Card

```tsx
// WRONG
<div className="rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-6 shadow-2xl">
  <h3 className="text-white">Executions</h3>
  <p className="text-4xl font-bold">1284</p>
</div>

// CORRECT
<StatCard
  label="Executions today"
  value="1,284"
  delta="+12.3%"
  deltaPositive
/>
// Or manually:
<div className="card-surface p-5">
  <p className="text-h6 text-text-muted uppercase tracking-wider">Executions today</p>
  <div className="mt-3 flex items-baseline gap-3">
    <span className="text-display-lg font-mono font-medium tabular-nums text-text-primary">1,284</span>
    <span className="text-body-sm text-success font-medium">↗ 12.3%</span>
  </div>
</div>
```

### Table row

```tsx
// WRONG
<tr className="odd:bg-gray-50 hover:bg-gray-100">
  <td>order-pipeline</td>
  <td><span className="rounded-full bg-green-100 px-2 py-0.5 text-green-800">Success</span></td>
  <td>1.24</td>
</tr>

// CORRECT
<tr className="border-b border-border-subtle cursor-pointer transition-colors hover:bg-white/[0.03]">
  <td className="text-body-md text-text-primary px-4 py-3">Order pipeline</td>
  <td className="px-4 py-3">
    <Badge variant="success">Success</Badge>
  </td>
  <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary text-mono-md">1.24s</td>
</tr>
```

### Input field

```tsx
// WRONG
<input className="rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500" />

// CORRECT
<Input label="Webhook URL" placeholder="https://api.example.com/webhook" />
// Or manually:
<input className="btn-stamp h-10 w-full px-3.5 text-body-md text-text-primary
  placeholder:text-text-muted focus:outline-none focus:[border-color:var(--color-border-focus)]" />
```

### Badge / status pill

```tsx
// WRONG
<span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">Active</span>

// CORRECT
<Badge variant="success">Active</Badge>
// Expands to: inline-flex items-center gap-1.5 h-5 px-1.5 text-caption bg-success-surface text-success rounded-xs font-medium
```

---

## Anti-pattern correction

If AI output drifts, paste this:

```
The output broke FLOW design system rules. Fix these:
- [ ] Used bg-[var(--...)] or style={} — use semantic Tailwind class names directly (bg-bg-canvas, text-text-primary, etc.)
- [ ] Used <style> tags — move all styles to Tailwind classes
- [ ] Hardcoded hex color in className — use named token class
- [ ] Border-radius too large — rounded-none on all UI (rounded-node only for workflow canvas nodes)
- [ ] Used blue/indigo/purple/gray-* Tailwind colors — use forest/cream/neutral/semantic tokens
- [ ] Used rounded-full on buttons — only on notification dots
- [ ] Numeric values not in font-mono tabular-nums
- [ ] Used gradient background on card — flat surface with border only
- [ ] Used border-gray-* — use border-border-{subtle|default|strong} tokens
- [ ] Used shadow-2xl or heavy soft shadow — use shadow-sm/md/lg per elevation level
- [ ] Used text-center in list/table — text-left (text), text-right (numbers)
- [ ] Used emoji as icon — Lucide icons only, strokeWidth={1.5}
- [ ] Didn't reuse existing component from components/ui/ — use <Button>, <Badge>, <Card>, etc.
Regenerate fixing all items above.
```

---

## Tool-specific notes

### Claude Code

- Run from `/apps/frontend/` directory, or reference full paths from root
- Use `/component` slash command: generates a properly themed component
- Use `/page` slash command: generates a properly themed page
- Reference files directly: `Read design-system/components/buttons.md and build me a stamped CTA button`

### Claude.ai Projects

- Upload entire `design-system/` folder to Project knowledge
- Paste the system prompt block at the top as the project system prompt
- Reference files: "Build X per components/cards.md"

### Cursor / Windsurf

- `cursorrules` file in `design-system/` contains condensed rules
- Add `@design-system` folder to context alongside your request

---

## Quick reference (any prompt)

> Use FLOW design system: Tailwind classes only (no style={}, no bg-[var(--...)]), semantic tokens (bg-bg-canvas, text-text-primary, border-border-subtle, bg-accent-primary), 0px border-radius (rounded-none), font-sans Inter UI + font-mono JetBrains Mono for IDs/numbers/code, tabular-nums on numbers, 1px white-alpha borders, subtle shadows, no gradients, Swiss left-align text right-align numbers. Check components/ui/ before writing any new component.
