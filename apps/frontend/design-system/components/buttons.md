# Buttons

Boxy, low-radius (4px) buttons. Type-led, never decorative. One primary action per view.

---

## Anatomy

```
┌──────────────────────────────────┐
│  [icon]   Label text   [icon]    │
└──────────────────────────────────┘
   ↑px-3/4    ↑gap-2     ↑px-3/4
   height: 32 (sm) · 36 (md) · 40 (lg)
   radius: 4px  ·  border-width: 1px
```

## Sizes

| Size             | Height | Padding-x | Text       | Icon |
| ---------------- | ------ | --------- | ---------- | ---- |
| sm               | 32px   | 12px      | 13px / 500 | 14px |
| **md** (default) | 36px   | 16px      | 14px / 500 | 16px |
| lg               | 40px   | 20px      | 14px / 500 | 16px |

Icon-only: square (height = width). Always include `aria-label`.

---

## Variants

### Primary

The single most-important action. Maximum one per view.

```html
<button
  class="text-body-md bg-forest-500 text-cream-50 hover:bg-forest-400 active:bg-forest-600 focus-visible:outline-forest-400 duration-fast h-9 rounded-sm px-4 font-medium transition-colors focus-visible:outline focus-visible:outline-[1.5px] focus-visible:outline-offset-2 disabled:bg-neutral-300 disabled:text-neutral-500"
>
  Run workflow
</button>
```

### Secondary

Default for most actions.

```html
<button
  class="text-body-md bg-bg-elevated text-text-primary border-default hover:bg-bg-overlay hover:border-strong active:bg-bg-surface duration-fast h-9 rounded-sm border px-4 font-medium transition-colors disabled:opacity-50"
>
  Cancel
</button>
```

### Ghost

For toolbars, menu items, low-emphasis actions.

```html
<button
  class="text-body-md text-text-primary disabled:text-text-disabled duration-fast h-9 rounded-sm bg-transparent px-3 font-medium transition-colors hover:bg-white/[0.04] active:bg-white/[0.08]"
>
  <svg class="size-4">...</svg>
  Filter
</button>
```

### Destructive

Irreversible actions only. Always pair with confirmation modal.

```html
<button
  class="text-body-md text-error border-error hover:bg-error/10 active:bg-error/20 duration-fast h-9 rounded-sm border bg-transparent px-4 font-medium transition-colors disabled:opacity-50"
>
  Delete workflow
</button>
```

### Link

Inline text actions.

```html
<button
  class="text-body-md text-forest-300 hover:text-forest-200 disabled:text-text-disabled duration-fast font-medium underline-offset-2 transition-colors hover:underline"
>
  View details →
</button>
```

### Icon-only

```html
<button
  aria-label="More options"
  class="text-text-secondary hover:text-text-primary duration-fast inline-flex size-9 items-center justify-center rounded-sm transition-colors hover:bg-white/[0.04]"
>
  <svg class="size-4">...</svg>
</button>
```

---

### Stamped / Brutalist (marketing & landing CTAs) ⭐

The signature button for marketing pages, hero CTAs, and the brutalist theme. Thick black border, hard offset shadow, lime fill. **Use sparingly** — one or two per page max, never inside the dense app UI.

```
                      ┌──────────────────────────────┐
                      │                              │
                      │   VIEW ALL PROJECTS          │ ──┐
                      │                              │   │ shadow
                      └──────────────────────────────┘   │ offset
                          └─────────────────────────────┘
                          ↑ 2px solid #000 border
                          ↑ shadow: 6px 6px 0 0 #000
                          ↑ bg: lime-200 (#C5F4A5)
                          ↑ text: black, bold/uppercase
```

**Spec**

