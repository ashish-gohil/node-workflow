# FLOW semantic token → Tailwind class reference

All of these are theme-aware: they automatically adapt for dark / light / brutalist.

## Backgrounds

| Tailwind class   | When to use                                       |
|------------------|---------------------------------------------------|
| `bg-bg-canvas`   | Page base / infinite canvas                       |
| `bg-bg-surface`  | Cards, panels, sidebars                           |
| `bg-bg-elevated` | Dropdowns, popovers, raised cards                 |
| `bg-bg-overlay`  | Modals, drawers                                   |
| `bg-bg-inset`    | Inset wells (code blocks, inputs, inner regions)  |

## Text

| Tailwind class      | When to use                            |
|---------------------|----------------------------------------|
| `text-text-primary` | Body copy, headings, default text      |
| `text-text-secondary` | Supporting labels, descriptions      |
| `text-text-muted`   | Placeholder, icon labels, timestamps  |
| `text-text-disabled` | Inactive / disabled states           |
| `text-text-brand`   | Brand-colored text, links             |

## Borders

| Tailwind class        | When to use                        |
|-----------------------|------------------------------------|
| `border-border-subtle`  | Dividers, faint section breaks   |
| `border-border-default` | Default element borders          |
| `border-border-strong`  | Emphasized / active borders      |
| `border-border-intense` | High-contrast borders            |
| `border-border-focus`   | Focus rings on interactive elems |
| `border-border-brand`   | Brand-colored borders            |
| `border-border-stamp`   | Stamp button / card borders      |

## Accents

| Tailwind class       | When to use                             |
|----------------------|-----------------------------------------|
| `bg-accent-primary`  | Primary action background (CTA)         |
| `bg-accent-hover`    | Hover state of primary actions          |
| `bg-accent-press`    | Active/pressed state                    |
| `bg-accent-subtle`   | Tinted background for selected items    |
| `text-accent-primary` | Brand-colored icons or text           |
| `text-accent-on`     | Text on top of accent background        |

## Shadows

| Tailwind class       | When to use                             |
|----------------------|-----------------------------------------|
| `shadow-sm`          | Subtle lift (default)                   |
| `shadow-md`          | Elevated panels                         |
| `shadow-lg`          | Modals, overlays                        |
| `shadow-xl`          | Toasts, highest elevation               |
| `shadow-glow-brand`  | Active node / selected state glow       |
| `shadow-glow-error`  | Error highlight glow                    |
| `shadow-card`        | Card with left-edge accent              |
| `shadow-overlay`     | Drawer / sheet accent shadow            |

## Semantic status colors (static, theme-independent)

| Tailwind class       | Value     |
|----------------------|-----------|
| `text-success`       | `#52B788` |
| `bg-success-surface` | `rgba(82, 183, 136, 0.12)` |
| `text-error`         | `#E5484D` |
| `bg-error-surface`   | `rgba(229, 72, 77, 0.12)` |
| `text-warning`       | `#F5A524` |
| `bg-warning-surface` | `rgba(245, 165, 36, 0.12)` |
| `text-info`          | `#5EB1EF` |
| `bg-info-surface`    | `rgba(94, 177, 239, 0.12)` |

## Palette classes (use sparingly — prefer semantic tokens)

```
Forest:  bg-forest-{50|100|200|300|400|500|600|700|800|900}
Cream:   bg-cream-{50|100|200|300|400}
Lime:    bg-lime-{50|100|200|300|400|500|600|700}  ← brutalist only
Neutral: bg-neutral-{0|50|100|200|300|400|500|600|700|800}
```
