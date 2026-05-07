# Pattern · Forms

Settings, configuration, and any multi-field input surface. Built on consistent vertical rhythm.

---

## Form anatomy

```
┌──────────────────────────────────────┐
│ SECTION TITLE                        │  ← h6 eyebrow
│ Section description                  │  ← body-sm / text-secondary
│                                      │
│ Label                                │  ← h6 eyebrow
│ ┌──────────────────────────────────┐ │
│ │ input                            │ │
│ └──────────────────────────────────┘ │
│ Helper text                          │
│                                      │
│ Label                                │
│ ┌──────────────────────────────────┐ │
│ │ input                            │ │
│ └──────────────────────────────────┘ │
│                                      │
├──────────────────────────────────────┤  ← border-subtle
│                  [Cancel] [Save]     │  ← actions, right-aligned
└──────────────────────────────────────┘
```

---

## Layouts

### 1 · Single column (default)

- Max-width: `560px` (`max-w-prose` or custom)
- Each field in vertical stack
- Use for: settings sub-pages, create dialogs, login

### 2 · Side-labeled (settings)

Two-column inside one row: label left, input right. Used in long settings forms.

```html
<div class="border-subtle grid grid-cols-12 gap-6 border-b py-5">
  <div class="col-span-4">
    <label class="text-body-md font-medium">Workflow name</label>
    <p class="text-body-sm text-text-secondary mt-1">
      Used as the display name across the app.
    </p>
  </div>
  <div class="col-span-8">
    <input class="input w-full max-w-md" />
  </div>
</div>
```

- Label column: 4/12 — title (`body-md` 500) + description (`body-sm`)
- Input column: 8/12 — control + helper
- Each row separated with `border-b border-subtle`
- Section padding: `py-5` per row

### 3 · Two-column compact

Two fields side-by-side for related inputs (first/last name, country/region, start/end date).

```html
<div class="grid grid-cols-2 gap-4">
  <FormField label="First name" />
  <FormField label="Last name" />
</div>
```

### 4 · Inline / horizontal (filters)

Rare. Only for filter/search bars. Labels visually hidden but ARIA-present.

---

## Field component (canonical)

```html
<div class="flex flex-col gap-1.5">
  <label
    for="name"
    class="text-h6 text-text-secondary tracking-wider uppercase"
  >
    Workflow name
    <span class="text-error" aria-hidden="true">*</span>
  </label>
  <input
    id="name"
    required
    aria-required="true"
    class="input"
    placeholder="My workflow"
  />
  <span class="text-caption text-text-muted block min-h-4">
    Lowercase, hyphens only
  </span>
</div>
```

**Spec**

- Gap label↔input: `space-1.5` (6px)
- Helper has `min-h-4` always (prevents layout jump on error)
- Required asterisk: `text-error`, `aria-hidden`, paired with `aria-required`

---

## Sections

Group related fields with eyebrow + description, separated by `space-10` (40px).

```html
<section class="space-y-6">
  <header>
    <h6 class="text-h6 text-text-secondary tracking-wider uppercase">
      Authentication
    </h6>
    <p class="text-body-sm text-text-secondary mt-1 max-w-prose">
      Configure how the webhook validates incoming requests.
    </p>
  </header>

  <div class="space-y-5">
    <!-- fields -->
  </div>
</section>
```

---

## Vertical rhythm

| Gap                                 | Value             | Use      |
| ----------------------------------- | ----------------- | -------- |
| Within a field (label↔input↔helper) | 6px               | required |
| Between fields                      | 20px (`space-5`)  | default  |
| Between two-column rows             | 16px (`space-4`)  | compact  |
| Between sections                    | 40px (`space-10`) | required |
| Before action footer                | 32px (`space-8`)  | required |

---

## Action footer

Always sticky at the bottom on long forms. Right-aligned, primary on the right.

```html
<footer
  class="z-sticky bg-bg-canvas border-subtle sticky bottom-0 -mx-6 mt-8 flex items-center justify-between gap-3 border-t px-6 py-4"
>
  <button class="btn-ghost">Discard changes</button>
  <div class="flex items-center gap-2">
    <span class="text-caption text-text-muted"> Last saved 2m ago </span>
    <button class="btn-secondary">Cancel</button>
    <button class="btn-primary">Save changes</button>
  </div>
</footer>
```

**Spec**

- Sticky bottom on scrollable forms
- Min-height: `56px`
- Background: `bg-canvas` (matches page) — important for sticky readability
- Border-top: `border-subtle`
- Discard / destructive on the left (ghost or destructive variant)
- Primary on the right (always)

