# Icons

Iconography is structural, not decorative. Line-art only, consistent stroke, geometric.

---

## Library

**Primary:** [Lucide](https://lucide.dev) (`lucide-react`, `lucide-vue`, etc.)

- Open source, 1500+ icons
- 1.5px stroke at 24px viewBox — perfect match for this system
- Excellent geometric clarity

**Avoid:**

- Heroicons solid (too heavy)
- Material Icons (filled feels off-brand)
- Emoji (inconsistent rendering across OS)
- FontAwesome (filled by default, dated)

---

## Sizes

Icon size always tracks text size. **One size below the text it accompanies** for inline use.

| Token  | Size | Stroke | Use with                               |
| ------ | ---- | ------ | -------------------------------------- |
| `xs`   | 12px | 1.5    | Badge dots, table cells                |
| `sm`   | 14px | 1.5    | `body-sm` text                         |
| **md** | 16px | 1.5    | **Default** — buttons, body-md, inputs |
| `lg`   | 20px | 1.5    | `h3`/`h4`, sidebar icons               |
| `xl`   | 24px | 1.5    | `h2`, large nav, empty states          |
| `2xl`  | 32px | 2.0    | Hero icons, illustrations              |
| `3xl`  | 40px | 2.0    | Empty state icons (line-art)           |

```html
<svg class="size-4" stroke-width="1.5" viewBox="0 0 24 24" fill="none">...</svg>
```

---

## Color rules

Icons inherit `currentColor`. Set color via the parent text class.

| Context                   | Color                                                  |
| ------------------------- | ------------------------------------------------------ |
| Inline body text          | `text-text-secondary`                                  |
| Inside primary button     | `text-cream-50`                                        |
| Inside secondary button   | `text-text-primary`                                    |
| Active state              | `text-forest-300`                                      |
| Status icon               | matching semantic (`text-success`, `text-error`, etc.) |
| Decorative (empty states) | `text-text-muted`                                      |
| Disabled                  | `text-text-disabled`                                   |

```html
<button class="btn-secondary">
  <svg class="size-4">...</svg>
  <!-- inherits text-text-primary -->
  Filter
</button>
```

---

## Stroke conventions

- **1.5px** at 16–24px sizes (Lucide default)
- **2px** at 32px+ for visual weight
- `stroke-linecap: round`, `stroke-linejoin: round`
- Never mix filled and stroked icons in the same UI
- Never combine 1.5 and 2 stroke at the same size

---

## Reserved meanings

To keep the language consistent across the app:

| Concept         | Lucide icon                    | Notes                                          |
| --------------- | ------------------------------ | ---------------------------------------------- |
| Workflow        | `Workflow` or `Network`        |                                                |
| Run / Execute   | `Play`                         | filled triangle is fine here, single exception |
| Pause           | `Pause`                        |                                                |
| Stop            | `Square`                       |                                                |
| Trigger         | `Zap`                          | webhooks, schedules                            |
| Schedule        | `Clock`                        |                                                |
| Webhook         | `Webhook`                      |                                                |
| HTTP            | `Globe` or `Cloud`             |                                                |
| Database        | `Database`                     |                                                |
| Code            | `Code2`                        |                                                |
| Settings        | `Settings` (gear)              |                                                |
| Search          | `Search`                       |                                                |
| Filter          | `SlidersHorizontal`            |                                                |
| Sort            | `ArrowUpDown`                  |                                                |
| Add / Create    | `Plus`                         |                                                |
| More menu       | `MoreHorizontal` (⋯)           | always horizontal                              |
| Close           | `X`                            |                                                |
| Check / success | `Check`                        |                                                |
| Error           | `AlertCircle`                  |                                                |
| Warning         | `AlertTriangle`                |                                                |
| Info            | `Info`                         |                                                |
| External link   | `ArrowUpRight`                 |                                                |
| Copy            | `Copy`                         |                                                |
| Delete          | `Trash2`                       | always Trash2, not Trash                       |
| Edit            | `Pencil`                       | not Edit                                       |
| User            | `User`                         | single user                                    |
| Team            | `Users`                        | multiple                                       |
| Notification    | `Bell`                         |                                                |
| Drag handle     | `GripVertical`                 |                                                |
| Expand          | `ChevronDown` / `ChevronRight` | rotate on toggle                               |

---

## Icon button (recap)

When an icon is the only content of a button:

```html
<button
  aria-label="Delete workflow"
  class="text-text-secondary hover:text-text-primary duration-fast inline-flex size-9 items-center justify-center rounded-sm transition-colors hover:bg-white/[0.04]"
>
  <svg class="size-4">...</svg>
</button>
```

- Square hit target: `size-9` (36px) for default, `size-8` (32px) compact, `size-10` (40px) large
- **Always include `aria-label`**
- Icon color: `text-text-secondary` default, `text-text-primary` on hover

---

## Animated icons

### Spinner (loading)

```html
<svg
  class="text-forest-300 size-4 animate-spin"
  viewBox="0 0 16 16"
  fill="none"
  stroke="currentColor"
  stroke-width="1.5"
>
  <circle cx="8" cy="8" r="6" stroke-dasharray="28 12" stroke-linecap="round" />
</svg>
```

### Chevron toggle

Rotate 90° on expand:

```html
<svg
  class="duration-fast size-4 transition-transform data-[expanded=true]:rotate-90"
>
  <!-- chevron-right path -->
</svg>
```

### Status pulse

For "running" indicators — see `components/badges-tags.md` § Pulse animation.

---

## Custom icons

If a needed concept isn't in Lucide:

1. Match Lucide's grid: 24×24 viewBox, 1.5px stroke, round caps/joins
2. Center the glyph with 2px padding from edges
3. Use only horizontal/vertical/45° lines where possible (Swiss geometry)
4. Single color (`currentColor`), no fills, no gradients
5. Save as React component or inline SVG (don't use `<img>` for app icons)

Custom icon template:

```jsx
export function CustomIcon({ size = 16, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* paths */}
    </svg>
  );
}
```

---

## Usage rules

✅ **Do**

- Use Lucide as the source of truth
- Keep stroke width consistent within a screen
- Use `currentColor` so icons adapt to context
- Add `aria-label` for icon-only buttons; `aria-hidden="true"` for decorative

❌ **Don't**

- Mix filled and stroked icons
- Use emoji as functional UI icons
- Color icons with semantic meaning unless they ARE semantic (status icons OK; brand icons NOT)
- Resize icons by stretching — always re-export at the right size
- Use icons without labels in primary nav (Swiss = clarity over cleverness)
