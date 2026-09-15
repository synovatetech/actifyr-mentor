# Actifyr Client Platform

Web client for the Actifyr platform: **Next.js 15** (App Router), **React 19**, and **TypeScript**.

## Repository layout

| Path | Description |
|------|-------------|
| [`./`](./) | Next.js app — `package.json`, `src/`, `public/`, and framework config |
| [`docs/`](./docs/) | API docs, Postman collection, deployment/testing notes, and reference material |
| [`scripts/`](./scripts/) | Standalone Node utilities (not bundled with the app) |

Application source organization is described in [`src/README.md`](./src/README.md) and [`src/components/README.md`](./src/components/README.md).

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Configure secrets and environment-specific values via **`.env`** / **`.env.local`** (never commit real credentials).

## Scripts (run from repository root)

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Optimized production build |
| `npm run start` | Run the production server |
| `npm run lint` | Next.js ESLint |
| `npm run type-check` | `tsc --noEmit` |
| `npm run commit` | Interactive Conventional Commit via Commitizen |
| `npm run branch:new` | Interactive branch creation (`feat/fix/chore`) |
| `npm run branch:feat -- <name>` | Create feature branch (`feat/<name>`) |
| `npm run branch:fix -- <name>` | Create bugfix branch (`fix/<name>`) |
| `npm run changeset` | Create release notes/version intent entry |

## Documentation index

See **[`docs/README.md`](./docs/README.md)** for API wrapper documentation, Postman import, deployment, testing guides, and archived reference notes.

Contribution and PR workflow is defined in **[`CONTRIBUTING.md`](./CONTRIBUTING.md)**.

Note: plain `git commit` opens Commitizen prompts (step-by-step) even if you pass `-m` (merge/squash commits are excluded).

## Prerequisites

- **Node.js** 18+ (use current LTS for best compatibility)
- **npm** (ships with Node)
