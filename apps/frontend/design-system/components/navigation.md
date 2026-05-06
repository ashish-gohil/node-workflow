# Navigation

Sidebar, topbar, tabs, breadcrumbs. Quiet, structural, never the main attraction.

---

## 1 · App sidebar

Left-side navigation. Collapsible. Sets the rhythm of the entire app.

### Layout

```
┌──────┬───────────────┐
│ ▎ 🟢 │ FLOW          │  ← logo bar (h-14)
│  ⚡  ├───────────────┤
│  📁 │ MAIN          │  ← h6 eyebrow section
│  📊 │ ▎ Workflows   │  ← active item: 2px left edge
│  🔌 │   Executions  │
│  ⚙  │   Credentials │
│      ├───────────────┤
│      │ TEAM          │
│      │   Members     │
│      │   Billing     │
│      └───────────────┘
│  👤  │  ← footer (avatar + menu)
└──────┴───────────────┘
   ↑56px       ↑280px
   icon rail   sidebar
```

Two layers:

1. **Icon rail** (56px, always visible) — top-level sections
2. **Sidebar** (280px, collapsible) — sub-navigation per section

### Spec

**Container**

- `bg: bg-surface` (one step darker than canvas)
- `border-r: 1px var(--border-default)`
- Icon rail: `width: 56px`, `bg: bg-canvas`, `border-r: 1px var(--border-subtle)`

**Items (icon rail)**

- Size: `40px × 40px` square
- Margin: 8px around
- Icon: 20px
- Default: `text-text-secondary`, `bg: transparent`
- Hover: `bg: rgba(255,255,255,0.04)`
- Active: `bg: forest-800`, `text: forest-300`, 2px left edge `forest-500` outside item
- Focus: `outline: 1.5px forest-400`

**Items (sidebar list)**

- Padding: `8px 12px` (left padding `16px` total via 4px indicator gap)
- Height: 36px
- Text: `body-md`, weight 500
- Default: `text-text-secondary`
- Hover: `text-text-primary`, `bg: rgba(255,255,255,0.03)`
- Active: `text-text-primary`, `bg: forest-500/8%`, 2px left edge `forest-500`
- Disabled: `text-disabled`, no hover

**Section header (eyebrow)**

- `h6` style: 12px uppercase, `tracking-wider`, weight 700
- Color: `text-muted`
- Padding: `16px 16px 8px`
- First section: top padding 8px

### Code

```html
<aside class="flex h-screen">
  <!-- Icon rail -->
  <nav
    class="bg-bg-canvas border-subtle flex w-14 flex-col items-center gap-1 border-r py-2"
  >
    <a
      href="#"
      aria-label="Workflows"
      class="bg-forest-800 text-forest-300 inline-flex size-10 items-center justify-center rounded-sm shadow-[inset_2px_0_0_0_var(--color-forest-500)]"
    >
      <svg class="size-5">⚡</svg>
    </a>
    <a
      href="#"
      aria-label="Executions"
      class="text-text-secondary hover:text-text-primary inline-flex size-10 items-center justify-center rounded-sm hover:bg-white/[0.04]"
    >
      <svg class="size-5">📊</svg>
    </a>
    <!-- ...more -->
    <div class="mt-auto"></div>
    <button
      aria-label="Account"
      class="bg-forest-700 text-cream-50 text-body-sm size-10 rounded-full font-semibold"
    >
      JD
    </button>
  </nav>

  <!-- Sidebar -->
  <nav class="bg-bg-surface border-default flex w-[280px] flex-col border-r">
    <header class="border-subtle flex h-14 items-center gap-2 border-b px-4">
      <span class="bg-forest-500 size-6 rounded-sm"></span>
      <span class="text-body-md font-semibold tracking-tight">FLOW</span>
    </header>

    <div class="flex-1 overflow-y-auto p-2">
      <p
        class="text-h6 text-text-muted px-3 pt-3 pb-2 tracking-wider uppercase"
      >
        Main
      </p>
      <a
        href="#"
        aria-current="page"
        class="text-body-md text-text-primary bg-forest-500/[0.08] flex h-9 items-center gap-2 rounded-sm px-3 font-medium shadow-[inset_2px_0_0_0_var(--color-forest-500)]"
      >
        <svg class="size-4">📁</svg> Workflows
        <span class="badge badge--solid ml-auto">24</span>
      </a>
      <a
        href="#"
        class="text-body-md text-text-secondary hover:text-text-primary flex h-9 items-center gap-2 rounded-sm px-3 font-medium hover:bg-white/[0.03]"
      >
        <svg class="size-4">📊</svg> Executions
      </a>
    </div>
  </nav>
</aside>
```