---

## Validation

### Inline validation (real-time)

- Show on **blur**, not on every keystroke
- After first error, switch to `onChange` (so user sees it clearing as they type)
- Border becomes `error`, helper text becomes the error message

```html
<input
  aria-invalid="true"
  aria-describedby="email-error"
  class="input border-error focus:border-error focus:shadow-[0_0_0_3px_rgba(229,72,77,0.25)]"
/>
<span id="email-error" class="text-caption text-error">
  Enter a valid email address
</span>
```

### Submit validation

- On submit, scroll to first error field
- Focus that field
- Add a top-of-form summary if there are 3+ errors:

```html
<div
  role="alert"
  class="bg-error-surface border-error/30 mb-6 flex items-start gap-3 rounded-sm border p-4"
>
  <svg class="text-error mt-0.5 size-4 shrink-0">⚠</svg>
  <div>
    <p class="text-body-md text-error font-semibold">3 fields need attention</p>
    <ul class="text-body-sm text-text-secondary mt-1 list-inside list-disc">
      <li>Email is required</li>
      <li>Password must be 8+ characters</li>
      <li>Workflow name already exists</li>
    </ul>
  </div>
</div>
```

---

## Field types — composition

### Required

Append asterisk, `aria-required="true"`. Don't write "(required)" — visual is enough.

### Optional

Append `(Optional)` after the label, `text-text-muted` weight 400. Or, if "most fields are optional," mark required ones instead. Pick one rule per form.

### With prefix/suffix

For URLs, file paths, environment vars:

```
┌──────────┬──────────────────┬─────┐
│ https:// │  example.com     │ /v1 │
└──────────┴──────────────────┴─────┘
```

- Prefix/suffix: `bg-bg-inset`, `border-r/l border-strong`, `text-text-muted`, `font-mono` if technical
- Padding: 12px

### File upload

- Dashed-border drop zone (radius-sm) with icon + text
- Or button + filename display with remove (`×`)
- Show file size in `mono-sm`, `tabular-nums`

### Code editor

- Embed Monaco / CodeMirror styled to tokens
- Background: `bg-bg-inset`
- Font: `font-mono`, 13px
- Line numbers: `text-text-muted`
- Border: `border-default`, `radius-sm`
- Header bar above with language selector + format button

---

## Multi-step forms (wizards)

```
┌──────────────────────────────────────────────┐
│  ① Connect ──── ② Configure ──── ③ Review    │   ← step indicator
│   done            current          pending    │
├──────────────────────────────────────────────┤
│                                              │
│   Form fields for current step               │
│                                              │
├──────────────────────────────────────────────┤
│  Step 2 of 3                [Back] [Next →]  │
└──────────────────────────────────────────────┘
```

### Step indicator

- Step circle: `size-6`, mono number
- Done: `bg-forest-500`, white check icon (replaces number)
- Current: `bg-bg-elevated`, `border-2 border-forest-500`, mono number `text-forest-300`
- Pending: `bg-bg-surface`, `border border-default`, mono number `text-text-muted`
- Connector line: 1px `border-default`, becomes `forest-500` between completed steps

---

## Save patterns

### Auto-save

- Show small unobtrusive indicator: "Saving…" → "Saved 2m ago"
- Use `text-caption`, `text-text-muted` in the footer
- Trigger on blur or after 1.5s idle

### Explicit save

- Disable Save button until form is `dirty` AND `valid`
- Show keyboard hint: `[Save] ⌘S`
- Bind `⌘S` to submit

### Optimistic

- Apply changes immediately, show "Saving…" toast
- On error: revert + error toast with retry button

---

## Usage rules

✅ **Do**

- Always reserve helper text height (no jump on error)
- Keep labels above inputs (Swiss alignment)
- Group related fields under section eyebrows
- Sticky footer for long forms
- Show what's required, consistently

❌ **Don't**

- Floating labels (anti-Swiss, hides content when filled)
- Validate on every keystroke (annoying)
- Submit on Enter from textareas (use only from single-line inputs)
- Reset the form silently after save — show a confirmation toast
- Mix label-on-top and label-on-side in the same form

---

## Accessibility

- `<label for>` linked to every input's `id`
- `aria-required="true"` on required fields (visual asterisk is decorative)
- `aria-invalid="true"` + `aria-describedby` on error
- Group sections in `<fieldset>` with `<legend>` (visually hidden if not needed)
- `aria-live="polite"` on save status indicators
- Submit button never `disabled` for screen readers — use `aria-disabled="true"` instead, so users can still focus and learn why
