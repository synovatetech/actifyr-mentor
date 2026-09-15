# Node utility scripts

One-off or maintenance scripts for this package. They are **not** imported by the Next.js app.

| Script | Purpose |
|--------|---------|
| `refactor-program-id.js` | Codemod-style refactor: migrate `searchParams.get('programId')` usage toward `useProgramId` in `src/app`. Run from repository root with `node scripts/refactor-program-id.js` only when intentionally applying that migration. |

Ad-hoc API smoke tests and `tmp_*.js` scratch files previously lived at the package root; they were removed to keep the tree clean. Prefer documented flows in `docs/TESTING_GUIDE.md` and environment-based credentials—not committed secrets.
