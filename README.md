# BEQSAN

Online platform for **BEQSAN LTD** — an aluminum & PVC door / window manufacturer based in Salibauri, Batumi. Owner: Roman Sharashidze. Built by IVA (Lasha).

Lives at `beqsan.iva.ge` (public), `admin.beqsan.iva.ge` (admin), `api.beqsan.iva.ge` (API).

## Workspace layout

```
e:\BEQSAN.IVA.GE\
├── BACK/        # .NET 8 — Web API, Clean Architecture, EF Core + Dapper, MediatR, Hangfire
├── FRONT/       # Vite + React 18 + TypeScript SPA (public site, and later admin app)
├── docs/        # Kickoff doc, ADRs, open questions, schema docs
├── .claude/     # Skill library + slash commands for Claude Code
└── CLAUDE.md    # Operating rules for AI-assisted development
```

## Start here

If you're picking this project up for the first time:

1. Read [CLAUDE.md](CLAUDE.md) — operating rules.
2. Read [docs/kickoff.md](docs/kickoff.md) — full product vision, architecture, design system.
3. Skim [.claude/skills/INDEX.md](.claude/skills/INDEX.md) — when to load which skill.
4. Check [docs/questions.md](docs/questions.md) — open decisions Roman/Lasha need to resolve.

## Phase 1 status

🚧 **Scaffolding pending.** Workspace foundation (this repo + CLAUDE.md + skill library + docs) is in place. Next: scaffold `BACK/` (.NET solution) and `FRONT/` (Vite app), wire up baseline tooling, ship the first vertical slice (home page + catalog read).

## Stack at a glance

| Layer | Tech |
|---|---|
| Backend | .NET 8 ASP.NET Web API, MediatR, FluentValidation, EF Core 8 + Dapper, Serilog, Hangfire, SignalR |
| Frontend | Vite, React 18, TypeScript strict, TailwindCSS 3, shadcn/ui, React Three Fiber, Konva.js, Zustand, TanStack Query, React Router v6 |
| DB | PostgreSQL 16 (or MSSQL — TBD) |
| Storage | MinIO (S3-compatible) |
| AI | Anthropic Claude 3.5 Sonnet (vision), Replicate (room render) |
| SMS | SMSOffice.ge or Magti SMS |
| Hosting | IVA infra, Cloudflare edge, Caddy/Traefik reverse proxy, Docker |
| Logging | Cloud9.ge BATUMSKI (IVA central log host) — Seq or Loki |

## License

Proprietary. © BEQSAN LTD.
