# ADR-0003: Social module (Facebook + Instagram, AI assist via KIE)

- **Date:** 2026-05-18
- **Status:** Accepted
- **Decider:** Claude (per [feedback-infra-decisions-self-made](../../))
- **Supersedes:** none.

## Context

Lasha asked for in-admin Facebook + Instagram management with AI-assisted composing + reply suggestions, leveraging the patterns already proven in [social.iva.ge](D:\Development\IvaSocManager\IvaSocManager). Roman runs the BEQSAN page directly; the admin panel needs to feel less like Meta Business Suite and more like the rest of the workshop UI.

The constraints up front:

1. **BEQSAN backend is .NET 8 Clean Arch + EF + Dapper + SQLite** — none of the Node/Prisma code from social.iva.ge can be ported as-is. We translate patterns, not source files.
2. **Page-scoped Meta tokens are sensitive** — Meta's TOS treats them as user data; logs at Information level must not contain them; persistence requires encryption at rest.
3. **Two ingestion paths** — Meta webhooks for DMs are reliable, but comment webhooks aren't (per the IvaSocManager inbox-route comment in [routes/inbox.ts](D:\Development\IvaSocManager\IvaSocManager\backend\src\routes\inbox.ts):1-13). We need both push (webhook) and poll (Hangfire) plumbing eventually; Phase 1 ships webhook only.
4. **AI assist** — Lasha asked specifically for KIE.ai access to Claude Sonnet 4.6. KIE exposes an OpenAI-compatible `/v1/chat/completions` endpoint that routes to Claude, so we treat it as an LLM provider behind an abstraction.

## Decision

**Module layout — feature folder per layer, mirrors existing `Configurator`:**

```
BEQSAN.Domain/Social/         SocialAccount, SocialPage, SocialPost, InboxThread,
                              InboxMessage, EncryptedToken, SocialErrors
BEQSAN.Application/Social/    Connect/, Accounts/, Posts/, Inbox/, Ai/, Webhooks/
                              Contracts/  (IMetaOAuthClient, IMetaGraphClient,
                                           IAiAssistService, repositories)
BEQSAN.Infrastructure/Social/ MetaOAuthClient, MetaGraphClient, KieAiAssistService,
                              AesGcmTokenCipher, repository impls, SocialOptions
BEQSAN.Api/Endpoints/         SocialEndpoints, MetaWebhookEndpoints
FRONT/apps/admin/src/         features/social/, components/shell/
```

**Decisions, with reasons:**

| Decision | Reason |
|---|---|
| Use **AES-GCM 256** to encrypt Meta tokens at rest, key from `Social:Encryption:Key` config | Symmetric is enough for "decrypt at edge of Meta HTTP call"; GCM gives us tag-based tamper detection; one key + per-row IV avoids a key-management ceremony for a 10-row dataset. Rotation = re-encrypt-everything. |
| **Store both `Iv` + `Cipher`** as separate `BLOB` columns inside an EF-owned value object | Owned-entity makes the encryption boundary explicit in the entity (vs. JSON-in-TEXT or a single concatenated BLOB), still maps to plain SQLite columns. |
| LLM via **KIE.ai chat completions** routed to `claude-sonnet-4-6` | Lasha already has KIE billing; OpenAI-compat call is two field names away from the existing fetch pattern; abstracted behind `IAiAssistService` so swapping to direct Anthropic SDK is a single DI registration when prompt-cache becomes a cost driver. |
| **Admin auth = static header `X-Admin-Token`** for Phase 0 | The proper JWT-bearer admin login isn't designed yet. The header gate sits in middleware and is replaced by `[Authorize]` policies in Phase 2 without touching feature code. Question logged in [questions.md](../questions.md). |
| **Webhook path is unauthenticated** (no admin token gate); verify token in `GET ?hub.verify_token=` handshake + (TODO) `X-Hub-Signature-256` HMAC on `POST` | Meta hits the webhook directly; the verify-token handshake + HMAC is the standard auth. HMAC is a follow-up — needs the production App Secret first. |
| **Pages own page-scoped tokens, not user tokens** | Meta Graph publish/inbox calls use the page token. The user token is kept only for re-discovering pages after a refresh. |
| **One `SocialPost` row per (composer, page, platform)** | Composer fans out; partial failures (FB succeeded, IG image format rejected) need to be visible per-row rather than rolled back. |
| **InboxThread groups by `(pageId, externalThreadId)`** | Externals: conversation id for DMs, post id for comments. Per-page uniqueness allows the same Meta id to coexist if it ever spans pages. |
| **No Hangfire job in Phase 1** | The webhook plus a manual "refresh" button is enough until the volume of comments forces polling. ADR-0001 already approves Hangfire — we'll add the worker when the IG-comment-webhook-is-unreliable signal actually hurts. |
| **Webhook payload parsed in the Api layer**, passed to Application as parsed `WebhookEvent[]` | Keeps the Application handler free of JSON shape concerns; webhook spec changes are localized to one file. |

