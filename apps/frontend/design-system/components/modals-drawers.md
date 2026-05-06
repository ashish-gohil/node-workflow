# Modals & Drawers

Two patterns for transient surfaces: **Modal** for focused decisions, **Drawer** for inspect/edit alongside a canvas.

---

## When to use which

| Need | Use | Why |
|---|---|---|
| Confirm a destructive action | Modal | Demands focus, single decision |
| Create a new resource (form) | Modal (sm/md) | Ephemeral, no canvas context needed |
| Inspect a workflow node | **Drawer** | User must see the canvas while editing |
| View execution logs / details | **Drawer** | Long-form, scroll-heavy |
| Settings sub-screen | Drawer (xl) or full page | Depends on depth |
| Quick command / search | Command palette (special modal) | See bottom of doc |

---

## 1 · Modal

### Anatomy
```
                     [backdrop blur 4px]

           ┌──────────────────────────────────┐
           │ Title                       [×]  │  ← header, h3
           ├──────────────────────────────────┤  ← border-subtle
           │                                  │
           │   Body content (padding 24)      │
           │                                  │
           ├──────────────────────────────────┤
           │   Helper text   [Cancel] [Action]│  ← footer
           └──────────────────────────────────┘
              ↑ width: 400 | 560 | 720 | 960
              ↑ bg-bg-overlay · radius-md (6px) · shadow-lg
```

### Sizes
| Size | Width | Use |
|---|---|---|
| sm | 400px | Confirmation dialogs |
| md | 560px | Forms (3–5 fields) |
| lg | 720px | Forms with side panel, image preview |
| xl | 960px | Heavy forms, multi-step |

### Spec
- **Backdrop**: `bg: rgba(8, 12, 10, 0.72)`, `backdrop-filter: blur(4px)`, fades in 180ms
- **Container**: `bg: bg-overlay` (`#1D241F`), `radius: md` (6px), `shadow: lg`, `border: 1px border-default`
- **Header**: `padding: 20px 24px`, `border-b border-subtle`, title in `h3`, close button on right (`size-8` ghost, `×` icon)
- **Body**: `padding: 24px`, scrollable if content exceeds `max-height: calc(100vh - 200px)`
- **Footer**: `padding: 16px 24px`, `border-t border-subtle`, right-aligned actions, gap `12px`
- **Position**: centered viewport, with safe-area `padding: 24px` on small screens
- **Enter**: `motion-slow` (280ms ease-spring), `opacity 0→1`, `translateY 8px → 0`, `scale 0.98 → 1`
- **Exit**: `motion-base` (180ms), reverse

### Code
```html
<div class="fixed inset-0 z-modal">
  <!-- Backdrop -->
  <div class="absolute inset-0 bg-[rgba(8,12,10,0.72)] backdrop-blur-sm
              animate-in fade-in duration-base"></div>

  <!-- Modal -->
  <div role="dialog" aria-modal="true" aria-labelledby="modal-title"
       class="relative mx-auto mt-[15vh] max-w-[560px] w-[calc(100%-48px)]
              bg-bg-overlay border border-default rounded-md shadow-lg
              animate-in fade-in slide-in-from-bottom-2 duration-slow">

    <header class="flex items-center justify-between px-6 py-5
                   border-b border-subtle">
      <h3 id="modal-title" class="text-h3 font-semibold tracking-tight">
        Delete workflow
      </h3>
      <button aria-label="Close"
              class="size-8 rounded-sm hover:bg-white/[0.04]
                     text-text-secondary">×</button>
    </header>

    <div class="px-6 py-6 max-h-[60vh] overflow-y-auto">
      <p class="text-body-md text-text-secondary">
        This will permanently delete <span class="font-mono text-text-primary">
        order-pipeline</span> and its 1,284 execution records.
        This action cannot be undone.
      </p>
    </div>

    <footer class="flex items-center justify-end gap-3 px-6 py-4
                   border-t border-subtle">
      <button class="btn-secondary">Cancel</button>
      <button class="btn-destructive">Delete</button>
    </footer>
  </div>
</div>
```

