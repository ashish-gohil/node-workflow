# Inputs

All input variants share the same skeleton: 36px control height, 4px radius, 1px `border-strong` outline. Labels live above (Swiss alignment), never floating.

---

## Anatomy

```
[h6 eyebrow]   LABEL                              ← 12px caption, tracking-wider
┌────────────────────────────────────────┐
│  [leading]   Value or placeholder      │       ← 36px tall, padding-x 12
└────────────────────────────────────────┘
[ Helper or error message ]                       ← 12px, reserved 16px space
```

Sizes: sm 32 · **md 36 (default)** · lg 40

---

## Variants

### 1 · Text input

```html
<div class="flex flex-col gap-1.5">
  <label class="text-h6 uppercase tracking-wider text-text-secondary">
    Workflow name
  </label>
  <input type="text" placeholder="My workflow"
         class="h-9 px-3 bg-bg-surface border border-strong rounded-sm
                text-body-md text-text-primary
                placeholder:text-text-muted
                hover:border-intense
                focus:outline-none focus:border-forest-400
                focus:shadow-focus-ring
                disabled:bg-bg-inset disabled:text-text-disabled
                transition duration-fast" />
  <span class="text-caption text-text-muted">
    Lowercase, hyphens only
  </span>
</div>
```

### 2 · With leading icon
```html
<div class="relative">
  <svg class="absolute left-3 top-1/2 -translate-y-1/2 size-4
              text-text-muted pointer-events-none">...</svg>
  <input class="h-9 pl-9 pr-3 ..." placeholder="Search workflows" />
</div>
```

### 3 · Mono input (env vars, expressions, regex)
```html
<input class="h-9 px-3 font-mono text-mono-md tabular-nums
              bg-bg-inset border border-strong rounded-sm
              ..." placeholder="{{ $json.id }}" />
```
- Background uses `bg-inset` to signal "this is code/data"
- Always use mono font + tabular nums
- Wider tracking allowed: `tracking-wide` for readability

### 4 · Textarea

```html
<textarea rows="4"
  class="px-3 py-2 bg-bg-surface border border-strong rounded-sm
         text-body-md leading-body-md resize-y min-h-[88px]
         focus:outline-none focus:border-forest-400 focus:shadow-focus-ring
         transition duration-fast"></textarea>
```
- Min height 88px (4 lines), resize: vertical only
- For code/JSON: add `font-mono`, `bg-bg-inset`, `whitespace-pre`

### 5 · Select (native)

```html
<div class="relative">
  <select class="h-9 px-3 pr-9 appearance-none w-full
                 bg-bg-surface border border-strong rounded-sm
                 text-body-md text-text-primary
                 hover:border-intense
                 focus:outline-none focus:border-forest-400
                 focus:shadow-focus-ring transition duration-fast">
    <option>HTTP Request</option>
    <option>Webhook</option>
    <option>Schedule</option>
  </select>
  <svg class="absolute right-3 top-1/2 -translate-y-1/2 size-4
              text-text-muted pointer-events-none">▾</svg>
</div>
```

### 6 · Combobox (custom dropdown with search)

Trigger uses input styling. Menu is a popover:

**Menu spec**
- `bg: bg-elevated`
- `border: 1px border-default`
- `radius: sm`
- `shadow: md`
- `max-height: 320px`, scrollable
- Padding: 4px (the menu pad), items 8px 12px
- Item hover: `bg: rgba(255,255,255,0.04)`
- Item selected: `bg: forest-800`, prefix check icon `forest-300`
- Empty state: `text-text-muted`, italic, "No matches"

```
┌──────────────────────────────────────┐
│ [search] Filter…                    │  ← 36px input
├──────────────────────────────────────┤
│ ✓  HTTP Request          common      │  ← selected, mono meta
│    Webhook               trigger     │
│    Schedule              trigger     │
│    Code                  transform   │
└──────────────────────────────────────┘
```

### 7 · Multi-select / Tag input

Selected values appear as inline chips inside the input control.

```html
<div class="min-h-[36px] flex flex-wrap items-center gap-1.5
            px-2 py-1 bg-bg-surface border border-strong rounded-sm
            focus-within:border-forest-400 focus-within:shadow-focus-ring
            transition duration-fast">
  <!-- chip -->
  <span class="inline-flex items-center gap-1 h-6 px-2
               rounded-xs bg-forest-800 text-forest-200 text-caption">
    production
    <button class="text-forest-300 hover:text-cream-50">×</button>
  </span>
  <!-- input -->
  <input class="flex-1 min-w-[80px] bg-transparent text-body-md
                outline-none placeholder:text-text-muted"
         placeholder="Add tag…" />
</div>
```

