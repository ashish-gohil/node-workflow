# Cards & Panels

The most-used container. Always boxy: 4px radius, 1px borders, sharp internal grid. Cards never carry heavy shadow + heavy border together — pick one.

---

## Card taxonomy

| Type              | Purpose             | Padding | Shadow                  | Notes                               |
| ----------------- | ------------------- | ------- | ----------------------- | ----------------------------------- |
| **Stat card**     | Single KPI / metric | 20px    | `sm`                    | Mono numbers, tabular               |
| **Content card**  | Generic container   | 24px    | `sm`                    | Header + body + footer              |
| **Workflow node** | Canvas node         | 12 16   | `sm` (glow on selected) | Has input/output ports, status edge |
| **List card**     | Each item in a list | 16 20   | none, divider only      | Bottom border only                  |
| **Settings card** | Form section        | 24px    | none                    | Inset look, `bg-surface`            |
| **Empty card**    | Placeholder         | 32px    | none                    | Centered, dashed border             |

---

## 1 · Stat card

KPIs and dashboard metrics. Heavy on tabular numbers.

```
┌────────────────────────────────────┐
│  EXECUTIONS TODAY                  │  ← h6 eyebrow, text-muted
│                                    │
│  1,284  ↗ 12.3%                    │  ← display-lg / mono / tabular
│                                    │
│  vs 1,143 yesterday                │  ← caption / text-secondary
└────────────────────────────────────┘
   bg-elevated · border-default · radius-sm · p-5
```

```html
<div
  class="bg-bg-elevated border-default hover:border-strong duration-fast rounded-sm border p-5 transition-colors"
>
  <p class="text-h6 text-text-muted tracking-wider uppercase">
    Executions today
  </p>
  <div class="mt-3 flex items-baseline gap-3">
    <span
      class="text-display-lg text-text-primary font-mono font-medium tracking-tighter tabular-nums"
      >1,284</span
    >
    <span
      class="text-body-sm text-success inline-flex items-center gap-1 font-medium"
    >
      <svg class="size-3">↗</svg> 12.3%
    </span>
  </div>
  <p class="text-caption text-text-secondary mt-2">
    vs <span class="font-mono tabular-nums">1,143</span> yesterday
  </p>
</div>
```

**Variant — bordered with brand accent (featured KPI)**

- Add 2px left edge: `border-l-2 border-l-forest-500`
- Increase padding-left to `24px` (visual balance)

---

## 2 · Content card

The generic workhorse. Header + body + optional footer.

```
┌──────────────────────────────────────┐
│ Title                          [⋯]   │  ← h3, padding 20 24
│ Subtitle / description               │  ← body-sm / text-secondary
├──────────────────────────────────────┤  ← border-subtle
│                                      │
│   Body content                       │  ← padding 24
│                                      │
├──────────────────────────────────────┤  ← border-subtle (if footer)
│ Helper text       [Cancel] [Action]  │  ← padding 16 24
└──────────────────────────────────────┘
   bg-elevated · border-default · radius-sm
```

```html
<article
  class="bg-bg-elevated border-default overflow-hidden rounded-sm border shadow-sm"
>
  <header
    class="border-subtle flex items-start justify-between gap-4 border-b px-6 py-5"
  >
    <div>
      <h3 class="text-h3 font-semibold tracking-tight">Webhook trigger</h3>
      <p class="text-body-sm text-text-secondary mt-1">
        Fires when an HTTP request hits the configured endpoint.
      </p>
    </div>
    <button aria-label="More" class="size-8 rounded-sm hover:bg-white/[0.04]">
      ⋯
    </button>
  </header>
  <div class="px-6 py-6">
    <!-- body -->
  </div>
  <footer
    class="border-subtle flex items-center justify-between border-t px-6 py-4"
  >
    <span class="text-caption text-text-muted">Last edited 2h ago</span>
    <div class="flex gap-2">
      <button class="btn-secondary">Cancel</button>
      <button class="btn-primary">Save</button>
    </div>
  </footer>
</article>
```

---

## 3 · Workflow Node card ⭐ (signature component)

The atomic unit of the canvas. The whole product visually depends on this.

### Anatomy

```
        ●  ← input port (8px circle, top edge)
┌──────────────────────────────────────┐
│ ▎ [icon] Webhook                [⋯] │  ← 12 16, h5
│ ▎ POST /api/orders        mono-sm   │  ← subtitle, text-muted
│ ▎ ────────────────────────────────  │  ← border-subtle
│ ▎ [● Success]  [142 runs]           │  ← status pill + meta
└──────────────────────────────────────┘
   ↑ 2px left-edge accent (status color)
        ●           ●  ← output ports (bottom edge)
```

### Spec

- `bg-bg-elevated` (`#161C18`)
- `border: 1px var(--border-default)`
- `radius: 4px`
- `min-width: 240px`, `max-width: 320px`
- `padding: 12px 16px`
- `shadow: sm` at rest
- 2px left-edge accent bar reflecting last run status (use `box-shadow: inset 2px 0 0 0 <status>` rather than border to keep the outer border consistent)
- Ports: 8px circles, `bg-bg-canvas`, `border: 1.5px var(--border-strong)`, become `forest.400` on hover/active

