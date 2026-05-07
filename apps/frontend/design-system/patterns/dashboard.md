# Pattern · Dashboard

For metrics, overview pages, and any data-heavy non-canvas surface. Built on a 12-column grid with consistent gutters.

---

## Page structure

```
┌──────────────────────────────────────────────────────────────┐
│ Page header (title + meta + primary action)                  │
├──────────────────────────────────────────────────────────────┤
│ Filter / range bar (optional)                                │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                          │  ← KPI row
│ │ Stat │ │ Stat │ │ Stat │ │ Stat │                          │     (4 cards)
│ └──────┘ └──────┘ └──────┘ └──────┘                          │
│                                                              │
│ ┌────────────────────────────┬──────────────┐                │  ← Main grid
│ │ Chart (8 cols)             │ Side (4)     │                │
│ │                            │              │                │
│ └────────────────────────────┴──────────────┘                │
│                                                              │
│ ┌──────────────────────────────────────────┐                 │
│ │ Recent activity / table (12 cols)        │                 │
│ └──────────────────────────────────────────┘                 │
└──────────────────────────────────────────────────────────────┘
```

---

## Page header

```html
<header class="mb-8 flex items-start justify-between gap-6">
  <div>
    <h1 class="text-h1 font-semibold tracking-tighter">Workflows</h1>
    <p class="text-body-md text-text-secondary mt-1">
      24 active · 3 paused · last run 2m ago
    </p>
  </div>
  <div class="flex items-center gap-2">
    <button class="btn-secondary">Import</button>
    <button class="btn-primary">
      <svg class="size-4">+</svg> New workflow
    </button>
  </div>
</header>
```

**Spec**

- Title: `h1` (32px, weight 600, `tracking-tighter`)
- Subtitle: `body-md`, `text-text-secondary`, with mono numbers if applicable
- Actions: right-aligned, primary on the right
- Bottom margin: `space-8` (32px)

---

## Filter / range bar

Sticky below the topbar, separates header from content.

```html
<div
  class="z-sticky bg-bg-canvas/80 border-subtle sticky top-0 -mx-6 mb-6 flex items-center gap-3 border-b px-6 py-3 backdrop-blur"
>
  <!-- Range -->
  <div
    class="bg-bg-elevated border-subtle flex items-center gap-1 rounded-sm border p-1"
  >
    <button
      class="text-body-sm bg-bg-canvas text-text-primary h-7 rounded-xs px-3 font-medium shadow-[inset_0_0_0_1px_var(--border-default)]"
    >
      24h
    </button>
    <button
      class="text-body-sm text-text-secondary hover:text-text-primary h-7 rounded-xs px-3 font-medium"
    >
      7d
    </button>
    <button
      class="text-body-sm text-text-secondary hover:text-text-primary h-7 rounded-xs px-3 font-medium"
    >
      30d
    </button>
    <button
      class="text-body-sm text-text-secondary hover:text-text-primary h-7 rounded-xs px-3 font-medium"
    >
      Custom
    </button>
  </div>

  <!-- Filters -->
  <button class="btn-secondary h-8">
    <svg class="size-4">⚙</svg> Filters
    <span class="badge badge--solid">2</span>
  </button>

  <!-- Search -->
  <div class="relative max-w-[320px] flex-1">
    <svg
      class="text-text-muted absolute top-1/2 left-3 size-4 -translate-y-1/2"
    ></svg>
    <input
      class="bg-bg-surface border-strong text-body-sm placeholder:text-text-muted focus:border-forest-400 focus:shadow-focus-ring h-8 w-full rounded-sm border pr-3 pl-9"
      placeholder="Search…"
    />
  </div>

  <!-- Density toggle -->
  <button class="btn-ghost size-8 p-0" aria-label="Density">⋯</button>
</div>
```

---

## KPI row (stat grid)

4 stat cards on desktop, 2 on tablet, 1 on mobile.

```html
<section class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
  <StatCard label="Executions today" value="1,284" change="+12.3%" trend="up" />
  <StatCard label="Success rate" value="98.4%" change="+0.6%" trend="up" />
  <StatCard label="Avg duration" value="1.24s" change="−0.1s" trend="down" />
  <StatCard label="Failed runs" value="21" change="+5" trend="up" />
</section>
```

See `components/cards.md` § Stat card for the full StatCard markup.

---

## Main grid

Use the 12-column grid for the primary content area. Common ratios:

| Ratio     | Use                                             |
| --------- | ----------------------------------------------- |
| 12        | Full-width chart or table                       |
| 8 + 4     | Chart + side panel (recent activity, breakdown) |
| 6 + 6     | Two equal panels (e.g., success vs failure)     |
| 9 + 3     | Content + thin nav/legend                       |
| 4 + 4 + 4 | Three-card row (sub-stats, recent items)        |

