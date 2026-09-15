# Actifyr Mentor Portal — Claude Instructions

## Absolute Rule: Never hardcode colors in UI

**In every file you write or edit — CSS, TSX, inline styles, SVG attributes — always use a CSS variable token. Never write a raw hex or rgba color value for anything that has a token.**

This applies to ALL colors, not just the primary brand color. Background colors, text colors, borders, shadows, card surfaces — everything has a token. Use it.

---

## Color token reference

All tokens are defined in `src/styles/globals.css`.

| Use case | Token |
|---|---|
| Primary brand color | `var(--color-primary)` |
| Primary light bg | `var(--color-primary-light)` |
| Primary border | `var(--color-primary-border)` |
| Page background | `var(--color-background)` |
| Main text | `var(--color-foreground)` |
| Secondary text | `var(--color-text-secondary)` |
| Feature text | `var(--color-text-feature)` |
| Card background | `var(--color-card-bg)` |
| Toggle background | `var(--color-toggle-bg)` |
| Feature section bg | `var(--color-feature-bg)` |
| Success | `var(--color-success)` |
| Info | `var(--color-info)` |
| Divider | `var(--color-divider)` |
| Toggle border | `var(--color-toggle-border)` |
| Trial banner bg | `var(--color-trial-bg)` |
| Trial banner border | `var(--color-trial-border)` |

When a token doesn't exist for your use case, use `color-mix()` to derive from an existing token rather than hardcoding a new hex value.

---

## Usage by context

### CSS / CSS Modules
```css
/* ✅ */
color: var(--color-primary);
border-color: var(--color-primary);
background: var(--color-primary-light);
background: var(--color-background);
color: var(--color-text-secondary);

/* For custom opacities not covered by a token: */
background: color-mix(in srgb, var(--color-primary) 7%, transparent);
border-color: color-mix(in srgb, var(--color-foreground) 20%, transparent);

/* ❌ Never */
color: #EE4621;
border-color: #EE4723;
background: rgba(238, 71, 35, 0.07);
color: #1e1e1e;
background: #f9fafb;
```

### SVG fill / stroke in JSX
```tsx
/* ✅ */
<circle fill="var(--color-primary)" />
<path stroke="var(--color-foreground)" />
<rect fill="var(--color-primary-light)" />

/* ❌ Never */
<circle fill="#EE4621" />
<path stroke="#1e1e1e" />
<rect fill="#f9fafb" />
```

### Tailwind inline classes
```tsx
/* ✅ */
className="text-[var(--color-primary)] border-[var(--color-primary)]"
className="bg-[var(--color-background)] text-[var(--color-foreground)]"

/* ❌ Never */
className="text-[#EE4621] border-[#EE4723]"
className="bg-[#f9fafb] text-[#1e1e1e]"
```

### Inline style props
```tsx
/* ✅ */
style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
style={{ background: 'var(--color-card-bg)', color: 'var(--color-foreground)' }}

/* ❌ Never */
style={{ color: '#EE4621', background: '#f9fafb' }}
```

---

## Allowed hardcoded colors (truly non-tokenizable)

Only hardcode a color when it is decorative/one-off and will never need to change across themes:

- Pure `#ffffff` or `#000000` in overlays/shadows where the value is intentionally absolute
- Status colors with no token: draft yellow `#f9c041`, expired grey `#6f6f6f`
- Star rating: `#FEB50E`
- Multi-stop progress bar gradients (decorative, not semantic)

**If in doubt, use a token or `color-mix()`. Never hardcode a color just because it is convenient.**

---

## Commit Practices: Split UI, code, and feature changes into separate commits

**When committing, identify distinct concerns in the working tree and commit them separately — never bundle a UI/styling change, a logic/code change, and a new feature into one commit.**

- UI-only changes (CSS, layout, visual tweaks, color/token fixes) → their own commit
- Logic/behavior changes (hooks, services, business logic, bug fixes) → their own commit
- Each distinct feature → its own commit, even if built in the same session

This keeps history reviewable, makes it easy to revert one concern without affecting others, and produces clearer commit messages. Only combine changes into one commit when they are inseparable (e.g. a component and the one CSS module it exclusively uses for that same change).

---

## Data fetching: new API integrations must use TanStack Query

**Never fetch data with a raw `useState` + `useEffect` + service-call pattern. Every new API call — list, detail, or otherwise — goes through a `useQuery`/`useMutation` hook.**

- Put the hook in `src/hooks/use<Thing>.ts`, following the existing convention (see `useQuotes.ts`, `useHabits.ts`, `useKnowledgeCards.ts`, `useLanguages.ts`): a `<thing>Keys` query-key object, a `useQuery`-based `use<Thing>List`/`use<Thing>` for reads, and `useMutation` wrappers for create/update/delete that call `queryClient.invalidateQueries` on success.
- A component should call the hook, not the service function directly, and never hold fetched data in local `useState`.
- Manual `useEffect` fetches re-run per component mount/dependency change with no de-duplication — this is what caused the `/languages` endpoint to fire twice on the Create Program page. TanStack Query dedupes identical in-flight requests and caches by query key, so the same data fetched from multiple places (or re-rendered effects) only hits the network once.
- This applies even to "just log the response" diagnostic calls — write them as a `useQuery` too, not a throwaway `useEffect`.
