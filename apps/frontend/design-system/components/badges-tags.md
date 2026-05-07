# Badges & Tags

Compact labels for status, categories, IDs, counts. Always tight, never decorative.

---

## Anatomy

```
┌──────────────────┐
│ ● label    [×?]  │   ← height 20 (sm) or 24 (md)
└──────────────────┘
   px-2 (sm) / px-2.5 (md), gap 1.5
   radius-xs (2px)
```

---

## Sizes

| Size   | Height | Padding-x | Text       | Icon | Use                         |
| ------ | ------ | --------- | ---------- | ---- | --------------------------- |
| sm     | 20px   | 6px       | 12px / 500 | 12px | Inline within rows / tables |
| **md** | 24px   | 8px       | 12px / 500 | 14px | Default                     |

---

## Variants

### 1 · Status (filled, with prefix dot)

For run state, lifecycle, system state. Filled background tinted, text in semantic color.

```html
<!-- Success -->
<span
  class="bg-success-surface text-success text-caption inline-flex h-5 items-center gap-1.5 rounded-xs px-1.5 font-medium"
>
  <span class="bg-success size-1 rounded-full"></span>
  Success
</span>
```

**Pre-defined statuses**
| Status | Surface | Text | Dot |
|---|---|---|---|
| Running | `info-surface` | `info` | `info` (animated pulse) |
| Success | `success-surface` | `success` | `success` |
| Failed | `error-surface` | `error` | `error` |
| Queued | `bg-inset` | `text-muted` | `text-muted` |
| Retrying | `warning-surface` | `warning` | `warning` (pulse) |
| Skipped | `bg-inset` | `neutral-500` | `neutral-500` |
| Paused | `bg-inset` | `text-secondary` | `text-secondary` |

### 2 · Outline (categories, tags, tech labels)

Neutral container, used for grouping and metadata.

```html
<span
  class="border-default text-text-secondary text-caption inline-flex h-5 items-center rounded-xs border px-1.5 font-medium"
>
  trigger
</span>
```

### 3 · Solid (counts, KPIs)

Forest-tinted, used for emphasis or counts.

```html
<span
  class="bg-forest-800 text-forest-200 text-caption inline-flex h-5 items-center rounded-xs px-1.5 font-semibold tabular-nums"
>
  142
</span>
```

### 4 · Mono (IDs, versions, hashes)

Technical metadata. Always mono.

```html
<span
  class="bg-bg-inset border-subtle text-mono-sm text-text-secondary inline-flex h-5 items-center rounded-xs border px-1.5 font-mono"
>
  v1.2.4
</span>
```

### 5 · Closeable / Removable

Has an `×` icon for removal. Used in tag inputs, filter chips.

```html
<span
  class="bg-forest-800 text-forest-200 text-caption inline-flex h-6 items-center gap-1 rounded-xs px-2"
>
  production
  <button
    aria-label="Remove tag"
    class="text-forest-300 hover:text-cream-50 inline-flex size-3 items-center justify-center"
  >
    ×
  </button>
</span>
```

### 6 · Numeric badge (notification dot)

Minimal, attached to icons.

```html
<div class="relative inline-block">
  <button aria-label="Notifications" class="size-9 rounded-sm">🔔</button>
  <span
    class="bg-error text-cream-50 absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums"
  >
    3
  </span>
</div>
```

For unread indicator without a number: 8px circle, no padding.

### 7 · KBD (keyboard shortcut)

Inline keyboard key indicator, often inside menus or tooltips.

```html
<kbd
  class="bg-bg-inset border-default text-mono-sm text-text-secondary inline-flex h-5 min-w-5 items-center justify-center rounded-xs border px-1 font-mono"
>
  ⌘K
</kbd>
```

---

## States

| State                       | Visual                                   |
| --------------------------- | ---------------------------------------- |
| Default                     | as defined per variant                   |
| Hover (interactive only)    | bg darkens by ~4%                        |
| Focus                       | `shadow-focus-ring`                      |
| Animated (running/retrying) | dot pulses 1.4s, surface gently breathes |

### Pulse animation for active states

```css
@keyframes status-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(0.85);
  }
}
.status-dot--pulse {
  animation: status-pulse 1.4s ease-in-out infinite;
}
```

---

## Composition

### Stack

Multiple tags in a row use `gap-1.5` (6px).

```html
<div class="flex flex-wrap items-center gap-1.5">
  <span class="badge badge--success">● Active</span>
  <span class="badge badge--outline">production</span>
  <span class="badge badge--mono">v1.2.4</span>
</div>
```

### Inside a button

```html
<button class="btn-secondary inline-flex items-center gap-2">
  Workflows
  <span class="badge badge--solid">24</span>
</button>
```

### Inside a row

- Gap between row text and badge: 8px
- Vertical-align: center
- Truncate the row text first, never the badge

---

## Usage rules

✅ **Do**

- Use status pills for any run / lifecycle state
- Use mono for IDs, versions, hashes — never sans
- Use a leading dot (●) for status, icon for category, nothing for plain labels
- Keep badges within `h-5` or `h-6` — don't make them button-sized

❌ **Don't**

- Use radius > 4px (pills break the boxy aesthetic — only the round notification dot is allowed)
- Stack 5+ badges on a row (refactor: show first 3 + "+N more")
- Use color alone for status (always include text or icon)
- Use a badge as a button (use a button with a badge inside)
- Render long text inside a badge — max 16 chars; if longer, use a link

---

## Accessibility

- Status badges: include text label, not just dot color
- Removable tags: `<button aria-label="Remove {tag}">`, focusable, Enter/Space to remove
- Pulsing animation: respect `prefers-reduced-motion` and disable
- Notification badges: `aria-label="3 unread notifications"` on the parent button