### Collapse states

- **Expanded** (default): icon rail + 280px sidebar
- **Collapsed**: icon rail only (56px). Toggle via header button or `⌘B`
- **Hidden** (focused mode): sidebar slides out left, full-width canvas

---

## 2 · Topbar

Slim header above the canvas/page. Holds breadcrumbs, page-level actions, search.

### Spec

- Height: 56px
- `bg: bg-canvas` (transparent over canvas)
- `border-b: 1px var(--border-subtle)`
- Padding: `0 24px`
- Layout: `[breadcrumbs] [flex-spacer] [search] [actions] [avatar?]`

```html
<header
  class="border-subtle bg-bg-canvas flex h-14 items-center gap-4 border-b px-6"
>
  <!-- Breadcrumbs -->
  <nav class="text-body-sm flex items-center gap-2">
    <a class="text-text-secondary hover:text-text-primary">Workflows</a>
    <span class="text-text-muted">/</span>
    <span class="text-text-primary font-medium">Order pipeline</span>
  </nav>

  <div class="flex-1"></div>

  <!-- Search -->
  <button
    class="border-default bg-bg-surface text-text-muted text-body-sm hover:border-strong inline-flex h-8 min-w-64 items-center gap-2 rounded-sm border px-3"
  >
    <svg class="size-4">🔍</svg>
    <span>Search…</span>
    <kbd class="badge badge--mono ml-auto">⌘K</kbd>
  </button>

  <!-- Actions -->
  <button class="btn-ghost size-8 p-0">🔔</button>
  <button class="btn-primary">Run</button>
</header>
```

---

## 3 · Tabs

For switching context within a page or drawer.

### Underlined tabs (default)

```
┌───────────────────────────────────────────┐
│  Configure   Run   Logs   Schema          │
│  ━━━━━━━━━                                  │  ← active indicator (2px forest-500)
└───────────────────────────────────────────┘
   ↑ border-b: border-subtle (full width below)
```

```html
<div role="tablist" class="border-subtle flex items-center gap-1 border-b">
  <button
    role="tab"
    aria-selected="true"
    class="text-body-md text-text-primary h-10 px-3 font-medium shadow-[inset_0_-2px_0_0_var(--color-forest-500)]"
  >
    Configure
  </button>
  <button
    role="tab"
    aria-selected="false"
    class="text-body-md text-text-secondary hover:text-text-primary h-10 px-3 font-medium"
  >
    Run
  </button>
  <button
    role="tab"
    class="text-body-md text-text-secondary hover:text-text-primary h-10 px-3 font-medium"
  >
    Logs <span class="badge badge--solid ml-1.5">3</span>
  </button>
</div>
```

### Pill tabs (alt — for filter selection)

- Use `bg-bg-elevated` container with internal `bg-bg-surface` active pill
- Reserve for "All / Active / Failed" type filters

### Vertical tabs

For settings sub-navigation in drawers/wide pages.

- Width: 200px
- Items: 36px tall, full-width
- Active: `bg-forest-500/8%` + 2px left edge

---

## 4 · Breadcrumbs

```
Workflows  /  Order pipeline  /  Webhook node
   ↑           ↑                  ↑
   link        link               current (no link, weight 500)
```

### Spec

