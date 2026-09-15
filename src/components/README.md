# Components (`src/components`)

Conventions for scaling the UI layer without mixing concerns.

## Top-level layers

| Folder | Purpose |
|--------|---------|
| **`ui/`** | **Primitives only** — atomic building blocks with minimal domain coupling: `Button`, base `Icons`, `Loader` (+ CSS module), `Toast`, `ModalPortal`. No multi-step flows, no full-page patterns. |
| **`common/`** | **Shared composites** — reused across routes/features: form helpers (`FieldError`), confirm/close modals, list skeletons, rich text editor, global loader, shared confirmation modals (`ConfirmDelete`, `ConfirmPublish`, `GenerateAccessCode`), and **icon sets** under `common/icons/` (sidebar, program admin, content management, invite flow). |
| **`layout/`** | App shell: sidebars, navbars, dashboard layout, route guards, page wrappers. |
| **`features/`** | Domain UI — one folder per product area (`program-admin`, `content`, `programs`, `plans`, `notifications`, …). Includes route-facing widgets (e.g. program/plan cards) colocated with their domain. |

### When to add a file

- New **button / spinner / toast wrapper** → `ui/`
- New **modal used in 2+ unrelated features** or **editor / table skeleton** → `common/` (or `common/icons/` for SVG sets)
- New **screen-specific section** → `features/<area>/`

## Import paths

Use the `@/components/...` alias.

- Primitives: `@/components/ui/Button`, `@/components/ui/Loader`
- Shared composites: `@/components/common/ListSkeletonLoader`, `@/components/common/icons/SidebarIcons`
- Features: `@/components/features/program-admin/ProgramInfoBar`
- Shortcut alias (same on disk): `@/features/programs/components/ProgramCard` → `components/features/programs/...` (see `tsconfig` paths)

## Adding a new feature area

1. Create `features/<kebab-case-feature-name>/`.
2. Colocate types and local CSS next to the feature.
3. Import primitives from `ui/` and composites from `common/`; avoid importing other feature folders unless necessary.

## Barrel exports

Root `components/index.ts` re-exports `ui`, `common`, `layout`, and `features/auth`. Prefer **explicit paths** in new code (`@/components/common/...`) so dependencies stay obvious in reviews and bundles.

## Styling policy (Tailwind v4 + tokens)

- Use tokens defined in `src/styles/globals.css` (`@theme`) for colors, type, spacing, shadows, and radius.
- Keep utility classes semantic and stable (for example `bg-background`, `text-foreground`).
- In component CSS modules, prefer token variables (`var(--color-*)`, `var(--font-*)`, `var(--text-*)`) when editing styles.
- Avoid introducing raw hex values in component TSX unless required for fixed SVG/asset constraints.