## What we deliberately did NOT do (and why)

- **No Anthropic SDK package added.** KIE handles the routing; a single `HttpClient` + JSON is enough. Skipping the SDK keeps the dependency surface honest until prompt-cache is actually needed.
- **No `pages_messaging_subscriptions` background poller.** Phase 1 = real-time webhook DMs only.
- **No outbound media upload from local storage.** Posts take `https://…` URLs only — image management UI is a separate slice (lands when Roman wants a real media library, not before).
- **No tool-use auto-reply.** The IvaSocManager pattern (Claude with `create_order` / `schedule_appointment` tools) is excellent but blocks on the BEQSAN admin having actual `orders` + `appointments` tables, which Phase 1 doesn't yet have.
- **No `Login for Business` config-id flow.** Classic scope-based dialog is the safer default until the BEQSAN Meta App is reviewed; adding the config-id branch later is a 6-line diff in `MetaOAuthClient.BuildAuthorizeUrl`.

## Phasing

**Phase 0 — infra credentials (BLOCKING Phase 1):**
- Register a Meta App under `developers.facebook.com`, set `beqsan.iva.ge` as the domain, set redirect URI to `https://admin.beqsan.iva.ge/social/callback`.
- Submit App Review for: `pages_manage_posts`, `pages_messaging`, `instagram_content_publish`, `instagram_manage_messages`. 1–3 weeks typical.
- Generate AES-GCM key: `openssl rand -base64 32` → store via `dotnet user-secrets set "Social:Encryption:Key" …` in dev, Azure Key Vault / env in prod.
- Pick a KIE.ai project (Roman/Lasha decide which billing account), set `Social:Ai:ApiKey`.

**Phase 1 — what just shipped:** OAuth connect, page list, FB + IG post (text + 1–N images), webhook DM ingestion, FB comment ingestion (post-create), AI caption draft + reply suggest, admin-token-gated UI with 3 pages.

**Phase 2:** real JWT admin auth replacing the `X-Admin-Token` shim, HMAC webhook signature verification, Hangfire job for token refresh (60-day TTL on long-lived tokens) and comment polling, scheduled posts, post insights pull.

**Phase 3:** AI tool-use auto-reply (`create_order` ⇒ a real Orders table; `schedule_appointment` ⇒ a real Appointments table — both belong to the wider BEQSAN module, not Social).

## Consequences

- **Good:** clean Clean-Arch separation — Domain has zero HTTP/persistence dependency; Application has zero EF; Infrastructure owns the dirty edge. Swapping Meta API versions, swapping LLM provider, or swapping the encryption scheme is a one-class change.
- **Good:** Mirrors social.iva.ge ergonomically (composer + inbox + AI assist) without dragging the Node-specific complexity (multi-tenant brands, coin-based billing, video pipeline).
- **Trade-off:** the `X-Admin-Token` shim is a known interim. Anyone with the token has full publish access — fine for an internal beta where Roman is the only operator, NOT fine for production.
- **Trade-off:** comments via webhook are lossy (Meta drops some). Polling is a Phase-2 follow-up; in the meantime, users may see a stale comment list.
- **Trade-off:** AES-GCM key rotation requires a re-encrypt pass over `social_accounts` + `social_pages`. Tolerable at our row counts; if we ever shard or partition, switch to a versioned-key approach.

## References

- [social.iva.ge OAuth flow](D:\Development\IvaSocManager\IvaSocManager\backend\src\lib\meta.ts) — the inspiration for `MetaOAuthClient`.
- [social.iva.ge inbox routing](D:\Development\IvaSocManager\IvaSocManager\backend\src\routes\inbox.ts) — the comment-vs-DM split.
- [social.iva.ge auto-reply tools](D:\Development\IvaSocManager\IvaSocManager\backend\src\lib\auto-reply-tools.ts) — Phase 3 reference for tool-use replies.
- [Meta Graph v25 publishing reference](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media).
- [KIE.ai chat completions](https://docs.kie.ai/).
