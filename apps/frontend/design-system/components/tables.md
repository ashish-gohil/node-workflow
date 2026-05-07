# Tables

Data-dense surface. The most "Swiss" component in the system — pure grid, mono numbers, minimal chrome.

---

## Anatomy

```
┌──────────────────────────────────────────────────────┐
│ NAME              STATUS    DURATION    LAST RUN  ⌃  │  ← header (h6 eyebrow)
├──────────────────────────────────────────────────────┤
│ Order pipeline    ● Success    1.2s     2m ago    ⋯  │  ← row (40-56px)
│ ────────────────────────────────────────────────     │  ← border-subtle
│ Email digest      ● Failed     0.8s     8m ago    ⋯  │
│ ────────────────────────────────────────────────     │
│ Slack notify      ● Queued     —        —         ⋯  │
└──────────────────────────────────────────────────────┘
   ↑ no outer border on the table itself when in a card
   ↑ no vertical dividers between cells
```

---

## Density

| Density     | Row height | Cell padding-y | Use                         |
| ----------- | ---------- | -------------- | --------------------------- |
| Compact     | 40px       | 10px           | Logs, executions, dense ops |
| **Default** | 48px       | 14px           | Main resource lists         |
| Comfortable | 56px       | 18px           | Marketing / settings tables |

Cell padding-x: always **16px**.

---

## Header

```html
<thead class="bg-bg-elevated">
  <tr>
    <th
      class="text-h6 text-text-muted border-default z-sticky bg-bg-elevated sticky top-0 h-9 border-b px-4 text-left font-semibold tracking-wider uppercase"
    >
      Name
    </th>
    <th class="h-9 px-4 text-right ...">Duration</th>
  </tr>
</thead>
```

**Spec**

- `h6` style: 12px, uppercase, `tracking-wider`, weight 700
- Color: `text-muted`
- Background: `bg-elevated` (sets it apart from rows)
- Bottom border: `border-default` (1px, solid)
- Sticky on scroll: `position: sticky; top: 0`
- Sortable: chevron icon appears on hover (16px), locks on sort
- Right-aligned for numeric columns, left-aligned for text

---

## Rows

```html
<tbody>
  <tr
    class="border-subtle aria-selected:bg-forest-500/[0.08] duration-fast cursor-pointer border-b transition-colors hover:bg-white/[0.03] aria-selected:shadow-[inset_2px_0_0_0_var(--color-forest-500)]"
  >
    <td class="text-body-md text-text-primary px-4 py-3">
      Order processing pipeline
    </td>
    <td class="px-4 py-3">
      <span class="status-pill status-pill--success">● Success</span>
    </td>
    <td
      class="text-mono-md text-text-secondary px-4 py-3 text-right font-mono tabular-nums"
    >
      1.24s
    </td>
    <td class="text-body-sm text-text-muted px-4 py-3">2m ago</td>
  </tr>
</tbody>
```

**Spec**

- `bg: bg-surface` (default)
- Bottom border: `border-subtle` (1px) — between rows only
- Hover: `bg: rgba(255,255,255,0.03)`
- Selected: `bg: forest-500/8%`, 2px inset left edge `forest-500`
- Cell text: `body-md` (14px), color `text-primary`
- Meta cells: `body-sm`, `text-secondary` or `text-muted`

---

## Cell types & alignment

| Content                  | Font                       | Alignment     | Color            |
| ------------------------ | -------------------------- | ------------- | ---------------- |
| Name / title             | `body-md` 500              | left          | `text-primary`   |
| Description / meta       | `body-sm`                  | left          | `text-secondary` |
| Status                   | pill                       | left          | semantic         |
| Number / duration / size | `mono-md`, `tabular-nums`  | right         | `text-secondary` |
| Date / timestamp         | `body-sm`, optionally mono | right or left | `text-muted`     |
| ID / hash                | `mono-sm`, truncated       | left          | `text-muted`     |
| Actions (row menu)       | icon button                | right         | `text-secondary` |

---

## Selection

### Bulk selection

Add a 40px-wide first column with a checkbox:

```html
<th class="w-10 px-4">
  <input type="checkbox" class="checkbox" />
  <!-- selects all -->
</th>
```

When ≥1 row is selected, render a sticky toolbar above the header:

```
┌──────────────────────────────────────────────────────┐
│ 3 selected      [Tag] [Move] [Delete]      [Clear]   │  ← bg-bg-overlay, h-12
└──────────────────────────────────────────────────────┘
```

---

## Sorting

```
┌─────────────┐
│ NAME      ⌃ │  ← active sort, chevron solid
│ DURATION  ⌄ │  ← active sort, chevron solid (desc)
│ STATUS    ↕ │  ← inactive but sortable, faded chevron on hover
└─────────────┘
```

- Active sort header: `text-primary` instead of `text-muted`
- Chevron: 12px, `text-text-secondary`
- Click to cycle: asc → desc → none

---

## Pagination footer

```
┌──────────────────────────────────────────────────────┐
│ Showing 1–25 of 1,284              [<]  1 / 52  [>]  │
└──────────────────────────────────────────────────────┘
   bg-bg-surface · border-t border-subtle · h-12 · px-4
```

- Range: `body-sm`, `text-text-secondary`, mono numbers
- Page indicator: mono, tabular
- Buttons: ghost, `size-8`, square

For large datasets, prefer **infinite scroll with virtualization** over pagination.

---

## States

### Loading (skeleton)

Replace each row's text with skeleton bars matching cell width.

```html
<tr class="border-subtle border-b">
  <td class="px-4 py-3">
    <div class="skeleton h-4 w-48"></div>
  </td>
  <td class="px-4 py-3">
    <div class="skeleton h-5 w-20 rounded-xs"></div>
  </td>
  <td class="px-4 py-3 text-right">
    <div class="skeleton ml-auto h-4 w-12"></div>
  </td>
</tr>
```

Show 5–8 skeleton rows, then real data.

### Empty

Render a single full-span row, 200px tall, centered:

```html
<tr>
  <td colspan="4" class="py-16 text-center">
    <svg class="text-text-muted mx-auto size-10">...</svg>
    <p class="text-h4 text-text-primary mt-3">No executions yet</p>
    <p class="text-body-sm text-text-secondary mt-1">
      Run a workflow to see results here.
    </p>
  </td>
</tr>
```

### Error

Same shape as empty, with `error` color icon and a "Try again" ghost button.

---

## Variants

### Striped

**Avoid** by default — borders already provide separation. If used, alternate rows: `bg-white/[0.015]`.

### Bordered (full grid)

For comparison tables only. Add `border-x border-default` to cells. Avoid in app surfaces.

### Inside a card

- Remove the table's outer borders (the card provides them)
- Header gets `bg-bg-overlay` to visually nest
- First/last row: no top/bottom border (card handles edges)

---

## Sticky behavior

- **Sticky header**: `position: sticky; top: 0; z-index: 200;` — required for any table > viewport height
- **Sticky first column**: for wide tables (e.g., DAG run history with 20+ columns), pin the name column with `position: sticky; left: 0;` plus `bg-bg-surface` and a right shadow `box-shadow: 1px 0 0 0 var(--border-default)`
- **Sticky footer**: only for tables with totals row

---

## Usage rules

✅ **Do**

- Use `tabular-nums` on every numeric column
- Keep row heights consistent within a table
- Right-align numbers, left-align text
- Truncate long IDs with `text-ellipsis overflow-hidden whitespace-nowrap` and tooltip on hover
- Use semantic status pills, not raw colored text

❌ **Don't**

- Add vertical borders between cells (visual noise)
- Use `text-center` (Swiss tables align by content type, not for prettiness)
- Mix font sizes within rows
- Add row striping AND borders (pick one)
- Make rows shorter than 32px (hit target)

---

## Accessibility

- Use semantic `<table>` / `<thead>` / `<tbody>` / `<th scope="col">`
- Sort buttons: `aria-sort="ascending|descending|none"` on the `<th>`
- Selection checkboxes: `aria-label="Select row {name}"`
- Empty state: announce via `aria-live="polite"` when filtering
- Pagination: announce page change with `aria-live="polite"`
