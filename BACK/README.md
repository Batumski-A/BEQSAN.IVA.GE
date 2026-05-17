# BEQSAN — Backend (.NET 8)

ASP.NET 8 Web API, Clean Architecture, SQLite primary (see [docs/adr/0001-sqlite-primary.md](../docs/adr/0001-sqlite-primary.md)).

## Get running in 3 commands

```sh
cd BACK
dotnet restore
dotnet run --project src/BEQSAN.Api
```

API will listen on `http://localhost:5000`. Probe it:

```sh
curl http://localhost:5000/api/v1/health
# → { "status": "ok", "version": "1.0.0.0", "commitSha": "dev",
#     "uptimeSeconds": 0, "dbStatus": "up", "timestampUtc": "..." }
```

In dev, the root URL `/` redirects to the **Scalar API reference UI** at `/scalar/v1`.

## Solution layout

```
BACK/
├── BEQSAN.sln
├── Directory.Build.props           # global compiler settings (net8.0, nullable, warnings-as-errors)
├── Directory.Packages.props        # central NuGet version management
├── src/
│   ├── BEQSAN.Domain/              # Result<T>, Error, Money, PhoneNumber, Currency — no deps
│   ├── BEQSAN.Application/         # MediatR pipeline, FluentValidation behaviors, abstractions
│   ├── BEQSAN.Infrastructure/      # SQLite EF Core + Dapper, LocalFileStorage, MemoryCacheService
│   ├── BEQSAN.Api/                 # Program.cs, Serilog, middleware, /health, Scalar UI
│   └── BEQSAN.Worker/              # Hangfire-host placeholder
├── tests/
│   ├── BEQSAN.UnitTests/           # Domain value-object tests
│   └── BEQSAN.IntegrationTests/    # WebApplicationFactory + SQLite :memory: + /health
└── data/                           # gitignored — SQLite file, uploads, log rolls
    ├── beqsan.db                   # created on first run
    ├── uploads/
    └── logs/
```

## Architecture invariants

Enforced by project references (see each `.csproj`):

| Layer | References |
|---|---|
| `BEQSAN.Domain` | (none) |
| `BEQSAN.Application` | Domain |
| `BEQSAN.Infrastructure` | Domain, Application |
| `BEQSAN.Api` | Domain, Application, Infrastructure |
| `BEQSAN.Worker` | Domain, Application, Infrastructure |

Domain references **nothing** — pure C# only. Application references Domain only. Infrastructure can reference both. The Api / Worker sit at the top and compose the three.

## Common commands

```sh
# Build the whole solution
dotnet build

# Run all tests (unit + integration)
dotnet test

# Run with auto-reload on file changes (dev only)
dotnet watch --project src/BEQSAN.Api run

# Reset the SQLite database (delete the file; the app re-creates on next run)
rm data/beqsan.db
```

## Configuration

Edit [src/BEQSAN.Api/appsettings.json](src/BEQSAN.Api/appsettings.json) for default values, or override in [appsettings.Development.json](src/BEQSAN.Api/appsettings.Development.json) for local-only changes.

| Key | Default | Notes |
|---|---|---|
| `Database:ConnectionString` | `Data Source=data/beqsan.db;Foreign Keys=True` | SQLite file location |
| `Storage:LocalRoot` | `data/uploads` | Where user-uploaded files land |
| `Serilog:*` | Console + rolling File @ `data/logs/beqsan-.log` | Daily rotation, 14-day retention |

Secrets (in dev) go through `dotnet user-secrets`:

```sh
dotnet user-secrets --project src/BEQSAN.Api set "Anthropic:ApiKey" "sk-..."
```

## Adding a new feature (the pattern)

1. **Domain** — entity, value object, or method that captures the business rule.
2. **Application** — `Commands/Queries` (each a folder), one `IRequest` + `Handler` + `Validator` + `Dto` per use case. Handler returns `Result<T>`.
3. **Infrastructure** — repository / EF mapping / external integration if needed.
4. **Api** — endpoint group in `Endpoints/`, calls `sender.Send(...)`, maps `Result<T>` via `result.ToHttpResult()`.
5. **Tests** — unit test the handler with NSubstitute mocks; integration test via `BeqsanWebAppFactory`.

See [.claude/skills/dotnet-clean-arch/SKILL.md](../.claude/skills/dotnet-clean-arch/SKILL.md) for the full conventions.

## Tooling

- **EF Core migrations** (when entities arrive):
  ```sh
  dotnet ef migrations add InitialCreate --project src/BEQSAN.Infrastructure --startup-project src/BEQSAN.Api
  dotnet ef database update --project src/BEQSAN.Infrastructure --startup-project src/BEQSAN.Api
  ```
- **Format check:** `dotnet format --verify-no-changes`
- **Code analysis:** runs on every build (`AnalysisLevel=latest`, `TreatWarningsAsErrors=true`)
