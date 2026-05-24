# Frontend

Next.js 16 App Router application — the visual workflow editor and the only UI surface for the platform. Built on React 19, Tailwind CSS v4, Radix UI primitives, and React Flow (`@xyflow/react`). Deployed to Vercel.

This app is intentionally a thin client: it composes a canvas, talks to the backend through a server-side proxy, and lets users design, schedule, and monitor workflows.

---

## Responsibilities

| Concern             | How it's handled |
| ------------------- | ---------------- |
| **Authentication**  | NextAuth (Email/password + Google OAuth). Sign-in/up pages under `app/(auth)/`. JWT issued by `apps/api`, persisted in the NextAuth session. |
| **Editor**          | React Flow canvas with custom node renderers per type. State held in a Zustand store; nodes/edges hydrated from the backend for `/workflows/[workflowId]`. |
| **Trigger configs** | Schema-driven forms — Zod schemas + UI metadata from `@repo/types` are rendered through a single `SchemaFieldRenderer` dispatcher. |
| **API access**      | Browser → Next.js server route `app/api/[...path]/route.ts` → backend Lambda. The proxy injects the user's JWT so the browser never holds a raw bearer token. |
| **Design system**   | "FLOW" — Swiss-style, dark-mode-first. All styling through semantic Tailwind tokens; no inline styles, no `var()` wrappers. Conventions live in `design-system/CLAUDE.md`. |

---

## Project layout

```
app/
├── layout.tsx                  Root layout — fonts, theme provider, ReactFlow provider
├── globals.css                 Tailwind v4 + design tokens (source of truth)
├── (auth)/
│   ├── sign-in/                NextAuth sign-in page
│   └── sign-up/                Email/password signup
├── api/
│   ├── auth/[...nextauth]/     NextAuth handlers
│   └── [...path]/              Server-side proxy to backend (JWT injection)
├── workflows/
│   ├── new/                    Editor for a blank workflow
│   │   ├── page.tsx            Thin composition layer
│   │   ├── workflow-editor.tsx Shared editor component (also used by /[workflowId])
│   │   ├── editor-header.tsx
│   │   ├── editor-sidebar.tsx
│   │   ├── editor-executions-panel.tsx
│   │   ├── trigger-sheet.tsx
│   │   ├── action-sheet.tsx
│   │   ├── trigger-config/     SchedulerTriggerConfig, WebhookTriggerConfig, …
│   │   └── action-config/      SetNodeConfig, CodeNodeConfig, …
│   └── [workflowId]/
│       ├── page.tsx            Fetch + hydrate + render shared editor
│       └── executions/         Execution history view
├── store/
│   └── flow-store.ts           Zustand store — nodes, edges, editing state
└── default-data/               Default node configs (used when spawning a fresh node)

components/
├── flow/
│   └── flow-canvas.tsx         React Flow wrapper — registers nodeTypes
├── nodes/                      Visual node renderers per type
│   ├── triggers/               manual / scheduler / webhook
│   └── actions/                http / set / if / code / delay / merge
├── handles/                    Custom React Flow handles (Button, Labeled, Base)
├── node-config/                Schema-driven form renderer + per-widget components
├── ui/                         Reusable primitives — Button, Card, Input, Dialog, …
└── providers/                  Session, theme, …

design-system/
├── CLAUDE.md                   Hard rules (no inline styles, semantic tokens, reuse ui/)
└── DESIGN_SYSTEM.md            Color/type/spacing/motion foundations

lib/
├── api.ts                      Thin fetch wrapper — get/post/put/delete
├── workflow-payload.ts         FlowNode ↔ INode adapters (buildCreatePayload, hydrateForEditor)
└── utils.ts                    cn() helper for conditional class merging
```

---

## Editor architecture

```
┌──────────────────────────────────────────────────────────────┐
│ /workflows/new           OR    /workflows/[workflowId]       │
│ (blank canvas)                 (fetch → hydrate)              │
│         │                              │                      │
│         ▼                              ▼                      │
│              <WorkflowEditor workflowId? initialNodes? … />   │
│                            │                                  │
│   ┌────────────────────────┼────────────────────────────┐     │
│   │ Zustand flow-store     │  Local UI state            │     │
│   │ • nodes                │  • workflowName            │     │
│   │ • edges                │  • activeTab               │     │
│   │ • editingActionNodeId  │  • sidebarOpen             │     │
│   │ • reset()              │  • pendingConnection       │     │
│   └────────────────────────┼────────────────────────────┘     │
│                            ▼                                  │
│         ┌──────────────────────────────────────┐              │
│         │  EditorHeader  (name, save, tabs)    │              │
│         │  EditorSidebar (logs entry)          │              │
│         │  FlowCanvas    (React Flow + nodes)  │              │
│         │  EditorExecutionsPanel               │              │
│         │  TriggerConfigDialog                 │              │
│         │  ActionConfigDialog                  │              │
│         │  ActionSheet   (drag-to-connect)     │              │
│         └──────────────────────────────────────┘              │
└──────────────────────────────────────────────────────────────┘
```

### Hydration on `/workflows/[workflowId]`

