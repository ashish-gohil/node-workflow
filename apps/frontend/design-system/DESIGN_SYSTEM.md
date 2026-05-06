# FLOW — Design System

> A Swiss-style, dark-mode-first design system for a node-based workflow automation platform.
> **Aesthetic:** Minimal · Modular · Boxy · Technical · Developer-focused
> **Palette:** Forest Green × Cream on near-black

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing & Grid](#4-spacing--grid)
5. [Elevation & Shadows](#5-elevation--shadows)
6. [Borders & Radii](#6-borders--radii)
7. [Motion](#7-motion)
8. [Design Tokens (JSON)](#8-design-tokens-json)
9. [Components](#9-components)
10. [UX Principles for DAG/Node UIs](#10-ux-principles-for-dagnode-uis)
11. [Light Theme Adaptation](#11-light-theme-adaptation)

---

## 1. Design Principles

| Principle | Description |
|---|---|
| **Grid before grace** | Every element snaps to an 8px rhythm. Composition is structural, not decorative. |
| **Density with air** | Dense data, generous whitespace around it. Never crowd, never sprawl. |
| **Boxy & modular** | Sharp corners (2–4px max). Rectangles compose the interface. |
| **Quiet color** | Color signals state, not style. Forest green is reserved for action and identity. |
| **Type carries the UI** | Hierarchy is established by type weight and scale before borders or fills. |
| **Monospace as a tool** | IDs, payloads, schemas, code — always mono. Reinforces the technical character. |

---

## 2. Color System

### 2.1 Philosophy

Dark mode is primary. The base is a near-black with a subtle warm-green undertone — never pure `#000` (too harsh) and never blue-black (too generic). Cream provides the readable surface for text and the warmth balancing the forest green.

### 2.2 Core Palette

#### Forest (Brand & Action)
| Token | Hex | Use |
|---|---|---|
| `forest.50`  | `#E8F3EC` | Tints, backgrounds in light mode |
| `forest.100` | `#C7E2CF` | Hover surfaces (light) |
| `forest.200` | `#9ECBAB` | Subtle highlights |
| `forest.300` | `#6FAE82` | Secondary accent |
| `forest.400` | `#4A9163` | Hover state for primary |
| `forest.500` | `#2D6A4F` | **Primary brand** |
| `forest.600` | `#1F5237` | Pressed state |
| `forest.700` | `#143D28` | Borders (active nodes) |
| `forest.800` | `#0E2B1C` | Tinted dark surfaces |
| `forest.900` | `#08180F` | Deep accent shadows |

#### Cream (Text & Highlight)
| Token | Hex | Use |
|---|---|---|
| `cream.50`  | `#FAF7F0` | **Primary text on dark** |
| `cream.100` | `#F2EDE0` | Headings, emphasis |
| `cream.200` | `#E5DDC8` | Secondary surfaces (light mode) |
| `cream.300` | `#D4C9AB` | Borders (light mode) |
| `cream.400` | `#B8AB89` | Muted text accent |

#### Neutral (Structure)
A near-black scale with a 2% green tint baked in for warmth.
| Token | Hex | Use |
|---|---|---|
| `neutral.0`   | `#0A0E0C` | **Base background (canvas)** |
| `neutral.50`  | `#101512` | Surface |
| `neutral.100` | `#161C18` | **Elevated surface** |
| `neutral.200` | `#1D241F` | Overlay / Modal |
| `neutral.300` | `#262E28` | Dividers / subtle borders |
| `neutral.400` | `#3A4540` | Borders / outlines |
| `neutral.500` | `#5A675F` | Disabled text, muted icons |
| `neutral.600` | `#7A8881` | Secondary text |
| `neutral.700` | `#A1ADA6` | Tertiary text / labels |
| `neutral.800` | `#D4DBD7` | High-contrast text alt |
| `neutral.900` | `#FAF7F0` | Primary text (= cream.50) |

### 2.3 Semantic Tokens (Dark Mode)

#### Background Layers
```
bg.canvas     → neutral.0     (#0A0E0C)   The infinite canvas / page base
bg.surface    → neutral.50    (#10151200) Cards, panels, sidebars
bg.elevated   → neutral.100   (#161C18)   Dropdowns, popovers, raised cards
bg.overlay    → neutral.200   (#1D241F)   Modals, drawers
bg.inset      → neutral.50    (#101512)   Inset wells (code blocks, inputs)
```

#### Text Hierarchy
```
text.primary    → cream.50      (#FAF7F0)  — 95% opacity feel
text.secondary  → neutral.700   (#A1ADA6)  — body, descriptions
text.muted      → neutral.600   (#7A8881)  — meta, timestamps
text.disabled   → neutral.500   (#5A675F)
text.inverse    → neutral.0     (#0A0E0C)  — for cream/forest fills
text.brand      → forest.300    (#6FAE82)  — links, accents
```

#### Borders & Dividers
```
border.subtle    → rgba(250, 247, 240, 0.06)   — barely-there separators
border.default   → rgba(250, 247, 240, 0.10)   — card outlines
border.strong    → rgba(250, 247, 240, 0.16)   — input borders
border.focus     → forest.400                  — focus rings
border.brand     → forest.500                  — active node outline
```

#### Accent / Interactive
```
accent.primary       → forest.500   (#2D6A4F)
accent.primary.hover → forest.400   (#4A9163)
accent.primary.press → forest.600   (#1F5237)
accent.subtle        → forest.800   (#0E2B1C)  — tinted hover for ghost
accent.subtle.hover  → forest.700   (#143D28)
```

#### Semantic Colors
Tuned for dark mode — never raw, always slightly desaturated.
| Token | Hex | Surface | Use |
|---|---|---|---|
| `success` | `#52B788` | `rgba(82,183,136,0.12)` | Successful runs, completed nodes |
| `error`   | `#E5484D` | `rgba(229,72,77,0.12)`  | Failed runs, validation errors |
| `warning` | `#F5A524` | `rgba(245,165,36,0.12)` | Retries, caveats |
| `info`    | `#5EB1EF` | `rgba(94,177,239,0.12)` | Neutral system messages |

---

## 3. Typography

### 3.1 Font Stack

```
Sans (UI):     "Inter", "Söhne", "Neue Haas Grotesk", system-ui, sans-serif
Mono (data):   "JetBrains Mono", "Geist Mono", "IBM Plex Mono", monospace
Display (opt): "Inter Tight"  — for marketing surfaces only
```

> **Why Inter:** Most accessible Swiss-grotesque on the web, excellent at small sizes, full numeric variants. Pair with JetBrains Mono for IDs, payloads, and node names.

### 3.2 Type Scale (1.250 / Major Third on display, 1.125 on UI)

| Token | Size | Line height | Weight | Tracking | Use |
|---|---|---|---|---|---|
| `display.xl` | 56 / 3.5rem | 60 | 500 | -0.03em | Marketing hero |
| `display.lg` | 44 / 2.75rem | 52 | 500 | -0.025em | Section heroes |
| `h1` | 32 / 2rem    | 40 | 600 | -0.02em | Page title |
| `h2` | 24 / 1.5rem  | 32 | 600 | -0.015em | Section title |
| `h3` | 20 / 1.25rem | 28 | 600 | -0.01em | Card title |
| `h4` | 17 / 1.0625rem | 24 | 600 | 0 | Subsection |
| `h5` | 14 / 0.875rem | 20 | 600 | 0 | Component title |
| `h6` | 12 / 0.75rem | 16 | 700 | 0.04em (UPPERCASE) | Eyebrow / label |
| `body.lg` | 16 / 1rem    | 26 | 400 | 0 | Long-form copy |
| `body.md` | 14 / 0.875rem | 22 | 400 | 0 | **Default UI body** |
| `body.sm` | 13 / 0.8125rem | 20 | 400 | 0 | Dense tables |
| `caption` | 12 / 0.75rem | 16 | 500 | 0 | Helper, meta |
| `label`   | 12 / 0.75rem | 16 | 500 | 0.02em UPPERCASE | Form labels |
| `mono.md` | 13 / 0.8125rem | 20 | 450 | 0 | Code, IDs |
| `mono.sm` | 12 / 0.75rem | 18 | 450 | 0 | Inline mono |

### 3.3 Usage Rules

- **One H1 per view.** Hierarchy below it must descend monotonically.
- **Body text is `body.md` (14px)** — denser than consumer products, comfortable for technical users.
- **Numbers in tables** use `font-variant-numeric: tabular-nums`.
- **Eyebrow labels** (`h6`) signal section starts in long forms.
- **Mono is reserved** for: node IDs, run IDs, JSON keys, env vars, code, schema fields. Never decorative.

---

## 4. Spacing & Grid

### 4.1 Spacing Scale (4px base, 8px primary rhythm)

| Token | Value | Common use |
|---|---|---|
| `space.0` | 0 | — |
| `space.1` | 4px  | Icon gap, tag inner |
| `space.2` | 8px  | Tight stack, input padding-y |
| `space.3` | 12px | Compact list gap |
| `space.4` | 16px | **Default gap** |
| `space.5` | 20px | Card inner |
| `space.6` | 24px | Section inner |
| `space.8` | 32px | Section gap |
| `space.10` | 40px | Major section break |
| `space.12` | 48px | Page section gap |
| `space.16` | 64px | Hero spacing |
| `space.20` | 80px | Page chapter break |

### 4.2 Grid

```
Columns:     12
Gutter:      24px (space.6)
Margin:      32px (space.8) on desktop, 16px on mobile
Max width:   1280px (content), 1440px (app shell), full-bleed for canvas
Breakpoints: sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536
```

**Application shell**
- Left rail (icons): 56px fixed
- Sidebar (collapsible): 280px
- Right inspector: 360px
- Canvas: fills remaining

### 4.3 Container Rules

- Forms: max 560px reading width.
- Tables: full-width within container.
- Marketing: 1024px content, 1280px outer.
- Node canvas: full bleed, dotted grid background at 16px.

---

## 5. Elevation & Shadows

Dark-mode shadows are **subtle and layered** — they imply elevation through halation rather than darkness. Combine an outer shadow with a 1px inner top highlight for a "lit edge" effect.

| Token | Value | Use |
|---|---|---|
| `shadow.0` | `none` | Flat surfaces |
| `shadow.sm` | `0 1px 0 0 rgba(255,255,255,0.04) inset, 0 1px 2px rgba(0,0,0,0.5)` | Cards at rest |
| `shadow.md` | `0 1px 0 0 rgba(255,255,255,0.05) inset, 0 4px 12px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)` | Dropdowns, popovers |
| `shadow.lg` | `0 1px 0 0 rgba(255,255,255,0.06) inset, 0 12px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05)` | Modals, drawers |
| `shadow.xl` | `0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)` | Command palette |
| `shadow.glow.brand` | `0 0 0 1px rgba(45,106,79,0.6), 0 0 16px rgba(45,106,79,0.25)` | Active/focused node |
| `shadow.glow.error` | `0 0 0 1px rgba(229,72,77,0.6), 0 0 16px rgba(229,72,77,0.25)` | Failed node |

> **Rule:** Never pair heavy shadow with heavy borders. Pick one: glow OR outline.

---

## 6. Borders & Radii

### 6.1 Radius Scale (deliberately small — boxy UI)

| Token | Value | Use |
|---|---|---|
| `radius.none` | 0 | Tables, full-bleed sections |
| `radius.xs` | 2px | Tags, inline marks |
| `radius.sm` | 4px | **Default — buttons, inputs, cards** |
| `radius.md` | 6px | Modals, large cards |
| `radius.lg` | 8px | Marketing cards (max) |
| `radius.full` | 9999px | Avatars, status dots only |

### 6.2 Border Widths

```
1px → default
1.5px → focus rings (accessibility)
2px → active node outlines
```

### 6.3 Border Opacity System

Borders on dark surfaces use **white at low alpha**, not gray fills. This keeps them adaptive to background changes.
```
border.subtle  : rgba(255,255,255,0.06)
border.default : rgba(255,255,255,0.10)
border.strong  : rgba(255,255,255,0.16)
border.intense : rgba(255,255,255,0.24)
```

---

## 7. Motion

| Token | Value | Use |
|---|---|---|
| `motion.fast`  | 120ms cubic-bezier(0.2, 0, 0, 1) | Hover, micro-state |
| `motion.base`  | 180ms cubic-bezier(0.2, 0, 0, 1) | Default UI transitions |
| `motion.slow`  | 280ms cubic-bezier(0.16, 1, 0.3, 1) | Modals, drawers |
| `motion.spring`| spring(stiffness:280, damping:30) | Drag-drop, node connect |

> **Rule:** No motion > 320ms in app surfaces. Marketing may use up to 600ms.

---

## 8. Design Tokens (JSON)

```json
{
  "color": {
    "forest": {
      "50": "#E8F3EC", "100": "#C7E2CF", "200": "#9ECBAB", "300": "#6FAE82",
      "400": "#4A9163", "500": "#2D6A4F", "600": "#1F5237", "700": "#143D28",
      "800": "#0E2B1C", "900": "#08180F"
    },
    "cream": {
      "50": "#FAF7F0", "100": "#F2EDE0", "200": "#E5DDC8",
      "300": "#D4C9AB", "400": "#B8AB89"
    },
    "neutral": {
      "0": "#0A0E0C", "50": "#101512", "100": "#161C18", "200": "#1D241F",
      "300": "#262E28", "400": "#3A4540", "500": "#5A675F", "600": "#7A8881",
      "700": "#A1ADA6", "800": "#D4DBD7", "900": "#FAF7F0"
    },
    "semantic": {
      "success": "#52B788", "error": "#E5484D",
      "warning": "#F5A524", "info": "#5EB1EF"
    }
  },
  "theme": {
    "dark": {
      "bg": {
        "canvas":   "{color.neutral.0}",
        "surface":  "{color.neutral.50}",
        "elevated": "{color.neutral.100}",
        "overlay":  "{color.neutral.200}",
        "inset":    "{color.neutral.50}"
      },
      "text": {
        "primary":   "{color.cream.50}",
        "secondary": "{color.neutral.700}",
        "muted":     "{color.neutral.600}",
        "disabled":  "{color.neutral.500}",
        "inverse":   "{color.neutral.0}",
        "brand":     "{color.forest.300}"
      },
      "border": {
        "subtle":  "rgba(255,255,255,0.06)",
        "default": "rgba(255,255,255,0.10)",
        "strong":  "rgba(255,255,255,0.16)",
        "focus":   "{color.forest.400}",
        "brand":   "{color.forest.500}"
      },
      "accent": {
        "primary":       "{color.forest.500}",
        "primary.hover": "{color.forest.400}",
        "primary.press": "{color.forest.600}",
        "subtle":        "{color.forest.800}",
        "subtle.hover":  "{color.forest.700}"
      }
    }
  },
  "radius": {
    "none": "0px", "xs": "2px", "sm": "4px",
    "md": "6px",  "lg": "8px",  "full": "9999px"
  },
  "space": {
    "0":  "0px",  "1":  "4px",  "2":  "8px",  "3":  "12px",
    "4":  "16px", "5":  "20px", "6":  "24px", "8":  "32px",
    "10": "40px", "12": "48px", "16": "64px", "20": "80px"
  },
  "typography": {
    "fontFamily": {
      "sans": "Inter, system-ui, sans-serif",
      "mono": "JetBrains Mono, ui-monospace, monospace"
    },
    "fontSize": {
      "h1": "32px", "h2": "24px", "h3": "20px", "h4": "17px",
      "h5": "14px", "h6": "12px",
      "body.lg": "16px", "body.md": "14px", "body.sm": "13px",
      "caption": "12px", "label": "12px",
      "mono.md": "13px", "mono.sm": "12px"
    },
    "fontWeight": {
      "regular": 400, "medium": 500, "semibold": 600, "bold": 700
    }
  },
  "shadow": {
    "sm": "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 1px 2px rgba(0,0,0,0.5)",
    "md": "0 1px 0 0 rgba(255,255,255,0.05) inset, 0 4px 12px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)",
    "lg": "0 1px 0 0 rgba(255,255,255,0.06) inset, 0 12px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05)",
    "xl": "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)",
    "glow.brand": "0 0 0 1px rgba(45,106,79,0.6), 0 0 16px rgba(45,106,79,0.25)",
    "glow.error": "0 0 0 1px rgba(229,72,77,0.6), 0 0 16px rgba(229,72,77,0.25)"
  },
  "motion": {
    "fast": "120ms cubic-bezier(0.2,0,0,1)",
    "base": "180ms cubic-bezier(0.2,0,0,1)",
    "slow": "280ms cubic-bezier(0.16,1,0.3,1)"
  }
}
```

---

## 9. Components

### 9.1 Button

**Anatomy:** `[icon?] [label] [icon?]` · height 32 / 36 / 40 (sm / md / lg) · padding-x 12 / 14 / 16 · radius `sm` (4px).

| Variant | Default | Hover | Active/Press | Disabled |
|---|---|---|---|---|
| **Primary** | `bg: forest.500` · `text: cream.50` | `bg: forest.400` | `bg: forest.600` | `bg: neutral.300` · `text: neutral.500` |
| **Secondary** | `bg: neutral.100` · `border: border.default` · `text: cream.50` | `bg: neutral.200` · `border: border.strong` | `bg: neutral.50` | `opacity: 0.5` |
| **Ghost** | `bg: transparent` · `text: cream.50` | `bg: rgba(255,255,255,0.04)` | `bg: rgba(255,255,255,0.08)` | `text: neutral.500` |
| **Destructive** | `bg: transparent` · `border: 1px error` · `text: error` | `bg: rgba(229,72,77,0.10)` | `bg: rgba(229,72,77,0.16)` | `opacity: 0.5` |
| **Link** | `text: forest.300` · `underline: 0` | `underline: 1px`, `text: forest.200` | — | `text: neutral.500` |

**States**
- `loading`: replace icon with spinner (`forest.300`), keep label, disable pointer.
- `focus-visible`: `outline: 1.5px forest.400` · `outline-offset: 2px`.
- `:has(icon-only)`: square (32/36/40), `aria-label` required.

**Usage**
- One **primary** action per view. Never two side-by-side.
- Ghost for tertiary actions in toolbars/menus.
- Destructive only for irreversible operations; pair with confirm modal.

---

### 9.2 Input

**Variants:** Text · Number · Password · Search · Textarea · Select · Combobox · Multi-select · Tag input · Code input (mono).

**Anatomy**
```
[Label (h6 eyebrow)]
[Input (height 36, radius sm, padding-x 12)]
[Helper / error caption]
```

**Default state**
- `bg: bg.surface` (`#101512`)
- `border: 1px border.strong` (`rgba(255,255,255,0.16)`)
- `text: text.primary`
- `placeholder: text.muted`

| State | Spec |
|---|---|
| Hover | `border: rgba(255,255,255,0.24)` |
| Focus | `border: forest.400` · `box-shadow: 0 0 0 3px rgba(74,145,99,0.25)` |
| Error | `border: error` · `caption.color: error` |
| Disabled | `bg: neutral.50` · `text: neutral.500` · `cursor: not-allowed` |
| Read-only | `bg: bg.inset` · `border: border.subtle` |

**Select / Dropdown**
- Trigger uses input styling + chevron (`16px`, `text.muted`).
- Menu: `bg: bg.elevated` · `shadow.md` · `border-radius: sm` · max-height 320 with scroll.
- Item padding: `8px 12px` · hover `rgba(255,255,255,0.04)` · selected `forest.800` + check icon `forest.300`.
- **Combobox**: enable type-ahead filtering, mono if values are technical (env keys, fields).

**Usage**
- Labels above inputs (Swiss alignment); never floating labels.
- Helper text always reserved space (16px) to prevent layout shift on error.
- Use mono inputs for: regex, JSON, headers, env vars, expressions (`{{ $json.id }}`).

---

### 9.3 Card / Panel (Workflow Node)

The most important component — nodes on the canvas.

**Anatomy**
```
┌──────────────────────────────┐  ← border 1px border.default
│ [icon] Node Title    [⋯]     │  h5, padding 12 16
│ ───────────────────────────  │  ← divider border.subtle
│ Subtitle / type     mono.sm  │  text.muted
│ [Status pill]  [Run badge]   │
└──────────────────────────────┘
   ●           ●                  ← input/output ports (8px circles)
```

**Spec**
- `bg: bg.elevated` (`#161C18`)
- `border: 1px border.default`
- `radius: sm` (4px)
- `min-width: 240px` · `padding: 12 16`
- `shadow.sm` at rest

| State | Visual |
|---|---|
| Hover | `border: border.strong` · cursor: grab |
| Selected | `border: 2px forest.500` · `shadow.glow.brand` |
| Running | animated `forest.300` border-pulse, 1.4s loop |
| Success | left-edge accent bar 2px `success` · status pill |
| Error | `shadow.glow.error` · left-edge bar `error` |
| Disabled | `opacity: 0.5` · diagonal hatch overlay 4% white |

**Generic Panel** (sidebars, inspectors): same tokens, no ports, header optional, support collapsible sections with `chevron-right → chevron-down` rotate (`motion.fast`).

**Usage**
- Nodes never use shadows heavier than `sm` — depth comes from the canvas grid contrast.
- Connection lines: 1.5px stroke, `border.strong` default, `forest.400` when active, bezier curves only.

---

### 9.4 Modal / Drawer

**Modal**
- `bg: bg.overlay` (`#1D241F`) · `radius: md` (6px) · `shadow.lg`
- Backdrop: `rgba(8, 12, 10, 0.72)` with `backdrop-filter: blur(4px)`
- Sizes: sm 400 · md 560 · lg 720 · xl 960
- Anatomy: `[Header — h3 + close X]` · divider · `[Body — padding 24]` · divider · `[Footer — right-aligned actions, padding 16 24]`
- Enter: `motion.slow`, `opacity 0→1`, `translateY 8px→0`.

**Drawer**
- Right-anchored, width 360 / 480 / 640.
- `bg: bg.elevated` · left `border: 1px border.default` · no radius (full-height).
- Used for: node configuration, run details, logs.
- Slides in `280ms cubic-bezier(0.16,1,0.3,1)`.

**Usage**
- Modal = focused decision (confirm, create, settings).
- Drawer = inspect/edit alongside canvas; never blocks workflow visibility entirely.
- Never nest modals. Drawer + modal is acceptable.

---

### 9.5 Table

**Spec**
- `bg: bg.surface` · header `bg: bg.elevated`
- Row height: 40 (compact) · 48 (default) · 56 (comfortable)
- Cell padding: `12 16`
- Dividers: bottom `border.subtle` per row; no vertical dividers.
- Header: `h6` style (uppercase, tracked), `text.muted`, sticky on scroll.
- Numbers: `tabular-nums`, right-aligned.
- IDs/hashes: `mono.sm`, `text.secondary`.

**States**
- Row hover: `bg: rgba(255,255,255,0.03)`.
- Row selected: `bg: rgba(74,145,99,0.08)` · left-edge `2px forest.500`.
- Empty state: 240px tall, centered icon (40px, `text.muted`), `body.md` description, optional CTA.
- Loading: skeleton rows (see 9.7).

**Features**
- Sortable header: chevron icon appears on hover, locks on sort.
- Sticky first column for wide tables.
- Pagination footer or virtualized scroll for >100 rows.
- Bulk actions appear in a sticky bar above the header on selection.

---

### 9.6 Tag / Badge

| Variant | Use | Spec |
|---|---|---|
| **Status** (filled) | Run state | `bg: semantic.surface` · `text: semantic.color` · `radius: xs` · 2px dot prefix |
| **Outline** | Categories, tech labels | `border: 1px border.default` · `text: text.secondary` |
| **Solid** | Counts, KPIs | `bg: forest.800` · `text: forest.200` |
| **Mono** | IDs, versions | `font: mono.sm` · `bg: bg.inset` · `border: border.subtle` |

**Spec:** height 20 (sm) / 24 (md) · padding-x 6 / 8 · `radius.xs` · `caption` size · weight 500.

**Pre-defined status tags**
```
● Running   → info
● Success   → success
● Failed    → error
● Queued    → text.muted
● Retrying  → warning
● Skipped   → neutral.500
```

---

### 9.7 Loaders & Skeletons

**Spinner**
- 16 / 20 / 24px, `forest.300` stroke, 1.5px width, 800ms linear loop.

**Progress bar**
- Height 2px, track `border.subtle`, fill `forest.500`, `radius.full`.

**Skeleton**
- `bg: rgba(255,255,255,0.04)`
- Shimmer: gradient sweep `rgba(255,255,255,0.04)` → `rgba(255,255,255,0.10)` → `rgba(255,255,255,0.04)`, 1.6s linear loop.
- Match the radius of the element it replaces.
- Heights: 12px (caption), 16px (body), 20px (h5), 32px (h2).

**Indeterminate bar** (top-of-page route loader)
- 2px height, `forest.400`, sliding gradient, full-width, fixed top.

**Usage**
- Skeletons for content > 200ms expected wait.
- Spinners for buttons, in-place actions < 1s.
- Never both.

---

## 10. UX Principles for DAG/Node UIs

1. **Canvas as ground truth** — the node graph is always centered. UI chrome (sidebar, inspector) is collapsible to give the canvas full bleed.
2. **Dot grid background** — 16px dot grid in `border.subtle` orients the user without distracting. Snap nodes to it.
3. **Connection clarity** — bezier curves only; no orthogonal routing by default. Active path uses `forest.400`, dimmed paths drop to 30% opacity on selection.
4. **Status at a glance** — every node carries a 2px left-edge accent for run state. The user should diagnose a failed workflow in <2 seconds.
5. **Inspector pattern** — clicking a node opens a right drawer. Never a modal (would obscure the graph).
6. **Keyboard first** — `⌘K` command palette, `⌘/` docs, `⌘\` toggle inspector, `Space + drag` to pan, `+/−` to zoom.
7. **Dense by default, comfortable on demand** — provide a UI density toggle (compact / default) that swaps the spacing scale by one step.
8. **Numbers are first-class** — durations, counts, sizes always in mono with tabular figures.
9. **Empty states teach** — every empty list/table includes a mini-illustration (line-art, 1.5px stroke, `text.muted`) and the next action.
10. **Errors are diagnostic** — never a generic "Something went wrong." Show error code (mono), affected node, and a "Copy debug info" button.

---

## 11. Light Theme Adaptation

Light mode flips the cream/neutral relationship while keeping forest as the brand anchor.

```json
{
  "theme": {
    "light": {
      "bg": {
        "canvas":   "#FAF7F0",
        "surface":  "#FFFFFF",
        "elevated": "#FFFFFF",
        "overlay":  "#FFFFFF",
        "inset":    "#F2EDE0"
      },
      "text": {
        "primary":   "#0A0E0C",
        "secondary": "#3A4540",
        "muted":     "#5A675F",
        "disabled":  "#A1ADA6",
        "inverse":   "#FAF7F0",
        "brand":     "{color.forest.600}"
      },
      "border": {
        "subtle":  "rgba(10,14,12,0.06)",
        "default": "rgba(10,14,12,0.10)",
        "strong":  "rgba(10,14,12,0.16)",
        "focus":   "{color.forest.500}",
        "brand":   "{color.forest.500}"
      },
      "accent": {
        "primary":       "{color.forest.600}",
        "primary.hover": "{color.forest.500}",
        "primary.press": "{color.forest.700}",
        "subtle":        "{color.forest.50}",
        "subtle.hover":  "{color.forest.100}"
      }
    }
  }
}
```

**Adaptation rules**
- Shadows lose the inset highlight: `0 1px 2px rgba(0,0,0,0.06)`, `0 4px 12px rgba(0,0,0,0.08)`.
- Forest shifts one step darker (`500 → 600`) to maintain AA contrast on cream.
- Semantic colors shift one step darker: `success #2D8A5F`, `error #C13438`, `warning #C97D0E`, `info #2F7AB8`.
- Canvas dot grid: `rgba(10,14,12,0.08)`.

---

## Appendix · Accessibility Targets

- Body text contrast ≥ **7:1** (AAA) on dark surfaces; ≥ 4.5:1 minimum.
- Interactive elements ≥ **3:1** non-text contrast.
- Focus ring: 1.5px solid + 3px translucent halo, never reliant on color alone.
- All actionable nodes/badges include text or `aria-label` — color is reinforcement, never the sole signal.
- Motion respects `prefers-reduced-motion`: durations collapse to 0 / cross-fade only.

---

*End of system. Use these tokens and components as the foundation — compose, don't redesign.*
