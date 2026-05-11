# /page — Generate a new FLOW design system page

Generate a new page for the FLOW workflow automation app. This command produces a fully structured, themed page following the app shell and pattern specs.

---

## What to read before generating

1. `apps/frontend/design-system/CLAUDE.md` — all rules and token reference
2. `apps/frontend/design-system/patterns/app-shell.md` — header, sidebar, layout
3. `apps/frontend/design-system/patterns/dashboard.md` — if it's a dashboard or list page
4. `apps/frontend/design-system/patterns/forms.md` — if it contains forms
5. `apps/frontend/design-system/patterns/empty-states.md` — for empty/loading/error states
6. `apps/frontend/app/globals.css` — CSS custom properties

---

## Output location

`apps/frontend/app/<route>/page.tsx`

---

## Page structure rules

### Theme
- App pages use dark theme (default — no `data-theme` needed)
- Marketing pages add `data-theme="brutalist"` to the page wrapper

### Layout
- Wrap content in the app shell components (Header, Sidebar)
- Use `section-container` (1280px) or `section-container-wide` (1440px) for content
- 12-column grid for dashboard layouts
- Left-align text. Right-align numeric columns.

### Page header pattern
```tsx
<div className="flex items-center justify-between border-b border-border-subtle px-8 py-5">
  <div>
    <h1 className="text-h2 text-text-primary font-semibold tracking-tight">Page Title</h1>
    <p className="text-body-sm text-text-secondary mt-0.5">Brief description</p>
  </div>
  <Button variant="primary">Primary Action</Button>
</div>
```

### Always include these states
Every page must handle:
1. **Loading** — skeleton or spinner (use CSS `animate-pulse` on placeholder divs)
2. **Empty** — `<EmptyCard>` with icon, heading, description, CTA
3. **Error** — `<EmptyCard>` with error icon and retry action
4. **Populated** — the main content

---

## Token reference (quick)

### Backgrounds
`bg-bg-canvas` · `bg-bg-surface` · `bg-bg-elevated` · `bg-bg-overlay` · `bg-bg-inset`

### Text
`text-text-primary` · `text-text-secondary` · `text-text-muted` · `text-text-disabled` · `text-text-brand`

### Borders
`border-border-subtle` · `border-border-default` · `border-border-strong` · `border-border-stamp`

### Accent
`bg-accent-primary` · `bg-accent-hover` · `bg-accent-subtle` · `text-accent-primary`

### Shadows
`shadow-sm` · `shadow-md` · `shadow-lg` · `shadow-card` · `shadow-glow-brand`

### Typography
- Page title: `text-h2 text-text-primary font-semibold tracking-tight`
- Section label: `text-h6 text-text-secondary uppercase tracking-wider`
- Body: `text-body-md text-text-primary`
- Meta / timestamp: `text-caption text-text-muted`
- Numbers: `font-mono tabular-nums`
- IDs / hashes: `font-mono text-mono-sm text-text-secondary`

---

## Status + badge patterns

```tsx
<Badge variant="success">Active</Badge>
<Badge variant="error">Failed</Badge>
<Badge variant="running">Running</Badge>
<Badge variant="queued">Queued</Badge>
<Badge variant="mono">v1.2.4</Badge>
```

---

## Common sections

### KPI stat row
```tsx
<div className="grid grid-cols-4 gap-4">
  <StatCard label="Executions today" value="1,284" delta="+12.3%" deltaPositive />
  <StatCard label="Success rate" value="98.7%" accent />
  <StatCard label="Avg duration" value="1.24s" />
  <StatCard label="Failed runs" value="16" deltaPositive={false} delta="-3" />
</div>
```

### Table pattern
```tsx
<table className="w-full text-left">
  <thead>
    <tr className="border-b border-border-subtle">
      <th className="text-h6 text-text-muted px-4 py-3 font-medium uppercase tracking-wider">Name</th>
      <th className="text-h6 text-text-muted px-4 py-3 text-right font-medium uppercase tracking-wider">Duration</th>
    </tr>
  </thead>
  <tbody>
    <tr className="cursor-pointer border-b border-border-subtle transition-colors hover:bg-white/[0.03]">
      <td className="text-body-md px-4 py-3 text-text-primary">Order pipeline</td>
      <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary text-mono-md">1.24s</td>
    </tr>
  </tbody>
</table>
```

---

## Hard rules (same as all components)

- No `style={}`, no `<style>` tags
- No `bg-[var(--...)]` — use semantic class names
- No `rounded-lg` or larger
- No hardcoded hex values
- No Tailwind blue / indigo / purple / gray-*
- No `text-center` in list / table / dashboard content
- Lucide icons only, `strokeWidth={1.5}`
