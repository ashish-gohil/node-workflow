# Pattern · Empty States

The unsung hero of any data-heavy app. Every list, table, search, and chart must have one. Empty states teach, never apologize.

---

## Anatomy

```
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
│                                    │
│           [icon 40–48px]           │   ← line-art, text-text-muted
│                                    │
│      Headline (h4)                 │
│      Description (body-sm)         │
│      Constrained to ~40ch          │
│                                    │
│         [Primary CTA]              │   ← optional
│         Helper link                │   ← optional
│                                    │
└─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘
   ↑ dashed border-default, p-8, radius-sm, text-center
```

---

## Three flavors

### 1 · True empty (first-time / nothing exists yet)

User hasn't created anything yet. Educational, action-oriented.

```html
<div class="border-default rounded-sm border border-dashed p-8 text-center">
  <svg class="text-text-muted mx-auto size-10" stroke-width="1.5">
    <!-- workflow icon -->
  </svg>
  <h4 class="text-h4 mt-4 font-semibold tracking-tight">No workflows yet</h4>
  <p class="text-body-sm text-text-secondary mx-auto mt-1 max-w-[40ch]">
    Create a workflow to automate tasks across your stack. Trigger on a
    schedule, webhook, or event.
  </p>
  <div class="mt-6 flex items-center justify-center gap-3">
    <button class="btn-primary">
      <svg class="size-4">+</svg> Create workflow
    </button>
    <a
      href="#"
      class="text-body-sm text-forest-300 hover:text-forest-200 font-medium"
    >
      Browse templates →
    </a>
  </div>
</div>
```

### 2 · Filtered empty (no results)

User filtered/searched, nothing matches. Adjust the query, don't create.

```html
<div class="border-default rounded-sm border border-dashed p-8 text-center">
  <svg class="text-text-muted mx-auto size-10">
    <!-- search-x icon -->
  </svg>
  <h4 class="text-h4 mt-4 font-semibold tracking-tight">
    No matches for "<span class="text-text-primary font-mono">order</span>"
  </h4>
  <p class="text-body-sm text-text-secondary mx-auto mt-1 max-w-[40ch]">
    Try a different keyword or clear filters.
  </p>
  <button class="btn-secondary mt-6">Clear filters</button>
</div>
```

### 3 · Error empty (something failed)

Loading failed. Diagnostic + retry, not apologies.

```html
<div
  class="border-error/30 bg-error-surface rounded-sm border border-dashed p-8 text-center"
>
  <svg class="text-error mx-auto size-10">
    <!-- alert-triangle icon -->
  </svg>
  <h4 class="text-h4 text-error mt-4 font-semibold tracking-tight">
    Couldn't load executions
  </h4>
  <p class="text-body-sm text-text-secondary mx-auto mt-1 max-w-[40ch]">
    Network error · code <span class="font-mono">ERR_TIMEOUT</span>
  </p>
  <div class="mt-6 flex items-center justify-center gap-3">
    <button class="btn-secondary">Try again</button>
    <button class="btn-ghost text-body-sm">Copy debug info</button>
  </div>
</div>
```

---

## Sizing variants

### Inline (small) — for empty list cells, sidebar lists

- No border (just centered content)
- Icon: 24px
- Headline: `body-md`, weight 500
- Description: `caption`
- Padding: `p-6`

```html
<div class="px-4 py-8 text-center">
  <svg class="text-text-muted mx-auto size-6">📭</svg>
  <p class="text-body-md mt-2 font-medium">No notifications</p>
  <p class="text-caption text-text-muted">You're all caught up.</p>
</div>
```

### Default (medium) — for tables, cards, content areas

- Dashed border, padding `p-8`
- Icon: 40px
- Headline: `h4`
- Description: `body-sm`

### Hero (large) — for full-page empty (e.g., zero workflows globally)

- No border (it IS the page)
- Icon: 64–80px line-art illustration
- Headline: `h2` or `h1`
- Description: `body-lg`
- Multiple CTAs allowed (primary + secondary + tertiary link)
- Center vertically in viewport: `min-h-[60vh] flex items-center justify-center`

---

## Icon treatment

Empty-state icons are **line-art only**, 1.5–2px stroke, `text-text-muted`.

✅ Approved: simple geometric icons (Lucide), custom monochrome line illustrations.