- Border: `2px solid #000`
- Background: `lime-200` (default), white, or any solid token color
- Text: black, weight 700, often uppercase with `tracking-wide`
- Padding: `12px 24px` (md) — taller than standard buttons
- Radius: `0` or `2px` (`radius-xs`) — never more
- Shadow at rest: `shadow-stamp` (6px 6px 0 0 #000)
- Shadow on hover: `shadow-stamp-lg` (8px 8px) + `translate(-2px, -2px)` (lifts)
- Shadow on press: `shadow-stamp-pressed` (1px 1px) + `translate(5px, 5px)` (sinks)
- Transition: `transform 120ms ease-out, box-shadow 120ms ease-out`

**Default**

```html
<button
  class="shadow-stamp hover:shadow-stamp-lg active:shadow-stamp-pressed duration-fast rounded-none border-2 border-black bg-lime-200 px-6 py-3 font-bold tracking-wide text-black uppercase transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[5px] active:translate-y-[5px]"
>
  View all projects
</button>
```

**Variants** (swap fill / shadow color, keep the rest)
| Name | Fill | Shadow |
|---|---|---|
| Stamp lime (default) | `lime-200` | `#000` |
| Stamp white | `white` | `#000` |
| Stamp forest | `forest-500` | `#000` (text: `cream-50`) |
| Stamp invert | `black` | `lime-300` (text: `lime-200`) — for cream backgrounds |

**Sizes**

- sm: `px-4 py-2`, text `body-sm`, shadow `stamp-sm` (4px), hover `stamp` (6px)
- **md** (default): `px-6 py-3`, text `body-md`, shadow `stamp` (6px), hover `stamp-lg` (8px)
- lg: `px-8 py-4`, text `body-lg`, shadow `stamp-lg` (8px), hover `10px 10px` (custom)

**Press behavior — the satisfying "click"**
The button visually slides down + right when pressed, simulating it being pushed into the page. Combined with the shrunken shadow, it creates a tactile feel.

```css
.btn-stamp:active {
  transform: translate(5px, 5px);
  box-shadow: 1px 1px 0 0 #000;
}
```

**Rules**

- ✅ Use on marketing landing pages, hero CTAs, "Get started" buttons, "Sign up", "Book a call"
- ✅ Use on the brutalist theme (`data-theme="brutalist"`) as the primary button style
- ❌ Don't use inside the app shell / canvas / data tables (too loud)
- ❌ Don't pair more than 2 stamped buttons in the same viewport (chaos)
- ❌ Don't combine with subtle drop shadows on the same screen — pick one shadow language
- ❌ Don't round the corners (`rounded-md`+ on a stamp button looks broken)

---

## States — full matrix

| State    | Primary                                                                                | Secondary                       | Ghost                | Destructive                  |
| -------- | -------------------------------------------------------------------------------------- | ------------------------------- | -------------------- | ---------------------------- |
| Default  | bg `forest.500`, text `cream.50`                                                       | bg `elevated`, border `default` | transparent          | border `error`, text `error` |
| Hover    | bg `forest.400`                                                                        | bg `overlay`, border `strong`   | bg `white/4%`        | bg `error/10%`               |
| Active   | bg `forest.600`                                                                        | bg `surface`                    | bg `white/8%`        | bg `error/20%`               |
| Focus    | outline 1.5px `forest.400`, offset 2px                                                 | same                            | same                 | outline `error`              |
| Disabled | bg `neutral.300`, text `neutral.500`                                                   | opacity 50%                     | text `text-disabled` | opacity 50%                  |
| Loading  | spinner replaces leading icon, label stays, `pointer-events: none`, `aria-busy="true"` |

---

## Loading state

Replace the leading icon with a 16px spinner in `forest.300`. Keep the label so width doesn't jump.

```html
<button
  aria-busy="true"
  disabled
  class="bg-forest-500 text-cream-50 inline-flex h-9 cursor-wait items-center gap-2 rounded-sm px-4"
>
  <svg class="size-4 animate-spin" viewBox="0 0 16 16">
    <circle
      cx="8"
      cy="8"
      r="6"
      stroke="currentColor"
      stroke-width="1.5"
      fill="none"
      stroke-dasharray="28"
      stroke-dashoffset="14"
    />
  </svg>
  Running…
</button>
```

---

## Button groups

Connected siblings — share borders, only the outer corners are rounded.

```
┌──────┬──────┬──────┐
│ Day  │ Week │ Month│   ← `[&>*:not(:first-child)]:-ml-px`
└──────┴──────┴──────┘     `[&>*:first-child]:rounded-l-sm`
                           `[&>*:last-child]:rounded-r-sm`
                           `[&>*:not(:first-child):not(:last-child)]:rounded-none`
```

Active segment: `bg-bg-elevated`, all others ghost.

---

## Usage rules

✅ **Do**

- One primary per view
- Use ghost for toolbar density
- Show loading on async actions > 200ms
- Pair destructive with confirmation
- Place primary on the right of a group (Cancel · Save)

❌ **Don't**

- Two primaries side-by-side
- Drop shadows on buttons (flat, with optional inset highlight)
- Pill / `rounded-full` shapes — breaks boxy aesthetic
- Gradient fills
- Icon-only without `aria-label`
- All-caps body text on buttons (only `h6` eyebrows are uppercase)

---

## Accessibility

- Focus ring: 1.5px solid `forest.400` + 2px offset (always visible on `:focus-visible`)
- Min hit target: 32×32px (sm size meets it)
- `aria-busy="true"` during load
- `aria-label` required for icon-only
- Color is never the sole signal — destructive shows border + label, not just red text
