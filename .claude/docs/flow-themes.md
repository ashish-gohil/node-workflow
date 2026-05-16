# FLOW color theme awareness

The app uses three themes via `[data-theme="dark|light|brutalist"]` on `<html>`.

| Token            | Dark (`#0A0E0C` canvas) | Light (`#F2EDE0` canvas) | Brutalist (marketing) |
|------------------|-------------------------|--------------------------|-----------------------|
| `bg-bg-canvas`   | `#0A0E0C`               | `#F2EDE0`                | `#F5EFE0`             |
| `bg-bg-surface`  | `#101512`               | `#FAF7F0`                | `#FFFFFF`             |
| `bg-bg-elevated` | `#161C18`               | `#FFFFFF`                | `#FFFFFF`             |
| `text-text-primary` | `#FAF7F0` (cream)    | `#0E2B1C` (forest dark)  | `#0A0E0C`             |
| `text-text-muted` | `#7A8881`              | `#5A675F`                | `#5A675F`             |
| `border-border-default` | `rgba(255,255,255,0.18)` | `rgba(14,43,28,0.18)` | `#0A0E0C` (solid) |
| `bg-accent-primary` | `#4FC97A`            | `#4FC97A`                | `#C5F4A5` (lime)      |
| Hard shadow      | `#1F4D38`               | `#0E2B1C`                | `#000000`             |
| Shadow style     | Subtle multi-layer      | Subtle, less blur        | Hard offset, no blur  |

## Theme rules
- Component code never needs to branch on theme — use semantic tokens and the CSS does the work
- Shadows switch automatically (`shadow-sm` is subtle in dark/light, hard-offset in brutalist)
- Brutalist theme is **only for marketing pages** (`data-theme="brutalist"`), never in the app shell
