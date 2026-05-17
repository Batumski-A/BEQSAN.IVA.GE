# BEQSAN — Frontend

pnpm workspace with two SPA apps and two shared packages.

```
FRONT/
├── apps/
│   ├── web/          # @beqsan/web — public site (beqsan.iva.ge)
│   └── admin/        # @beqsan/admin — admin panel (admin.beqsan.iva.ge)
├── packages/
│   ├── ui/           # @beqsan/ui — themed shadcn primitives
│   └── api-types/    # @beqsan/api-types — generated from BACK's OpenAPI
└── pnpm-workspace.yaml
```

## Get running

```sh
cd FRONT
pnpm install
pnpm dev              # @beqsan/web on http://localhost:5173
pnpm dev:admin        # @beqsan/admin on http://localhost:5174
```

The web app proxies `/api` to the .NET API at `http://localhost:5000` (see `apps/web/vite.config.ts`). Start `BACK/` first:

```sh
cd ../BACK && dotnet run --project src/BEQSAN.Api
```

## Common commands

```sh
pnpm build            # build every app + package
pnpm build:web        # build only @beqsan/web
pnpm preview          # serve the production build at :4173
pnpm lint             # lint every workspace
pnpm typecheck        # tsc --noEmit across the graph
pnpm gen-api          # regenerate TS types from BACK's /openapi/v1.json
pnpm format           # prettier --write
```

## Stack

- **Build:** Vite 5 + React 18 + TypeScript strict
- **Styles:** TailwindCSS 3 with OKLCH design tokens (see `apps/web/tailwind.config.ts`)
- **Routing:** React Router v6 (lazy-loaded routes)
- **Server state:** TanStack Query v5 + axios
- **UI state:** Zustand
- **Forms:** React Hook Form + Zod
- **i18n:** i18next (ka primary, en/ru stubs)
- **Motion:** Framer Motion
- **PWA:** vite-plugin-pwa
- **Codegen:** openapi-typescript → BACK's `/openapi/v1.json`

## Design system

The visual identity is "Industrial Elegance" — full philosophy in [`.claude/skills/design-system/SKILL.md`](../.claude/skills/design-system/SKILL.md). Tokens live in `apps/web/tailwind.config.ts` (and `apps/admin/tailwind.config.ts`, identical). **Never** introduce a hex literal in a component — go through a token.

## Adding a new feature

1. Decide which app it lives in (`web` or `admin`).
2. Make a folder under `src/features/<feature>/` with its own routes, hooks, store.
3. Server calls go through the axios client (`src/shared/api/client.ts`) — return types from `@beqsan/api-types`.
4. UI primitives come from `@beqsan/ui` — only add new primitives there if reused across apps.

See [.claude/skills/frontend-patterns/SKILL.md](../.claude/skills/frontend-patterns/SKILL.md) and [.claude/skills/configurator-architecture/SKILL.md](../.claude/skills/configurator-architecture/SKILL.md) for the conventions.