- `body-sm` (13px)
- Separator: `/` in `text-text-muted`, with 8px gap on each side
- Links: `text-text-secondary`, hover `text-text-primary`
- Current page: `text-text-primary`, weight 500, no link
- Truncate middle items if total width exceeds container: `Workflows / … / Webhook`

```html
<nav aria-label="Breadcrumb" class="text-body-sm flex items-center gap-2">
  <a href="#" class="text-text-secondary hover:text-text-primary">
    Workflows
  </a>
  <span class="text-text-muted">/</span>
  <a href="#" class="text-text-secondary hover:text-text-primary">
    Order pipeline
  </a>
  <span class="text-text-muted">/</span>
  <span class="text-text-primary font-medium" aria-current="page">
    Webhook
  </span>
</nav>
```

---

## 5 · Pagination

```
┌─────────────────────────────────────────┐
│ Showing 1–25 of 1,284     [<] 1 / 52 [>]│
└─────────────────────────────────────────┘
```

### Spec

- Range text: `body-sm`, `text-text-secondary`, mono numbers
- Page indicator: `font-mono`, `tabular-nums`, `text-text-primary`
- Buttons: `size-8`, ghost variant, square
- Disabled state: `opacity-40`, `pointer-events-none`

For numbered pagination (rare, use only for SEO pages):

- Show first, last, current ± 2
- Ellipsis (`…`) where collapsed
- Active page: `bg-forest-500`, `text-cream-50`

---

## 6 · Menu (dropdown / context menu)

Triggered from a button. Floats with `shadow-md`.

### Spec

- `bg: bg-elevated`
- `border: 1px border-default`
- `radius: sm`
- `shadow: md`
- `min-width: 180px`, `max-width: 320px`
- Padding: `4px` (around items)
- Item: `h-9 px-3`, `text-body-md`
- Item hover: `bg: rgba(255,255,255,0.04)`
- Item active/danger: `text: error` (for destructive items)
- Section divider: `1px border-subtle`, `my-1`
- Section header: `h6` eyebrow, `px-3 py-1.5`
- Keyboard hint (kbd): right-aligned, `text-text-muted`

```html
<div
  role="menu"
  class="bg-bg-elevated border-default min-w-[200px] rounded-sm border p-1 shadow-md"
>
  <button
    role="menuitem"
    class="text-body-md flex h-9 w-full items-center gap-2 rounded-sm px-3 text-left hover:bg-white/[0.04]"
  >
    <svg class="text-text-muted size-4">📋</svg>
    Duplicate
    <kbd class="badge badge--mono ml-auto">⌘D</kbd>
  </button>
  <button
    role="menuitem"
    class="text-body-md flex h-9 w-full items-center gap-2 rounded-sm px-3 text-left hover:bg-white/[0.04]"
  >
    <svg class="text-text-muted size-4">📤</svg>
    Export
  </button>
  <hr class="border-subtle my-1" />
  <button
    role="menuitem"
    class="text-body-md text-error hover:bg-error/10 flex h-9 w-full items-center gap-2 rounded-sm px-3 text-left"
  >
    <svg class="size-4">🗑</svg>
    Delete
  </button>
</div>
```

---

### Brutalist menu (marketing / portfolio)

Black-fill panel with white text and a stamp shadow. Shown in the brutalist theme and on marketing pages. Items are tall, dividers are stark, and an "ACTIVE" lime badge can mark the current item.

```
                              ┌──────────────────────────┐
                              │ CV & Socials  ⌃          │  ← trigger
                              └──────────────────────────┘
                              ┌──────────────────────────┐
                              │ ✉  Email              📋 │
                              ├──────────────────────────┤
                              │ X   X (Twitter)  [ACTIVE]│  ← lime badge
                              ├──────────────────────────┤
                              │ ⌘  GitHub             ↗  │
                              ├──────────────────────────┤
                              │ in LinkedIn           ↗  │
                              ├──────────────────────────┤
                              │ 📄 Resume             ↗  │
                              └──────────────────────────┘
                                ↑ bg: black, text: cream-50
                                ↑ border: 2px solid black
                                ↑ shadow: stamp (6px 6px 0 0 black)
                                ↑ dividers: 1px solid cream-50/15
```

