# Skill: deployment-ops

**Trigger:** anything touching CI, Docker, deployment, logging, secrets, hosting on IVA infra, MinIO/S3 storage, DNS, TLS.

**Source:** [docs/kickoff.md §3, §11, §13](../../../docs/kickoff.md).

---

## Hosting topology

BEQSAN lives inside IVA's infrastructure as a set of containers on a single host (Phase 1) or a small Docker Swarm / k3s cluster (Phase 2+).

```
                    Cloudflare (edge, TLS, CDN, WAF)
                              │
                              ▼
                  Reverse proxy (Caddy or Traefik)
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
beqsan.iva.ge          admin.beqsan.iva.ge    api.beqsan.iva.ge
  (FRONT public)        (FRONT admin app)      (BACK Web API)
                                                       │
                  ┌────────────────┬─────────────────┬─┴────────────┐
                  ▼                ▼                 ▼              ▼
              PostgreSQL        MinIO            Hangfire        Redis
              (or MSSQL)      (S3-compat)      worker(s)        (cache, rate-limit)
```

**Single host:** Hetzner CCX or local IVA hardware running Docker. Phase 2 evaluates HA.

## Subdomains & DNS

| Subdomain | Purpose | TLS |
|---|---|---|
| `beqsan.iva.ge` | Public site (FRONT) | Cloudflare-issued |
| `admin.beqsan.iva.ge` | Admin SPA (FRONT-admin) | Cloudflare-issued |
| `api.beqsan.iva.ge` | Web API (BACK) | Cloudflare-issued |
| `cdn.beqsan.iva.ge` | MinIO public bucket alias | Cloudflare-issued |

Lasha manages DNS on the IVA Cloudflare account.

## Docker layout

`BACK/docker-compose.yml` covers full local stack:

```yaml
services:
  api:
    build: ./src/BEQSAN.Api
    ports: ["5000:8080"]
    depends_on: [db, minio, redis]
    environment:
      ASPNETCORE_ENVIRONMENT: Development
      ConnectionStrings__Default: ...
      Anthropic__ApiKey: ${ANTHROPIC_API_KEY}
      # ...

  worker:
    build: ./src/BEQSAN.Worker
    depends_on: [db, redis]

  db:
    image: postgres:16-alpine
    volumes: [pgdata:/var/lib/postgresql/data]
    ports: ["5432:5432"]

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports: ["9000:9000", "9001:9001"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

volumes:
  pgdata:
  minio-data:
```

Production uses the same compose file plus a `docker-compose.prod.yml` override pinning image tags and binding to internal networks only.

## CI/CD