```html
<!-- Inline SVG illustration example -->
<svg
  class="text-text-muted mx-auto size-12"
  viewBox="0 0 64 64"
  fill="none"
  stroke="currentColor"
  stroke-width="1.5"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <rect x="10" y="14" width="44" height="36" rx="2" />
  <path d="M10 24 H54" />
  <path d="M18 34 L26 34 M18 40 L34 40" />
</svg>
```

❌ Avoid: photographic illustrations, 3D, gradients, multiple colors, mascot characters.

---

## Copy guidelines

### Headlines

- Short, factual, no apologies
- ✅ "No workflows yet" · "No matches" · "Couldn't load executions"
- ❌ "Oops! It seems empty" · "Sorry, nothing found" · "🤷 We couldn't find anything"

### Descriptions

- 1–2 sentences, max 40 characters per line at the design width
- Tell the user what they can do next
- ✅ "Create a workflow to automate tasks. Trigger on a schedule, webhook, or event."
- ❌ "Workflows are sequences of steps that you can configure to perform automated tasks based on a variety of triggers and conditions across multiple connected services."

### CTAs

- Action-verb first: "Create workflow" not "Click here to create"
- Single primary action; everything else is secondary or a link

---

## Empty states by context

| Context                  | Variant    | Icon          | Headline pattern               |
| ------------------------ | ---------- | ------------- | ------------------------------ |
| Workflows list (zero)    | True empty | Workflow icon | "No workflows yet"             |
| Executions list (zero)   | True empty | Activity icon | "No executions yet"            |
| Search no results        | Filtered   | Search-x      | `No matches for "{q}"`         |
| Filtered list no results | Filtered   | Filter icon   | "No items match these filters" |
| Drawer with no logs      | Inline     | Doc icon      | "No logs for this run"         |
| Notification panel       | Inline     | Bell-off      | "You're all caught up"         |
| API error                | Error      | Alert         | "Couldn't load {resource}"     |
| Network offline          | Error      | Wifi-off      | "You're offline"               |
| Loading slow             | Inline     | Spinner       | "Still loading…" (after 8s)    |

---

## Inside tables

When a table has no rows, render a single full-span row with the empty state. **Don't** show empty headers.

```html
<tr>
  <td colspan="4" class="py-16">
    <div class="text-center">
      <svg class="text-text-muted mx-auto size-10">...</svg>
      <p class="text-h4 mt-3 font-semibold">No executions yet</p>
      <p class="text-body-sm text-text-secondary mx-auto mt-1 max-w-[40ch]">
        Run this workflow to see results here.
      </p>
      <button class="btn-primary mt-6">Run now</button>
    </div>
  </td>
</tr>
```

---

## Inside charts

When a chart has no data:

- Render the axes and gridlines (so the user knows where data would go)
- Overlay a centered message:

```html
<div class="relative">
  <Chart data="{[]}" />
  <!-- renders empty axes -->
  <div class="absolute inset-0 flex items-center justify-center">
    <div class="text-center">
      <p class="text-body-md font-medium">No data for this range</p>
      <p class="text-caption text-text-muted">Try a different time period.</p>
    </div>
  </div>
</div>
```

---

## Inside drawers/inspectors

When a node has no logs, no schema, no preview yet:

- Use the inline (small) variant
- Inside a `bg-bg-surface` panel, padded
- Always offer a hint about what triggers the data ("Run the workflow to populate")

---

## Loading vs empty

Don't show empty state until data is **confirmed empty** (request resolved). While loading: skeletons.

```jsx
{
  loading ? (
    <SkeletonRows count={5} />
  ) : data.length === 0 ? (
    <EmptyState />
  ) : (
    <Table data={data} />
  );
}
```

---

## Usage rules

✅ **Do**

- Always include an empty state for every list/table/feed
- Use line-art icons only
- Be specific: tell the user what's missing AND how to fill it
- Provide a CTA when an action exists; just info when it doesn't
- Distinguish zero / no-results / error states clearly

❌ **Don't**

- Use stock illustrations or 3D characters
- Apologize ("Sorry, nothing here")
- Use exclamation marks ("Oops!", "Yikes!")
- Show empty state during loading — show skeletons
- Hide the table headers in empty state (keeps context)
