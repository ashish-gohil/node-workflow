# Pattern · App Shell

The frame that holds the entire workflow automation product. The most important pattern in the system — every page lives inside it.

---

## Three-pane layout

```
┌──────┬──────────────┬──────────────────────────────────┬─────────────────┐
│      │              │                                  │                 │
│ Icon │  Sidebar     │  Topbar (56px, breadcrumbs +     │  Inspector      │
│ rail │  (280px)     │  search + actions)               │  (drawer/pane)  │
│      │              ├──────────────────────────────────┤  (360–480px)    │
│ 56px │              │                                  │                 │
│      │              │                                  │                 │
│      │              │  Canvas / page content           │                 │
│      │              │  (canvas-grid background,        │                 │
│      │              │   full bleed)                    │                 │
│      │              │                                  │                 │
│      │              │                                  │                 │
└──────┴──────────────┴──────────────────────────────────┴─────────────────┘
```

### Regions
| Region | Width | Color | Border |
|---|---|---|---|
| Icon rail | 56px fixed | `bg-canvas` | `border-r-subtle` |
| Sidebar | 280px collapsible | `bg-surface` | `border-r-default` |
| Topbar | full, 56px tall | `bg-canvas` | `border-b-subtle` |
| Canvas | flex-1 | `bg-canvas` + dot grid | none |
| Inspector | 360 / 480 / 640 | `bg-elevated` | `border-l-default` |

---

## HTML/JSX skeleton

```jsx
<div className="h-screen flex flex-col bg-bg-canvas text-text-primary">
  <div className="flex-1 flex overflow-hidden">

    {/* ICON RAIL */}
    <nav aria-label="Sections"
         className="w-14 shrink-0 bg-bg-canvas border-r border-subtle
                    flex flex-col items-center py-2 gap-1">
      {/* nav items */}
    </nav>

    {/* SIDEBAR */}
    <aside className="w-[280px] shrink-0 bg-bg-surface border-r border-default
                      flex flex-col"
           data-state="expanded">
      {/* logo + sub-nav */}
    </aside>

    {/* MAIN COLUMN (topbar + canvas) */}
    <div className="flex-1 flex flex-col min-w-0">
      <header className="h-14 px-6 border-b border-subtle bg-bg-canvas
                         flex items-center gap-4 shrink-0">
        {/* breadcrumbs · search · actions */}
      </header>

      <main className="flex-1 overflow-auto canvas-grid">
        {/* canvas / page content */}
      </main>
    </div>

    {/* INSPECTOR (right drawer) */}
    <aside className="w-[480px] shrink-0 bg-bg-elevated border-l border-default
                      flex flex-col"
           data-state="open" hidden>
      {/* drawer contents */}
    </aside>

  </div>
</div>
```

---

## Behaviors

### Sidebar collapse
- Toggle: button in topbar OR `⌘B`
- Expanded → Collapsed: animates `width: 280px → 0` over `motion-base`
- Icon rail remains visible (it's a separate region)
- When collapsed, hover over icon rail items shows a popover with the section's nav

### Inspector
- **Closed by default** when on list views (Workflows index, Executions list)
- **Auto-opens** when a workflow node is selected on the canvas
- Width depends on context:
  - 360px: log details, run output
  - 480px: node configuration (default)
  - 640px: heavy forms, code editor inside

### Canvas
- Always renders dot grid (`.canvas-grid` utility)
- Pannable with Space + drag, zoomable with `+/–` or `⌘ + scroll`
- Snap nodes to 16px grid
- See `patterns/dashboard.md` for non-canvas page layouts

### Responsive breakpoints

| Breakpoint | Sidebar | Inspector |
|---|---|---|
| `≥ 1280px` (xl) | Both expanded | Visible by default if relevant |
| `1024–1280` (lg) | Sidebar expanded, inspector closes on click outside | Modal-style overlay |
| `768–1024` (md) | Sidebar collapses to icon rail only | Full-width drawer |
| `< 768px` (sm) | Icon rail becomes a bottom tab bar | Full-screen page |

> **App shell is desktop-first.** Mobile is for monitoring (read-only views). Heavy editing happens on desktop.

---

## Keyboard shortcuts (global)

| Key | Action |
|---|---|
| `⌘K` | Command palette |
| `⌘B` | Toggle sidebar |
| `⌘\` | Toggle inspector |
| `⌘/` | Open docs / help |
| `⌘,` | Settings |
| `⌘ Enter` | Run current workflow |
| `Space + drag` | Pan canvas |
| `+` / `-` | Zoom |
| `0` | Reset zoom |
| `Esc` | Close modals/drawers, deselect node |

Show shortcut hints in tooltips on every actionable button.

---

## Z-index stack (within shell)

```
Tooltip      700
Toast        600
Popover      500
Modal        400
Drawer       300
Sticky       200   ← table headers, sticky toolbars
Dropdown     100
Raised       10    ← hovered cards
Base         0     ← canvas, sidebar
```

---

## Persistent regions

Some elements live outside the shell columns and float:
- **Toast container**: bottom-right, `z-toast`, stack 3 max
- **Command palette**: top-center, `z-modal`
- **Tooltips**: bound to triggers, `z-tooltip`

---

## Variations

### List page (Workflows, Executions, Credentials)
- Sidebar: expanded
- Topbar: shows page title + filter button + "New" primary button
- Canvas region becomes a content area (no dot grid): use `bg-bg-canvas` directly
- Page content = filter bar + table

### Editor page (single workflow)
- Sidebar: collapsed by default (focus on canvas)
- Topbar: workflow name + status pill + run button
- Canvas: dot grid, full bleed
- Inspector: opens on node select

### Settings page
- Sidebar: stays open, shows settings sub-nav
- Topbar: breadcrumbs only
- Main: content max-width 720px, centered, no dot grid
- Inspector: hidden

### Marketing / docs
- No app shell
- Use `patterns/dashboard.md` § Marketing layout instead

---

## Design checklist

When generating an app shell from this system, verify:
- [ ] All four regions present (icon rail, sidebar, topbar, main)
- [ ] Sidebar collapsible to icon rail only
- [ ] Topbar has breadcrumbs + `⌘K` search trigger + primary action
- [ ] Canvas has `.canvas-grid` background when in editor mode
- [ ] Active nav item shows 2px left edge accent
- [ ] No blue accents anywhere (forest only)
- [ ] All borders use rgba white-alpha tokens, not gray fills
- [ ] Inspector slides from right, never from left
- [ ] Min viewport target: 1280px wide for full editor experience
