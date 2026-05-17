# BEQSAN API — Result&lt;T&gt; JSON envelope contract

Every endpoint that returns a `Result<T>` or `Result` on the server emits the **same top-level JSON shape**, regardless of success or failure. Consumers (FRONT) only ever inspect three fields: `isSuccess`, `value`, `errors`.

This is intentional — predictable client code beats RFC 7807 ProblemDetails for our use case (TanStack Query, exhaustive error rendering, no special-case "validation problem" parsing).

## Success

HTTP **200 OK** (or **201 Created** for resource-creating POSTs, or **204 No Content** for `Result` without a value).

```json
{
  "isSuccess": true,
  "value": { /* T — payload */ },
  "errors": []
}
```

`value` is always present on success — `null` only when `T` is itself nullable.
`errors` is always an empty array on success (never `null`).

## Failure

HTTP status is **mapped from `ErrorType`** (see table below). The body shape is identical to success but with `value: null` and one-or-more errors.

```json
{
  "isSuccess": false,
  "value": null,
  "errors": [
    {
      "code": "validation.widthCm",
      "message": "სიგანე უნდა იყოს მინიმუმ 30 სმ",
      "field": "widthCm"
    }
  ]
}
```

Multiple errors are common from validation (one per failed field). Other failures usually emit a single error.

## Field reference

| Field | Type | Notes |
|---|---|---|
| `isSuccess` | `boolean` | Always present. |
| `value` | `T \| null` | Server-side `T` on success; `null` on failure. |
| `errors` | `ApiError[]` | Empty `[]` on success; 1+ on failure. |
| `errors[].code` | `string` | Dot-namespaced **English**, machine-readable, **stable across releases**. UI maps to i18n. |
| `errors[].message` | `string` | **Georgian** (default locale). Already localized server-side. Safe to display verbatim. |
| `errors[].field` | `string \| null` | Camel-cased input property name when the error is bound to a single field; `null` otherwise. |
| `errors[].metadata` | `Record<string, unknown> \| null` | Structured context the UI uses to render the error precisely. **Optional** — omitted when there's nothing structured to add. For out-of-range validation: `{ "min": 60, "max": 140, "actual": 30 }`. For mismatches: `{ "expected": "...", "got": "..." }`. Keys are stable per error code. |

### `code` taxonomy

- Format: `<domain>.<subject>.<problem>`. Lowercase. No spaces. ASCII only.
- Examples:
  - `validation.widthCm`
  - `validation.phone.empty`
  - `phone.invalid`
  - `order.notFound`
  - `pricing.rule.notFound`
  - `warranty.expired`
  - `auth.unauthorized`
- **Stable across releases.** Once a code ships, it never changes form. Add a new code rather than renaming.
- Group prefixes match feature folders in `BEQSAN.Application/`.

### `message` rules

