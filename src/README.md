# Source layout (`src`)

Next.js **App Router** project: routes live under `app/`; reusable code is grouped by responsibility. This document is the canonical map for where new code belongs.

## Directory map

| Path | Role |
|------|------|
| **`app/`** | Routes, layouts, `page.tsx`, route handlers. Keep route files thin; compose UI from `components/` and wire data via hooks/services. |
| **`components/`** | All React UI: primitives (`ui/`), shared composites (`common/`), shell (`layout/`), and domain modules (`features/`). See `components/README.md`. |
| **`hooks/`** | Client hooks shared across routes (data, navigation, program context). |
| **`services/`** | API clients and HTTP layer (`services/api/`). No JSX. |
| **`store/`** | Client-side global state (Zustand or similar). |
| **`context/`** | React context providers (e.g. toast). |
| **`lib/`** | Utilities, auth helpers, env-agnostic helpers. |
| **`types/`** | Shared TypeScript types and interfaces. |
| **`constants/`** | App constants and enums. |
| **`styles/`** | Global and module CSS (including feature-specific CSS modules referenced by path). |

## Path aliases (`tsconfig.json`)

| Alias | Targets |
|-------|---------|
| `@/*` | `./src/*` |
| `@/components/*` | `./src/components/*` |
| `@/features/*` | `./src/components/features/*` |
| `@/services/*`, `@/hooks/*`, `@/lib/*`, `@/types/*`, `@/constants/*`, `@/styles/*` | Matching `src/` subfolders |

**Note:** `@/features/...` is a **short alias** for `components/features/...` so imports like `@/features/programs/components/ProgramCard` stay stable and route modules stay feature-colocated under one tree.

## Dependency direction (scalability)

- `app/` → may import from `components`, `hooks`, `services`, `context`, `lib`, `types`
- `components/features/*` → may import `components/ui`, `components/common`, `hooks`, `services`, `lib`, `types`
- `services/` → may import `lib`, `types`; **must not** import React components
- Avoid `components/features/A` importing from `components/features/B` unless necessary; prefer shared props or `common/`

## Tailwind

Tailwind v4 is configured in CSS-first mode:

- Token source of truth: `src/styles/globals.css` under `@theme`
- `tailwind.config.ts` stays minimal (content scan + plugins only)
- Add new design tokens in `@theme` first, then consume via utility classes

### Styling extension safety

- Preserve existing utility semantics when adding tokens.
- Prefer tokenized classes/variables over raw color literals.
- Avoid changing runtime behavior (routes, data flow, validation, handlers) in styling-only work.

---

*Last structure pass: consolidate `src/features` into `components/features` with `@/features/*` alias.*
