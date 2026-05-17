# ADR-0001: SQLite as primary database (with Postgres as scale fallback)

- **Date:** 2026-05-17
- **Status:** Accepted
- **Decider:** Claude (per [feedback-infra-decisions-self-made](../../) — Lasha delegated infra calls)

## Context

BEQSAN is a single-workshop manufacturer's e-platform (one Batumi/Salibauri location, Western Georgia delivery radius). Expected traffic for Phase 1: a few hundred unique visitors/day, peak maybe a dozen configurations in flight concurrently. No B2B portal, no multi-tenant requirements, no high-write hot loops.

The kickoff doc originally listed PostgreSQL or MSSQL as options. Lasha's revised direction (2026-05-17): "არ არის დიდი რამ — million req/sec არ გვინდა". Dev happens on his Lenovo Legion Pro 7 locally; Phase 1 prod lands on existing IVA infra (BATUMSKI) — to be evaluated when deployment happens.

## Decision

**Primary database: SQLite.**

- File location dev: `BACK/data/beqsan.db`
- File location prod: `BACK/data/beqsan.db` (per-host, mounted volume on the server)
- EF Core provider: `Microsoft.EntityFrameworkCore.Sqlite`
- Dapper driver: `Microsoft.Data.Sqlite`
- Background-job storage: `Hangfire.Storage.SQLite` (community package)
- Backup strategy: nightly `sqlite3 .backup` to a timestamped copy; offsite mirror to BATUMSKI when deployed.

## Related infrastructure choices (decided alongside)

| Concern | Phase 1 choice | Abstraction (swap surface) |
|---|---|---|
| Cache | `IMemoryCache` (built-in `Microsoft.Extensions.Caching.Memory`) | `ICacheService` (`MemoryCacheService` ↔ `RedisCacheService`) |
| File storage | Local FS at `BACK/data/uploads/` | `IStorageService` (`LocalFileStorage` ↔ `MinioStorage` / `S3Storage`) |
| Logs | Serilog Console + rolling File daily | sinks added at composition root |
| Reverse proxy (dev) | None — `dotnet run` :5000 | n/a |
| Containers (dev) | None — single `dotnet run` boots everything | n/a (Postgres compose only if/when we switch) |

For Dapper, we go through `IDbConnectionFactory` (`SqliteConnectionFactory` now → `NpgsqlConnectionFactory` later). EF Core's provider swap is `UseSqlite(...)` → `UseNpgsql(...)` — single line in DI composition.

## Scale fallback triggers

Switch to PostgreSQL **when any of these become true** for a sustained week:

- 100+ concurrent writers (we'd hit SQLite's writer-lock contention).
- Database file size > 5 GB (we'd hit vacuum/maintenance pain).
- Multi-instance horizontal scale required (SQLite can't share across processes safely on a network FS).
- Need for features SQLite doesn't have: JSONB indexing, full-text search at scale, partitioning, row-level security.

When that day comes, the migration is roughly:

1. `dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL`
2. In `Infrastructure/DependencyInjection.cs`: swap `UseSqlite(...)` → `UseNpgsql(...)`
3. New `NpgsqlConnectionFactory : IDbConnectionFactory` for Dapper.
4. Run `dotnet ef migrations bundle` against the new provider (EF Core regenerates SQL).
5. Data move: `pgloader sqlite:///path/to/beqsan.db postgresql://...` or a one-time `dotnet ef database update` + custom seeder.

Total: ~5 production code lines + a migration day. Acceptable as a future cost.

## Consequences

**Positive:**
- Zero infra setup. `git clone && dotnet run` produces a working API immediately.
- Single-file backups (cp the .db file).
- TestContainers not needed for integration tests — SQLite `:memory:` mode works.
- No Docker required for dev.
- Lower hosting cost (one box runs the whole app).

**Negative:**
- Single-writer at a time (writes are serialized via SQLite's locking). Mitigated by: write paths are infrequent (admin actions, order submits), reads dominate. Configurator price calc is read-only.
- No native JSONB / full-text-at-scale. Mitigated by: not needed in Phase 1; gallery search can ship Phase 2 with FTS5 (SQLite's built-in) or a switch to Postgres.
- Migrating later is non-zero work (one engineer-day). Accepted given the simplicity gained today.

**Mitigations:**
- All Dapper code goes through `IDbConnectionFactory` — no inline `new SqliteConnection(...)`.
- All EF queries use `IBeqsanDbContext` interface (defined in Application) — Infrastructure binds to the concrete `BeqsanDbContext`.
- `Money`, `PhoneNumber`, etc. as value objects so storage type changes don't ripple.

## Notes

- `Microsoft.Data.Sqlite` is the modern, ADO.NET-compliant driver. `System.Data.SQLite` is the older one — do not use.
- SQLite WAL mode (`PRAGMA journal_mode = WAL`) enabled in `BeqsanDbContext` startup for better concurrent-read performance.
- `PRAGMA foreign_keys = ON` enabled explicitly — SQLite ships with FK constraints off by default.
- Per-request `IDbConnection` lifetime is short (factory returns a fresh connection each call). Pooling is automatic in `Microsoft.Data.Sqlite`.