```html
<div
  role="menu"
  class="text-cream-50 shadow-stamp min-w-[260px] border-2 border-black bg-black"
>
  <button
    role="menuitem"
    class="text-body-md border-cream-50/15 flex h-12 w-full items-center gap-3 border-b px-4 text-left font-medium hover:bg-white/[0.08]"
  >
    <svg class="size-4 shrink-0">✉</svg>
    <span class="flex-1">Email</span>
    <svg class="text-cream-50/50 size-4">📋</svg>
  </button>

  <button
    role="menuitem"
    class="text-body-md border-cream-50/15 flex h-12 w-full items-center gap-3 border-b px-4 text-left font-medium hover:bg-white/[0.08]"
  >
    <svg class="size-4 shrink-0">𝕏</svg>
    <span class="flex-1">X (Twitter)</span>
    <span
      class="inline-flex h-5 items-center bg-lime-200 px-1.5 text-[10px] font-bold tracking-wider text-black uppercase"
    >
      Active
    </span>
  </button>

  <button
    role="menuitem"
    class="text-body-md border-cream-50/15 flex h-12 w-full items-center gap-3 border-b px-4 text-left font-medium hover:bg-white/[0.08]"
  >
    <svg class="size-4 shrink-0">⌘</svg>
    <span class="flex-1">GitHub</span>
    <svg class="text-cream-50/50 size-4">↗</svg>
  </button>

  <button
    role="menuitem"
    class="text-body-md border-cream-50/15 flex h-12 w-full items-center gap-3 border-b px-4 text-left font-medium hover:bg-white/[0.08]"
  >
    <svg class="size-4 shrink-0">in</svg>
    <span class="flex-1">LinkedIn</span>
    <svg class="text-cream-50/50 size-4">↗</svg>
  </button>

  <button
    role="menuitem"
    class="text-body-md flex h-12 w-full items-center gap-3 px-4 text-left font-medium hover:bg-white/[0.08]"
  >
    <svg class="size-4 shrink-0">📄</svg>
    <span class="flex-1">Resume</span>
    <svg class="text-cream-50/50 size-4">↗</svg>
  </button>
</div>
```

**Spec**

- Container: `bg: black`, `border: 2px solid black`, `shadow: stamp`, no radius
- Min width: 240px, often 260–320px
- Item height: 48px (taller than standard 36px — more weight)
- Item padding: 16px horizontal
- Divider: `border-b: 1px solid rgba(250,247,240,0.15)` between items, omitted on last
- Hover: `bg: rgba(255,255,255,0.08)`
- Active badge: lime-200 background, black text, bold uppercase 10px
- External link affordance: arrow ↗ on the right (`text-cream-50/50`)
- Open animation: `slide-in-from-top-1 duration-fast`

---

## Usage rules

✅ **Do**

- Use 2px left-edge accent for active sidebar items (signature pattern)
- Keep navigation items single-line; truncate with ellipsis if needed
- Match icon size to text size (16px icon w/ body-md, 20px w/ h4+)
- Mark current page with `aria-current="page"`

❌ **Don't**

- Use bold colors for nav items (color is reserved for active/brand)
- Add icons to every breadcrumb segment (visual clutter)
- Center-align nav items (Swiss = left-aligned, except icon rails)
- Use radius > 4px on nav items
- Animate active indicator with bouncy easing — use `motion-fast`, ease-out

---

## Accessibility

- Sidebar: `<nav aria-label="Main">`, current item `aria-current="page"`
- Tabs: full ARIA tabs pattern (`role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-controls`, `aria-selected`)
- Tab keyboard: ←/→ to navigate, Home/End for first/last
- Breadcrumbs: `<nav aria-label="Breadcrumb">`, last item `aria-current="page"`
- Menu: `role="menu"`, items `role="menuitem"`, full keyboard support (↑/↓, Enter, Esc)