- Georgian-first, full sentence, ends in a period (or question mark for "shall we retry?" patterns).
- Names the cause **and** suggests action when possible (per [`.claude/skills/content-voice/SKILL.md`](../../.claude/skills/content-voice/SKILL.md)).
- Never leaks internal state (stack traces, connection strings, user IDs other than the caller's).

### `field` rules

- Always camelCase (`widthCm`, not `WidthCm` or `width_cm`).
- Matches the JSON property name in the request body that the SPA can highlight.
- `null` when not bound to a single input (e.g. business-rule failures spanning multiple fields).

### `metadata` rules

- Keys are camelCase, lowercase-first words. Values are JSON primitives
  (string / number / boolean / null) — no nested objects so the FRONT
  can `Record<string, unknown>` type it without surprises.
- **Keys stable per error code.** `configurator.dimensions.widthOutOfRange`
  always carries `{ min, max, actual }` — if the code stays, the keys
  stay.
- Add a new key for a new code rather than reusing an existing one with
  different semantics.
- Omit metadata entirely (not `{}`) when the error has nothing structured
  to convey. JSON serializer drops null fields globally.

### Known metadata payloads

| code | metadata keys |
|---|---|
| `configurator.dimensions.widthOutOfRange` | `min` (int), `max` (int), `actual` (int) |
| `configurator.dimensions.heightOutOfRange` | `min` (int), `max` (int), `actual` (int) |
| `configurator.layout.paneCount` | `min` (int), `max` (int), `actual` (int) |
| `configurator.layout.widthRatioSum` | `expected` (string, e.g. `"1.000"`), `actual` (string, e.g. `"0.800"`) |
| `configurator.layout.sliding.invalidOpening` | `position` (int), `got` (string, lowercased) |
| `configurator.layout.pane.hingeRequired` | `position` (int), `openingType` (string, lowercased) |
| `configurator.layout.pane.hingeForbidden` | `position` (int), `openingType` (string, lowercased) |
| `configurator.layout.pane.openingTypeInvalid` | `position` (int), `got` (string) |
| `configurator.layout.pane.hingeSideInvalid` | `position` (int), `got` (string) |

### Pattern: metadata as contract carrier

`metadata` is the **contract between the server and FRONT localisation**.
The server emits a Georgian `message` (safe to display verbatim if no FRONT
locale support has shipped for the code yet), but the FRONT renders from a
locale template keyed on `code`, interpolating `metadata` values:

```ts
// FRONT: errors.layout.hingeRequired = "Pane {{position}} needs a hinge side."
const text = t(`configurator.errors.layout.hingeRequired`, {
  position: error.metadata.position,
});
```

This means:
- **New locales add zero server work.** Adding `en`/`ru` to a code is a
  pure FRONT change — the server never speaks anything other than
  Georgian.
- **Field-level highlighting flows for free.** Anywhere a code carries
  `position` (or `field`), the FRONT can mark the offending control
  red without parsing prose.
- **Keys must stay stable per code.** Renaming `position → paneIndex`
  silently breaks every FRONT translation that referenced `{{position}}` —
  changes to existing keys are equivalent to renaming a public API.
  Add a new code if you need a different shape.

## HTTP status mapping

| `ErrorType` | HTTP | When |
|---|---|---|
| `Validation` | **400** Bad Request | FluentValidation pipeline (per-field errors). |
| `Unauthorized` | **401** | Missing / invalid JWT. |
| `Forbidden` | **403** | Authenticated but lacking required permission. |
| `NotFound` | **404** | Entity not found. |
| `Conflict` | **409** | Constraint conflict (e.g. duplicate phone draft, status transition collision). |
| `BusinessRule` | **422** Unprocessable Entity | Domain rule violation (e.g. "warranty already expired", "order cannot be cancelled in `installed` state"). |
| `Failure` | **500** Internal Server Error | Anything unexpected; `GlobalExceptionHandler` collapses to a single generic Georgian message — internal details land in Serilog only. |

The 500 path **does not leak the internal error**. The client receives:

```json
{
  "isSuccess": false,
  "value": null,
  "errors": [
    {
      "code": "internal.error",
      "message": "გავიდა მცირე ხარვეზი ჩვენს მხარეზე. სცადე თავიდან, თუ პრობლემა გრძელდება — დაგვიკავშირდი.",
      "field": null
    }
  ]
}
```

The correlation id is on the `X-Correlation-Id` response header.

## Source of truth

- `BEQSAN.Domain.Common.Result` + `Result<T>` — what handlers return.
- `BEQSAN.Domain.Common.Error` — the per-error record `(Code, Message, Type, Field?)`.
- `BEQSAN.Api.Common.ApiResponse<T>` + `ApiError` — the wire envelope.
- `BEQSAN.Api.Common.ResultExtensions` — `result.ToHttpResult()` does the mapping.

Any new error type must be added to `ErrorType`, mapped in `ResultExtensions.StatusFor`, and documented in the "HTTP status mapping" table above.

## Frontend consumption (preview)

The FRONT axios client unwraps the envelope and re-throws on `isSuccess: false`:

```ts
// FRONT/apps/web/src/shared/api/client.ts (pattern, lands with FRONT scaffold)
type ApiResponse<T> = { isSuccess: true; value: T; errors: [] }
                    | { isSuccess: false; value: null; errors: ApiError[] };

const response = await axios.post<ApiResponse<OrderDto>>("/api/v1/configurator/submit", body);
if (!response.data.isSuccess) {
  throw new ApiError(response.data.errors, response.status);
}
return response.data.value;
```

TanStack Query mutations get a clean `{ data: T }` interface after unwrap; per-field validation errors flow into React Hook Form via `setError(field, { message })`.
