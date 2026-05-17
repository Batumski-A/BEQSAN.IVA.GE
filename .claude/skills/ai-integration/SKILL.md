# Skill: ai-integration

**Trigger:** anything touching `/api/v1/ai/*`, anything calling Anthropic/Replicate/OpenAI from `BACK/`, or AI-related frontend (photo upload, room visualization, chat).

**Source:** [docs/kickoff.md §7, §13](../../../docs/kickoff.md).

---

## Endpoints

| Endpoint | Provider | Sync/Async | Phase |
|---|---|---|---|
| `POST /api/v1/ai/estimate-dimensions` | Anthropic Claude vision | sync (≤ 8s) | 1.5 |
| `POST /api/v1/ai/visualize-in-room` | Replicate (FLUX / SDXL+ControlNet) | async via Hangfire | 2 |
| `POST /api/v1/ai/chat` | Anthropic Claude + RAG | sync streaming | 2 |

## Photo dimension estimation (Claude vision)

**Model:** `claude-3-5-sonnet-20241022` (use latest stable Sonnet at implementation time — Opus is overkill for this).

**System prompt:**
```
You are a precision measurement assistant for a window/door manufacturer.
Given a photograph and two marked regions:

1. A REFERENCE OBJECT of known real-world size (e.g., A4 paper = 21.0×29.7cm,
   standard door = 80×200cm, credit card = 8.56×5.4cm).
2. A TARGET OPENING whose dimensions need estimation.

Use perspective geometry to estimate the target opening's width and height in
centimeters. Account for:
- Camera tilt / perspective distortion
- Reference object orientation
- Mild lens distortion

Return ONLY valid JSON in this exact shape:
{
  "widthCm": <integer>,
  "heightCm": <integer>,
  "confidence": <0.0-1.0>,
  "notes": "<Georgian string explaining any caveats>",
  "warnings": ["<array of Georgian warnings if perspective is bad>"]
}

If the photo is unusable (too dark, reference object unclear, target hidden),
return confidence < 0.4 and explain in notes.
```

**Request shape:**
```json
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 500,
  "system": "...prompt above...",
  "messages": [{
    "role": "user",
    "content": [
      {
        "type": "image",
        "source": {
          "type": "base64",
          "media_type": "image/jpeg",
          "data": "..."
        }
      },
      {
        "type": "text",
        "text": "Reference: A4 paper at coords [(120,300),(180,420)]. Target opening at [(50,80),(450,650)]. Estimate target dimensions."
      }
    ]
  }]
}
```

**Response parsing:** parse JSON with `System.Text.Json`. If parsing fails or `confidence < 0.4`, surface a Georgian fallback: `„ფოტოს ანალიზი ვერ მოხერხდა — გადაამოწმე reference object-ი ან შეიყვანე ზომები ხელით."`.

## Photo visualization (Replicate)

**Model candidates:** `black-forest-labs/flux-dev` (preferred), `stability-ai/stable-diffusion-xl-base-1.0` + ControlNet (canny/depth).

**Flow:**
1. User submits room photo + configuration.
2. API enqueues Hangfire job, returns `{ jobId, statusUrl }` immediately.
3. Worker calls Replicate predictions API, polls until done.
4. On success: stores result in MinIO, records `OrderAttachment` (or `Visualization` entity), sends SMS/push: `„შენი ფანჯრის ვიზუალიზაცია მზადაა → link"`.
5. On failure after 3 retries: alerts admin, surfaces graceful fallback to user.

## Rate limiting

| Audience | `/estimate-dimensions` | `/visualize-in-room` | `/chat` |
|---|---|---|---|
| Anonymous (by phone hash) | 5/day | 3/day | n/a (Phase 2) |
| Verified order owner | 20/day | 10/day | 50/day |
| Admin | unlimited | unlimited | unlimited |

Implement via AspNetCoreRateLimit with a custom key generator using `Hash(phone) ?? Hash(ip)`.

## Caching