### States

| State        | Visual                                               |
| ------------ | ---------------------------------------------------- |
| Default      | `border-default`, `shadow-sm`                        |
| Hover        | `border-strong`, cursor: grab                        |
| **Selected** | `border: 2px forest.500`, `shadow.glow.brand`        |
| Running      | animated `forest.300` border-pulse, 1.4s loop        |
| Success      | inset 2px left edge `success`, status pill `success` |
| Error        | `shadow.glow.error`, inset 2px left edge `error`     |
| Disabled     | `opacity: 0.5`, diagonal stripe overlay 4% white     |

```html
<div
  class="bg-bg-elevated border-default hover:border-strong data-[selected=true]:border-forest-500 data-[selected=true]:shadow-glow-brand data-[status=error]:shadow-glow-error duration-fast relative max-w-[320px] min-w-[240px] cursor-grab rounded-sm border shadow-sm transition-all data-[selected=true]:border-2 data-[status=success]:shadow-[inset_2px_0_0_0_#52B788] data-[status=error]:[&]:shadow-[inset_2px_0_0_0_#E5484D,_0_0_0_1px_rgba(229,72,77,0.6),_0_0_16px_rgba(229,72,77,0.25)]"
>
  <!-- Input port -->
  <span
    class="bg-bg-canvas border-strong hover:border-forest-400 absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full border-[1.5px]"
  ></span>

  <div class="px-4 py-3">
    <div class="flex items-start justify-between gap-2">
      <div class="flex min-w-0 items-center gap-2">
        <svg class="text-forest-300 size-4 shrink-0">...</svg>
        <h5 class="text-h5 truncate font-semibold">Webhook</h5>
      </div>
      <button
        aria-label="Node options"
        class="text-text-muted size-6 rounded-sm hover:bg-white/[0.04]"
      >
        ⋯
      </button>
    </div>
    <p class="text-mono-sm text-text-muted mt-0.5 truncate font-mono">
      POST /api/orders
    </p>
  </div>

  <div class="border-subtle flex items-center gap-2 border-t px-4 py-2.5">
    <span
      class="bg-success-surface text-success text-caption inline-flex h-5 items-center gap-1.5 rounded-xs px-1.5 font-medium"
    >
      <span class="bg-success size-1 rounded-full"></span>
      Success
    </span>
    <span class="text-mono-sm text-text-muted font-mono tabular-nums">
      142 runs
    </span>
  </div>

  <!-- Output ports -->
  <span
    class="bg-bg-canvas border-strong hover:border-forest-400 absolute -bottom-1 left-[40%] size-2 -translate-x-1/2 rounded-full border-[1.5px]"
  ></span>
  <span
    class="bg-bg-canvas border-strong hover:border-forest-400 absolute -bottom-1 left-[60%] size-2 -translate-x-1/2 rounded-full border-[1.5px]"
  ></span>
</div>
```

---

## 4 · List card (row card)

Each row in a list of resources (workflows, executions, credentials).

```
┌──────────────────────────────────────────────────┐
│ [icon] Order processing pipeline      ● Active   │
│        Last run 2m ago · 24 nodes                │
└──────────────────────────────────────────────────┘
   ↑ p-4 px-5 · border-b border-subtle (no top border, stack-friendly)
```

- No outer card border on individual rows — only `border-b border-subtle` between rows
- Wrap the list in a card if the whole list is the contained element
- Hover: `bg-white/[0.02]`
- Click target = full row

---

## 5 · Settings card

Used on settings/config pages. Inset feel, no shadow.

```
┌──────────────────────────────────────┐
│ API CREDENTIALS                      │  ← h6 eyebrow, p-6
│ Manage external service auth.        │  ← body-sm / text-secondary
│                                      │
│   [form fields go here]              │
│                                      │
└──────────────────────────────────────┘
   bg-bg-surface · border border-subtle · radius-sm · p-6
```

Settings cards use `bg-bg-surface` (one step darker than elevated) and `border-subtle` to feel inset rather than raised.

---

## 6 · Empty card

```
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
│                                    │
│           [icon 40px]              │
│                                    │
│      No workflows yet              │
│      Create one to get started     │
│                                    │
│         [Create workflow]          │
│                                    │
└─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘
   border: 1px dashed border-default · p-8 · radius-sm · text-center
```

- Dashed border signals "nothing here yet"
- Icon: line-art only, 1.5px stroke, `text-muted`
- Heading: `h4`, `text-primary`
- Description: `body-sm`, `text-secondary`
- CTA: secondary or ghost button
- See `patterns/empty-states.md` for full library

---

## 7 · Stamped / Brutalist card ⭐

For marketing pages, landing sections, portfolio-style surfaces, and the brutalist theme. Thick black border + hard offset shadow. The visual sibling of the stamped button.