### Behaviors
- **Trap focus** inside the modal (cycle on Tab)
- **Restore focus** to trigger on close
- **Esc** to dismiss (unless destructive — require explicit click)
- **Click backdrop** to dismiss (unless destructive)
- **Body scroll lock**: `overflow: hidden` on `<body>` while open
- **Prevent stacking**: only one modal at a time; queue if necessary

---

## 2 · Drawer

Right-anchored sliding panel. Always over the canvas, never over a modal.

### Anatomy
```
                                    ┌──────────────────────┐
                                    │ Title          [×]   │  ← h4
                                    ├──────────────────────┤
                                    │ ... tabs / sections  │
                                    │                      │
                                    │ Body (24px padding)  │
                                    │                      │
                                    │                      │
                                    ├──────────────────────┤
                                    │ [Cancel]  [Save]     │  ← footer
                                    └──────────────────────┘
                                      ↑ 360 / 480 / 640
```

### Sizes
| Size | Width | Use |
|---|---|---|
| sm | 360px | Quick details, light forms |
| **md** | 480px | Default — node config, run details |
| lg | 640px | Heavy forms, code editors |

### Spec
- `bg: bg-elevated`, full height
- Left edge: `border-l border-default`
- **No radius** (full-bleed top to bottom)
- `shadow: lg` toward the canvas
- Header: `padding: 16px 24px`, `border-b border-subtle`, title `h4` + close
- Body: `padding: 24px`, scrollable, fills remaining height
- Footer (optional): `padding: 16px 24px`, `border-t border-subtle`, sticky to bottom
- **Enter**: `slide-in-from-right`, `280ms ease-spring`
- **Exit**: `slide-out-to-right`, `180ms ease-out`

### Code
```html
<div class="fixed inset-0 z-drawer pointer-events-none">
  <!-- Optional dimmed backdrop -->
  <div class="absolute inset-0 bg-black/20 pointer-events-auto
              animate-in fade-in duration-base"></div>

  <aside role="dialog" aria-modal="true" aria-labelledby="drawer-title"
         class="absolute right-0 top-0 h-full w-[480px] bg-bg-elevated
                border-l border-default shadow-lg pointer-events-auto
                flex flex-col
                animate-in slide-in-from-right duration-slow ease-spring">

    <header class="flex items-center justify-between px-6 py-4
                   border-b border-subtle">
      <div class="min-w-0">
        <h4 id="drawer-title"
            class="text-h4 font-semibold tracking-tight truncate">
          Webhook trigger
        </h4>
        <p class="font-mono text-mono-sm text-text-muted truncate">
          node_8f3a2b1c
        </p>
      </div>
      <button aria-label="Close drawer"
              class="size-8 rounded-sm hover:bg-white/[0.04]
                     text-text-secondary">×</button>
    </header>

    <div class="flex-1 overflow-y-auto px-6 py-6">
      <!-- Form / content -->
    </div>

    <footer class="flex items-center justify-between gap-3 px-6 py-4
                   border-t border-subtle bg-bg-elevated">
      <button class="btn-ghost text-error">Delete node</button>
      <div class="flex gap-2">
        <button class="btn-secondary">Cancel</button>
        <button class="btn-primary">Save</button>
      </div>
    </footer>
  </aside>
</div>
```

### Variants