**Tool:** GitHub Actions (or GitLab if Lasha prefers IVA's GitLab — TBD, log to `docs/questions.md`).

**Pipeline stages:**

1. **Build & test (every push)**
   - `dotnet restore && dotnet build` (Release config)
   - `pnpm install --frozen-lockfile && pnpm build`
   - Unit + handler tests (xUnit + Vitest)
   - Linting: `dotnet format --verify-no-changes`, `pnpm lint`, `pnpm typecheck`
2. **Integration tests (every push)** — TestContainers Postgres
3. **E2E + visual regression (PRs to main)** — Playwright against docker-compose stack
4. **Lighthouse CI (PRs to main)** — fail if any page below `performance-optimization` budget
5. **Deploy** — only on push to `main`:
   - Build prod images, push to GHCR (or IVA's private registry)
   - SSH to host, `docker compose pull && docker compose up -d --no-deps api worker front front-admin`
   - Run EF migrations: `dotnet ef database update --connection ...` (or `migration` Hangfire job)
   - Smoke test: hit `/health` on each container, fail rollback if any non-200

## Secrets

| Env | Source |
|---|---|
| Local dev | `.env` (gitignored) + `dotnet user-secrets` for backend |
| CI | GitHub Actions Secrets / GitLab CI variables |
| Production | Docker secret files mounted at `/run/secrets/`, **or** Azure Key Vault if available |

**Never** commit secrets. **Never** print secrets in logs. CI redacts via `::add-mask::` for any value containing `KEY|SECRET|TOKEN|PASSWORD`.

## Logging — IVA central host

Logs ship to **Cloud9.ge BATUMSKI** (Lasha's central log host). Pick between:
- **Seq** (Serilog-native, beautiful UI, easy correlation queries)
- **Loki + Grafana** (cheaper at scale, IVA may already run this)

Decision pending — log to `docs/questions.md`. Default for Phase 1: Seq on BATUMSKI.

**Log shape:**
```
{timestamp} {level} {correlationId} {sourceContext} {message} {properties}
```

Mandatory properties on every log: `CorrelationId`, `Application=BEQSAN`, `Environment=Production|Staging|Development`.

**Retention:** 30 days hot, 1 year cold (compressed S3 archive). PII-bearing logs (Warning+) auto-redacted after 14 days.

## Backups

- **Database:** nightly `pg_dump` to MinIO bucket `backups/db/`, rotated 30 days.
- **MinIO (user photos, 3D models, generated renders):** mirrored nightly to Cloud9.ge BATUMSKI via `mc mirror`.
- **Config:** docker-compose + .env templates kept in repo; production overrides in Bitwarden.
- **Test restore monthly.** A backup you haven't restored is a wish, not a backup.

## Health & monitoring

**Health endpoints:**
- `/health/live` — process responsive
- `/health/ready` — DB + Redis + MinIO reachable
- `/health/startup` — migrations done

**Uptime monitoring:** `uptime-kuma` on IVA infra, ping `/health/live` every 30s on each subdomain.

**Alerting:** Telegram bot → Lasha + Roman (status changes only).

## TLS / HTTPS

- Cloudflare full-strict mode.
- Origin certs from Cloudflare, 15-year validity.
- HSTS preload eligible: `max-age=31536000; includeSubDomains; preload`.

## Security headers (set at Caddy/Traefik or via ASP.NET middleware)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(self), microphone=(), geolocation=(self)
Content-Security-Policy: default-src 'self'; img-src 'self' data: https://cdn.beqsan.iva.ge; ...
```

CSP is strict-by-default. Document any `unsafe-inline` / `unsafe-eval` exception with a justification.

## Cookies & sessions

- **Public site:** no cookies set unless the user consents (GDPR-ready banner).
- **Admin:** JWT in `HttpOnly; Secure; SameSite=Strict` cookie, **or** in `localStorage` if SPA-only. Decision pending — default `HttpOnly` cookie for CSRF resilience.

## GDPR / privacy

- Cookie consent banner with three buttons: `„თანახმა ვარ"`, `„მხოლოდ აუცილებელი"`, `„გავაუქმოთ"`.
- Customer data export by phone: admin can trigger a JSON export, emailed to the requester.
- Account/data deletion request flow: 30-day grace period, then hard delete (orders kept anonymized for fiscal records).
- User-uploaded photos: 30-day retention unless attached to a committed order.

## Anti-patterns

```
❌ Secret committed to repo                          → revoke + .env + .gitignore
❌ Production deploy directly from a dev machine     → only via CI
❌ DB password in connection string env var          → use file mount or secret
❌ CORS: AllowAnyOrigin in production                → whitelist beqsan.iva.ge
❌ No /health endpoint                               → required for orchestration
❌ Backups never restored                            → monthly drill
❌ EF migrations run by hand on prod                 → automated in deploy step
❌ Cookies without Secure or HttpOnly                → both flags required
❌ Logging connection strings or tokens              → redact at sink level
❌ Custom self-signed TLS                            → use Cloudflare-issued origin certs
```

## Related skills

- [dotnet-clean-arch](../dotnet-clean-arch/SKILL.md) — Serilog configuration, health check registration.
- [testing-strategy](../testing-strategy/SKILL.md) — what runs in CI, what blocks deploy.
- [ai-integration](../ai-integration/SKILL.md) — provider API keys, secret handling.
- [performance-optimization](../performance-optimization/SKILL.md) — edge cache, compression, RUM ingest.