**Cache key:** `SHA256(imageBytes) + ":" + referenceType + ":" + lineCoordsCanonical`.

Identical inputs ⇒ same output, no re-call. Cache hit returns instantly. Store cache in Redis (or in-memory for Phase 1.5).

For room visualization, key by `SHA256(roomImage) + ":" + configurationHash`.

## Cost monitoring

- Log every AI call with `{ provider, model, tokensIn, tokensOut, estimatedCostUsd }`.
- Hangfire daily job aggregates the day's spend by provider.
- Admin dashboard widget shows month-to-date spend vs. budget.
- **Soft warning** at 80% of monthly budget → admin email.
- **Hard limit** at 100% → disable user-facing AI endpoints, show fallback: `„ოპერატორი დაგირეკავთ ზომების სანახავად."`. Admin can still call manually.

## Implementation in `BACK/`

```
BEQSAN.Infrastructure/Ai/
├── Anthropic/
│   ├── AnthropicClient.cs           # HttpClient wrapper, retry policy
│   ├── DimensionEstimator.cs        # service implementing IDimensionEstimator
│   └── ChatService.cs               # Phase 2
├── Replicate/
│   ├── ReplicateClient.cs
│   └── RoomVisualizer.cs            # service implementing IRoomVisualizer
└── AiCostTracker.cs                 # logs cost per call to AiCallLog table
```

Interfaces live in `BEQSAN.Application/Ai/Abstractions/`:
```csharp
public interface IDimensionEstimator
{
    Task<Result<DimensionEstimate>> EstimateAsync(EstimateRequest req, CancellationToken ct);
}
```

Handlers in `BEQSAN.Application/Ai/` orchestrate validation + caching + invocation.

## Security

- **Never expose Anthropic/Replicate API keys to the frontend.** All calls go through `BACK/`.
- **Strip EXIF GPS** from uploaded photos before forwarding to AI providers.
- **Resize photos** to max 2048×2048 before sending (most providers cap at 5MB anyway).
- **Validate MIME type** at upload — accept `image/jpeg`, `image/png`, `image/webp` only.
- **Magic-byte sniffing** on the server, not just Content-Type header.
- **30-day retention** on user-uploaded photos unless attached to a committed order.

## Frontend integration

```
FRONT/src/features/configurator/photo-ai/
├── DimensionEstimator.tsx       # full UI flow: camera/upload → reference marking → submit
├── ReferenceLineDrawer.tsx      # Konva canvas for marking
├── api.ts                       # POST to /api/v1/ai/estimate-dimensions
└── hooks/
    └── useDimensionEstimate.ts  # TanStack Mutation wrapper
```

UI states:
1. Initial → camera/upload picker.
2. Image loaded → Konva canvas, "draw a line on a reference object" instruction.
3. Reference drawn → "now mark the opening".
4. Both drawn → submit button.
5. Submitting → loading skeleton with `„ვაანალიზებთ ფოტოს... ~5 წამი"`.
6. Result → editable `widthCm` / `heightCm` fields prefilled, confidence shown as a hairline progress bar.

## Anti-patterns

```
❌ Anthropic API key in frontend env             → backend-only
❌ Skipping the EXIF strip                       → leaks user location
❌ Trusting AI output without confidence check   → always show editable fields
❌ Calling AI sync from request thread for long-running visualization → Hangfire
❌ No rate limit on anonymous AI endpoints       → cost spike risk
❌ English error messages                        → Georgian UI strings
❌ No cache key on image hash                    → wasteful re-calls
❌ Storing raw photo in DB                       → MinIO/S3 with retention policy
```

## Related skills

- [dotnet-clean-arch](../dotnet-clean-arch/SKILL.md) — handler/service shape.
- [configurator-architecture](../configurator-architecture/SKILL.md) — Step 3b flow.
- [content-voice](../content-voice/SKILL.md) — Georgian error/success copy.
- [deployment-ops](../deployment-ops/SKILL.md) — MinIO storage, secret management.
