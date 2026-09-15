# Contributing Guide

## Branch Strategy

- Create short-lived branches from the active integration branch (`vizz-dev` by default).
- Branch names must follow:
  - `feat/<kebab-case>`
  - `fix/<kebab-case>`
  - `chore/<kebab-case>`
  - `docs/<kebab-case>`
  - `refactor/<kebab-case>`
  - `test/<kebab-case>`
  - `ci/<kebab-case>`
  - `release/<kebab-case>`
  - `hotfix/<kebab-case>`

Helper scripts:

- `npm run branch:new` (interactive type + name prompt)
- `npm run branch:feat -- <name>`
- `npm run branch:fix -- <name>`
- `npm run branch:chore -- <name>`

## Commit Standards

- Commit format follows Conventional Commits.
- Examples:
  - `feat(auth): add magic link login`
  - `fix(api): handle empty error payload`
  - `chore(ci): add PR checks workflow`

Use Commitizen (recommended):

- `npm run commit`
- `npm run commit:retry`

`git commit` now triggers Commitizen question flow automatically through `prepare-commit-msg`, including when `-m` is passed.
Merge/squash commits skip the prompt; `commit-msg` still enforces Conventional Commit format.

## Local Quality Gates

Required project checks:

- `npm run type-check`
- `npm run build`

Optional when needed:

- `npm run lint`

Hooks:

- `pre-commit`: branch-name validation + `lint-staged`
- `prepare-commit-msg`: launch Commitizen step-by-step prompt for `git commit`
- `commit-msg`: commitlint validation
- `pre-push`: type-check + build + tests (if `test` script exists)

## Pull Request Workflow

1. Create/update your branch.
2. Commit with Conventional Commits.
3. Push and open a PR.
4. Fill PR template sections:
   - Summary
   - Why
   - Scope
   - Test plan
   - Risk/rollback
5. Wait for CI checks and review approval before merge.

## Releases and Versioning

This repository uses Changesets for versioning metadata and release notes.

- Create a changeset: `npm run changeset`
- Bump versions from pending changesets: `npm run version-packages`
- Publish release artifacts: `npm run release`

Follow semantic versioning:

- MAJOR for breaking changes
- MINOR for backward-compatible features
- PATCH for backward-compatible fixes

