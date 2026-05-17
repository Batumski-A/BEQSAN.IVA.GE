# BEQSAN API — OpenAPI document location

For codegen (FRONT's `packages/api-types` runs `openapi-typescript` against this URL during `pnpm gen-api`).

## URLs

| Surface | URL | Available |
|---|---|---|
| **OpenAPI JSON (machine-readable)** | `http://localhost:5000/openapi/v1.json` | **Development only** |
| **Scalar UI (human-readable)** | `http://localhost:5000/scalar/v1` | **Development only** |
| Root redirect `/` | → `/scalar/v1` (dev) or `/api/v1/health` (prod) | always |

In Production neither the OpenAPI JSON nor the Scalar UI is exposed. Codegen must run **against a dev environment**.

## Spec generator

[`Swashbuckle.AspNetCore`](https://github.com/domaindrivendev/Swashbuckle.AspNetCore) generates the document; route customised in [BACK/src/BEQSAN.Api/Program.cs](../../BACK/src/BEQSAN.Api/Program.cs):

```csharp
app.UseSwagger(options => options.RouteTemplate = "openapi/{documentName}.json");
app.MapScalarApiReference(options =>
{
    options.Title = "BEQSAN API";
    options.Theme = ScalarTheme.BluePlanet;
    options.OpenApiRoutePattern = "/openapi/{documentName}.json";
});
```

(.NET 8's built-in `AddOpenApi()` does **not** ship in 8.x — that's a .NET 9 feature. We use Swashbuckle as the source and point Scalar at it.)

Document name: `v1`. When a `v2` group is introduced (Phase 2+), publish at `/openapi/v2.json` alongside v1.

## Frontend codegen flow

```sh
# Terminal 1 — start the API in dev
cd BACK && dotnet run --project src/BEQSAN.Api

# Terminal 2 — generate TypeScript types
cd FRONT && pnpm --filter @beqsan/api-types gen
```

`@beqsan/api-types` (lands with FRONT scaffold) wraps:

```sh
openapi-typescript http://localhost:5000/openapi/v1.json -o ./generated/v1.d.ts
```

Output is committed to the repo (small, deterministic, easier to review than a build-time fetch).

## CI

Once the FRONT scaffold lands, CI's lint stage will:

1. Spin up the API in the background (`dotnet run` against an in-memory SQLite).
2. Wait for `/api/v1/health` to return 200.
3. Run `pnpm --filter @beqsan/api-types gen --check` — fails if regenerated types diverge from the committed file.
4. Tear down the API.

That catches "developer changed an endpoint without regenerating types" before merge.

## Schema stability

- Endpoints under `/api/v1/*` follow [docs/api/result-envelope.md](result-envelope.md) — the wire shape (`isSuccess` / `value` / `errors`) is the contract.
- Backwards-compatible changes (new endpoint, new optional field): bump nothing.
- Backwards-incompatible changes (removed field, renamed field, changed semantics): introduce `/api/v2/*` alongside, deprecate v1 with a release-note window before removal.