**Persistent drawer** (no backdrop, canvas remains interactive)
- Canvas resizes/shifts left when drawer opens
- Use for inspector that user toggles often
- Keyboard shortcut: `⌘\`

**Modal drawer** (with backdrop)
- Backdrop dims canvas; clicking it closes drawer
- Use for one-off, focused tasks (e.g., import wizard)

### Internal structure
Drawers commonly contain tabs:
```
┌──────────────────────────────────────┐
│ Title                          [×]   │
├──────────────────────────────────────┤
│  Configure  ·  Run  ·  Logs  ·  ⋯    │  ← tabs (border-bottom on active)
├──────────────────────────────────────┤
│                                      │
│   Tab content                        │
│                                      │
└──────────────────────────────────────┘
```

---

## 3 · Command palette (special modal)

Triggered by `⌘K`. Anchored top-center, overlays everything.

### Spec
- Position: `top: 15vh`, centered horizontally
- Width: 640px, max 90vw
- `bg: bg-overlay`, `border: 1px border-default`, `radius: md`, `shadow: xl`
- Search input: 48px tall, `border-b border-subtle`, no border on input itself, mono optional
- Result list: max-height 400px, scrollable, item height 40px
- Result item: 16px icon + label + meta + kbd shortcut on right
- Selected item: `bg: forest-500/8%`, left edge 2px `forest-500`
- Empty state: "No results" centered, `text-muted`

```
┌──────────────────────────────────────────────────────┐
│ 🔍 Type a command or search…                        │
├──────────────────────────────────────────────────────┤
│ RECENT                                               │  ← h6 eyebrow
│  ▎ ⚡ Run workflow                          ⌘ Enter  │  ← selected
│    📋 Duplicate workflow                       ⌘ D   │
│    🗑  Delete workflow                                │
│ NAVIGATION                                           │
│    📁 Workflows                                ⌘ 1   │
│    📊 Executions                               ⌘ 2   │
└──────────────────────────────────────────────────────┘
```

### Behaviors
- **↑/↓** to navigate, **Enter** to execute, **Esc** to dismiss
- Type-ahead fuzzy search across all registered commands
- Section headers are skipped during navigation
- Highlight matched characters in results: `text-forest-300 font-medium`

---

## Toasts (bonus)

Anchored bottom-right, stacked vertically with 12px gap.

### Spec
- Width: 360px
- `bg: bg-overlay`, `border: 1px border-default`, `radius: sm`, `shadow: lg`
- Padding: `12px 16px`
- Layout: `[icon 16px] [content] [close 16px]`, gap 12px
- Icon color reflects type: `success` / `error` / `warning` / `info`
- Title: `body-md` 600
- Description: `body-sm`, `text-secondary`
- Auto-dismiss: 4s default, 8s for error
- Enter: `slide-in-from-bottom`, 180ms
- Stack max 3; older ones fade out

```html
<div role="status" aria-live="polite"
     class="w-[360px] bg-bg-overlay border border-default rounded-sm
            shadow-lg p-4 flex items-start gap-3">
  <svg class="size-4 mt-0.5 text-success shrink-0">✓</svg>
  <div class="flex-1 min-w-0">
    <p class="text-body-md font-semibold">Workflow saved</p>
    <p class="text-body-sm text-text-secondary mt-0.5">
      Order pipeline is now active.
    </p>
  </div>
  <button aria-label="Dismiss"
          class="size-5 text-text-muted hover:text-text-primary">×</button>
</div>
```

---

## Usage rules

✅ **Do**
- Use modals only for ephemeral, focused decisions
- Use drawers when the canvas/context must stay visible
- Trap focus and restore on close
- Provide a clear close affordance (×) AND keyboard escape
- Auto-focus the first input or primary action on open

❌ **Don't**
- Stack modals on modals
- Use modals for long-form content (use a page instead)
- Make drawers narrower than 360px (cramped) or wider than 720px (use a page)
- Auto-dismiss critical alerts (require user action)
- Hide the close button (always discoverable)

---

## Accessibility

- `role="dialog"` + `aria-modal="true"` + `aria-labelledby` referencing the title id
- Focus trap inside, restore focus to trigger on close
- Esc key closes (configurable for destructive)
- Backdrop click closes (configurable)
- Toast: `role="status"` + `aria-live="polite"` (or `assertive` for errors)
- Command palette: `role="dialog"` with combobox semantics on the input