```html
<section class="mb-6 grid grid-cols-12 gap-6">
  <div class="col-span-12 xl:col-span-8">
    <ChartCard />
  </div>
  <div class="col-span-12 xl:col-span-4">
    <ActivityCard />
  </div>
</section>
```

**Gap:** always `space-6` (24px) between top-level cards. Inside cards, internal padding handles the rest.

---

## Charts

Use `recharts` or `visx` for charts. Apply tokens:

```js
const chartTheme = {
  background: "transparent",
  grid: "rgba(255,255,255,0.06)", // border-subtle
  axis: "rgba(255,255,255,0.10)", // border-default
  axisLabel: "#7A8881", // text-muted
  tooltipBg: "#1D241F", // bg-overlay
  tooltipBorder: "rgba(255,255,255,0.10)",
  series: [
    "#2D6A4F", // forest-500 (primary)
    "#52B788", // success
    "#F5A524", // warning
    "#5EB1EF", // info
    "#6FAE82", // forest-300
  ],
};
```

**Spec**

- Always include axis labels (`text-h6` style, `text-text-muted`)
- Y-axis numbers: tabular, mono
- Gridlines: horizontal only, `border-subtle`, dashed
- Tooltip: `bg-overlay`, `border-default`, `radius-sm`, `shadow-md`, padding `8px 12px`
- Line charts: 1.5px stroke, no markers by default, markers on hover
- Bar charts: 60–70% of slot width, no border, slight gap
- No gradients, no 3D, no donuts (use horizontal bars instead)

---

## Activity / log feed

Right-side panel showing recent events.

```html
<article class="bg-bg-elevated border-default rounded-sm border shadow-sm">
  <header
    class="border-subtle flex items-center justify-between border-b px-5 py-4"
  >
    <h3 class="text-h4 font-semibold tracking-tight">Recent activity</h3>
    <a href="#" class="text-body-sm text-forest-300 hover:text-forest-200">
      View all →
    </a>
  </header>
  <ul class="divide-subtle divide-y">
    <li class="flex items-start gap-3 px-5 py-3">
      <span class="status-dot status-dot--success mt-1.5"></span>
      <div class="min-w-0 flex-1">
        <p class="text-body-md truncate">
          <span class="font-medium">Order pipeline</span> completed
        </p>
        <p class="text-mono-sm text-text-muted font-mono tabular-nums">
          run_8f3a · 1.24s · 2m ago
        </p>
      </div>
    </li>
    <!-- ... -->
  </ul>
</article>
```

---

## Empty dashboard

When no data exists yet:

- Replace KPI cards with skeleton variants OR an inline message inside one large empty card
- Use a friendly illustration (line-art, 80px) and a single CTA
- See `patterns/empty-states.md` for full variants

---

## Loading

- Show full skeleton on initial load (KPI bars, chart placeholder, table rows)
- Use `animate-shimmer` (1.6s linear) on skeletons
- Replace progressively as data arrives — don't wait for everything

---

## Page max-width

```html
<main class="max-w-app mx-auto px-8 py-8">
  <!-- dashboard content -->
</main>
```

- `max-w-app` = 1440px
- Padding: `space-8` (32px) horizontal on desktop, `space-4` on mobile
- For very wide tables: allow content to extend beyond max-width with horizontal scroll

---

## Section composition

When a page has multiple distinct sections (KPIs, breakdown, table):

- Section title: `h2` (24px), `tracking-tighter`
- Optional eyebrow above: `h6` uppercase, `text-text-muted`
- Section gap: `space-12` (48px)
- Subtle divider between sections (`border-t border-subtle`) is OPTIONAL — prefer whitespace

---

## Marketing variant (for landing/docs)

When using these tokens for a marketing page:

- Max-width: `max-w-content` (1024px)
- Hero title: `display-xl` or `display-lg`
- Larger spacing: section gaps `space-20` (80px)
- Generous whitespace, single column for prose
- Cards may use `radius-lg` (8px) but no more
- Allow one accent gradient: subtle radial `from-forest-500/10 to-transparent` behind the hero only

---

## Usage rules

✅ **Do**

- Lead with the most important KPI on the left
- Keep KPI cards exactly the same height across the row
- Use mono + tabular for ALL numbers
- Provide a "View all" link from compact lists to a full table page

❌ **Don't**

- Mix card heights in a KPI row (looks broken)
- Use 5+ chart colors (max 4 series — split into multiple charts if needed)
- Center-align dashboard content (Swiss = left-aligned content, right-aligned numbers)
- Animate KPIs on every render — only on initial mount or value change
- Use stacked bar charts with > 5 segments (illegible)
