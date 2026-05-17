# @beqsan/api-types

TypeScript types generated from BACK's OpenAPI document.

## Regenerate

Start the API first, then run from FRONT root:

```sh
# Terminal 1 (in BACK/)
dotnet run --project src/BEQSAN.Api

# Terminal 2 (in FRONT/)
pnpm --filter @beqsan/api-types gen
```

This writes `generated/v1.d.ts`. **Commit the file** — it's the API surface contract; reviewers should see endpoint changes in the diff.

## Hand-maintained envelope

`src/index.ts` exports the canonical `ApiResponse<T>` + `ApiError` envelope (see [docs/api/result-envelope.md](../../../docs/api/result-envelope.md)). These match exactly what `BEQSAN.Api.Common.ApiResponse` emits — generated paths/operations from `generated/v1.d.ts` plug into this envelope to form full endpoint typings:

```ts
import type { paths } from '@beqsan/api-types/generated';
import type { ApiResponse } from '@beqsan/api-types';

type CalculatePrice = paths['/api/v1/configurator/price']['post']['responses']['200']['content']['application/json'];
// In wire reality, this is ApiResponse<PriceBreakdownDto>.
```