```
   ┌──────────────────────────────────────┐
   │                                      │
   │  Title                               │
   │  Big, bold, cream-on-black           │
   │  description.                        │
   │                                      │  ──┐
   │  [STAMPED CTA →]                     │    │ 6px offset
   │                                      │    │ pure-black shadow
   └──────────────────────────────────────┘    │
       └──────────────────────────────────────┘
       ↑ 2px solid #000 border
       ↑ bg: white or lime-200 or cream
       ↑ shadow: 6px 6px 0 0 #000  (no blur)
```

### Spec

- Border: `2px solid #000` (`border-black`)
- Background: `white`, `cream-50`, `lime-200`, or `forest-500` for inverse
- Radius: `0` or `2px` (`radius-xs`) — never more
- Shadow at rest: `shadow-stamp` (6px 6px 0 0 #000)
- Shadow on hover (if interactive): `shadow-stamp-lg` (8px 8px) + `translate(-2px, -2px)`
- Padding: `24px` (sm) · `32px` (md, default) · `48px` (lg)

### Default

```html
<article
  class="shadow-stamp hover:shadow-stamp-lg duration-fast rounded-none border-2 border-black bg-white p-8 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
>
  <p class="text-h6 text-text-muted tracking-wider uppercase">CASE STUDY</p>
  <h3 class="text-h2 mt-3 font-bold tracking-tighter text-black">
    How Acme cut ops time by 70%
  </h3>
  <p class="text-body-md text-text-secondary mt-4 max-w-prose">
    A pipeline built in FLOW automated their order intake, reducing manual work
    from 12 hours to 3 hours per week.
  </p>
  <button
    class="shadow-stamp-sm hover:shadow-stamp mt-6 border-2 border-black bg-lime-200 px-5 py-2.5 font-bold tracking-wide text-black uppercase transition-all"
  >
    Read more →
  </button>
</article>
```

### Variants

**Filled brand (lime)** — for hero feature cards

```html
<article
  class="shadow-stamp rounded-none border-2 border-black bg-lime-200 p-8"
>
  <h3 class="text-h2 font-bold text-black">Built for speed</h3>
  <p class="text-body-md mt-3 text-black/80">…</p>
</article>
```

**Inverted (black)** — for testimonial / quote / dark CTA cards

```html
<article
  class="text-cream-50 rounded-none border-2 border-black bg-black p-8 shadow-[6px_6px_0_0_#A8E47C]"
>
  <!-- lime shadow -->
  <p class="text-h3 font-medium tracking-tight">
    "FLOW replaced four tools and 200 lines of glue code."
  </p>
  <footer class="mt-6 flex items-center gap-3">
    <span class="border-cream-50 size-10 border-2 bg-lime-200"></span>
    <div>
      <p class="font-semibold">Sara Chen</p>
      <p class="text-body-sm text-cream-50/60 font-mono">CTO, Acme Corp</p>
    </div>
  </footer>
</article>
```

**Stat card (brutalist)**

```html
<div class="shadow-stamp border-2 border-black bg-white p-6">
  <p class="text-h6 tracking-wider uppercase">Workflows</p>
  <p class="text-display-lg mt-2 font-mono font-bold tabular-nums">12,840</p>
  <p class="text-body-sm text-text-muted">running across 480 customers</p>
</div>
```

### Layout & rhythm

In a brutalist card grid, **stagger shadow directions** for visual energy — but only sparingly:

- Default: shadows offset down-right (`6px 6px`)
- Alt cards (every 3rd or accent ones): `shadow-[-6px_6px_0_0_#000]` (down-left)
- Reserve for marketing; never stagger inside a settings panel

Cards in a brutalist grid always use **bigger gutters**: `gap-8` (32px) minimum, often `gap-12` (48px), so shadows don't overlap.

### Rules

- ✅ Marketing pages, landing hero, feature grid, testimonials, pricing tiers
- ✅ The brutalist theme (`data-theme="brutalist"`) — default card style
- ✅ Pair with stamped buttons inside; never with subtle/default buttons
- ❌ Don't use inside the app shell, dashboard, or canvas (too loud, breaks the Swiss aesthetic)
- ❌ Don't nest stamped cards inside stamped cards (shadow chaos)
- ❌ Don't combine `radius-md`+ with stamp shadows — looks broken
- ❌ Don't use semi-transparent borders on stamped cards — only pure black (or pure white in dark mode)

---

✅ **Do**

- Stack cards in CSS grid with `gap-4` (16px) for dashboards, `gap-2` for dense lists
- Use dividers (`border-subtle`) for internal sections — never stack cards inside cards
- Limit nested padding: never indent content past 32px from card edge
- Reserve `glow-brand` for selected/active state only

❌ **Don't**

- Round corners > 8px (breaks boxy aesthetic; signature component)
- Use shadow > `sm` on cards in lists (visual chaos)
- Stack 3+ cards inside cards — use sections with dividers instead
- Mix radii within one card (header radius must equal body radius)
- Use cream background for cards in dark mode — only for inverse callouts