1. `useEffect` fetches `GET /workflows/:id` through the proxy.
2. `hydrateWorkflowForEditor(workflow)` (in `lib/workflow-payload.ts`) converts `INode/IEdge` (the backend shape) into `FlowNode/FlowEdge` (the React Flow shape).
3. The shared editor receives `{ initialNodes, initialEdges, initialName, workflowId }` and populates the flow store. On unmount, the store is reset so navigating to `/workflows/new` starts blank.

### Save

`buildCreateWorkflowPayload({ name, nodes, edges })` (inverse of `hydrate…`) converts the editor state back into a backend `CreateWorkflowPayload`:

- New workflow → `POST /workflows` (returns the created doc, including server-generated `workflowId`).
- Existing workflow → `PUT /workflows/:workflowId`.

⌘S / Ctrl+S is wired to trigger the same save.

---

## Schema-driven node config

Every node config dialog is generated from the Zod schema + UIMeta defined in `@repo/types`:

```
packages/types/src/nodes/HttpRequestSchema.ts
  ├── HttpRequestSchema       ← Zod schema (validates config)
  └── HttpRequestUIMeta       ← UI metadata (label, widget, options, showWhen)
```

`SchemaFieldRenderer` (`components/node-config/`) walks the UIMeta and dispatches to a per-widget component:

| widget          | Component             |
| --------------- | --------------------- |
| `text`          | `TextField` |
| `textArea`      | `TextAreaField` |
| `number`        | `NumberField` |
| `select`        | `SelectField` |
| `multiSelect`   | `MultiSelectField` |
| `keyValueList`  | `KeyValueListField` |
| `jsonEditor`    | `JsonEditorField` |
| `dateTimePicker`| `DateTimePickerField` |
| `object`        | `ObjectField` (nested groups, e.g. WebhookTrigger.auth) |
| `fieldArray`    | `FieldArrayField` (repeatable rows, e.g. IF conditions) |

Conditional visibility is driven by `showWhen: { field, in?, notIn? }` clauses in the UIMeta — the renderer reads the current form state via `react-hook-form` to hide/show siblings.

Adding a new field type = adding a new branch in `schema-field-renderer.tsx`. Adding a new node = define its schema + UIMeta in `@repo/types`; the dialog renders itself.

---

## API access pattern

Browser code uses `lib/api.ts`, a thin wrapper:

```ts
await api.get("workflows");
await api.post("workflows", payload);
await api.put(`workflows/${workflowId}`, payload);
```

Every call hits `/api/<path>` (a Next.js route, **not** the backend Lambda directly). The proxy at `app/api/[...path]/route.ts`:

1. Reads the user's NextAuth session via `getToken()`.
2. Extracts the backend JWT from the session.
3. Forwards the request to `${BACKEND_API_URL}/<path>` with `Authorization: Bearer <jwt>`.
4. Streams the response back.

The browser never sees the backend JWT or the backend URL — both stay server-side.

---

## Run locally

### Prerequisites

- Bun installed (`bun --version`)
- A backend API running (locally via `apps/api` or pointing at a deployed Lambda)
- MongoDB accessible (Atlas or local)

### Env vars

`apps/frontend/.env.local`:

```env
BACKEND_API_URL=http://localhost:3001       # apps/api dev server, or deployed API Gateway URL
NEXTAUTH_SECRET=dev-secret
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=…                          # optional, for Google OAuth
GOOGLE_CLIENT_SECRET=…
```

### Start

```bash
bun install
bun run dev
```

The app is at `http://localhost:3000`. Sign in or create an account; the editor lives at `/workflows/new`.

### Build & deploy

```bash
bun run build       # next build
bun run start       # next start
```

Deployment is **fully automatic via Vercel** on push to `main` (or the configured branch). Env vars are managed through the Vercel dashboard.

---

## Design system rules (FLOW)

The frontend follows a strict design system. Full rules live in `design-system/CLAUDE.md`; the three that matter most:

1. **No inline styles. No style tags. Tailwind only.**
   - ❌ `<div style={{ color: 'var(--text-primary)' }}>`
   - ✅ `<div className="text-text-primary">`

2. **Use semantic Tailwind classes, not `var()` wrappers.**
   - ❌ `<div className="bg-[var(--color-bg-canvas)]">`
   - ✅ `<div className="bg-bg-canvas">`

3. **Reuse `components/ui/` primitives.** Every core element (`Button`, `Card`, `Input`, `Dialog`, `Sheet`, `Toggle`, `Tooltip`, `Avatar`, `Select`, `Textarea`, `Badge`) already exists.

Each page region (header, sidebar, panel, FAB, dialog) lives in its own co-located file. Pages themselves are thin composition layers.

---

## Notes

- **Editor file conventions** — anything that's used by both `/workflows/new` and `/workflows/[workflowId]` lives in `app/workflows/new/` and is imported from `[workflowId]/page.tsx` via `../new/...`. The `new` folder is the canonical home of the editor.
- **Flow store reset** — the Zustand store is a singleton; `WorkflowEditor` resets it on unmount so stale nodes from a previous workflow don't bleed through.
- **Trigger node types** — `manualTrigger`, `scheduler`, `webhook`. The first trigger node a user adds determines the workflow's `triggerType` when persisted.
- **Heavy operations** (e.g. cron expression parsing for the next-run preview) happen on the server; the editor only renders config.