### 8 · Checkbox & Radio

Sharp corners (radius `xs` for checkbox, full circle for radio).
- Size: 16px box, 16px radio
- Default: `border 1px border-strong`, `bg bg-surface`
- Checked: `bg forest-500`, `border forest-500`, white check icon
- Indeterminate: `bg forest-500`, white horizontal bar
- Focus: `shadow-focus-ring`
- Label: `body-md`, gap 8px right of control

```html
<label class="inline-flex items-start gap-2 cursor-pointer">
  <input type="checkbox"
         class="appearance-none size-4 mt-0.5 rounded-xs
                bg-bg-surface border border-strong
                checked:bg-forest-500 checked:border-forest-500
                focus-visible:shadow-focus-ring
                transition duration-fast" />
  <span class="text-body-md">Enable webhook authentication</span>
</label>
```

### 9 · Switch (toggle)

For binary settings only. 28×16 track, 12×12 thumb.

```html
<button role="switch" aria-checked="true"
        class="relative w-7 h-4 rounded-full transition duration-fast
               bg-forest-500 aria-[checked=false]:bg-neutral-400">
  <span class="absolute top-0.5 left-0.5 size-3 rounded-full bg-cream-50
               transition duration-fast translate-x-3
               aria-[checked=false]:translate-x-0"></span>
</button>
```

### 10 · Slider

- Track: 2px height, `border-default`
- Filled portion: `forest-500`
- Thumb: 16px circle, `bg-cream-50`, `border 1px forest-500`, `shadow-sm`
- Hover thumb: 18px (subtle scale)
- Focus thumb: `shadow-focus-ring`

---

## States — full matrix

| State | Border | Background | Text | Other |
|---|---|---|---|---|
| Default | `border-strong` | `bg-surface` | `text-primary` | — |
| Hover | `border-intense` | same | same | cursor: text |
| Focus | `border-focus` (`forest-400`) | same | same | `shadow-focus-ring` |
| Filled | same | same | `text-primary` | — |
| Error | `border: error` | same | same | helper red |
| Success | `border: success` | same | same | rare; for inline validation |
| Disabled | `border-subtle` | `bg-inset` | `text-disabled` | cursor: not-allowed |
| Read-only | `border-subtle` | `bg-inset` | `text-secondary` | no focus ring |

---

## Helper / Error messages

Always reserve 16px below the input even when empty (prevents layout shift).

```html
<span class="block min-h-4 text-caption text-text-muted
             data-[state=error]:text-error">
  Helper text or error message
</span>
```

Error pattern:
- Border red (`error`)
- Helper text red, prefix with 12px alert icon
- `aria-invalid="true"`, `aria-describedby` linking to error span

---

## Form layout

- Single column for forms < 4 fields
- Two columns max (12-col grid: each field spans 6) for dense settings
- Section breaks: `h6` eyebrow + `border-b border-subtle` divider
- Grouped inputs (e.g., date range): use a fieldset with shared `border` and child inputs joined like a button group

---

## Usage rules

✅ **Do**
- Place labels above inputs (left-aligned, never floating)
- Always reserve helper space (16px) to prevent jump on error
- Use mono inputs for technical fields (env vars, URLs, regex, JSON)
- Match input height to button height in adjacent rows
- Make the entire label clickable (wrap input + label in `<label>`)

❌ **Don't**
- Floating labels (anti-Swiss, hides content)
- Placeholder as a label substitute
- Pill-shaped inputs (radius > 4px breaks the boxy system)
- Inline label + input on the same row for stacked forms (only for inline filters)
- Rely on color alone for error state — always pair with text

---

## Accessibility

- Every input has a programmatically associated `<label>`
- Required: append `<span aria-hidden="true">*</span>` and add `aria-required="true"`
- Error: `aria-invalid="true"` + `aria-describedby` pointing at the error message
- Disabled: prefer `aria-disabled="true"` over `disabled` if the field still needs to be focusable for screen readers
- Min hit target 32×32 for checkboxes/radios (extend with padding around the visual)
