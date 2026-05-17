/**
 * Generated BACK API types — run `pnpm gen-api` (from FRONT/ root) against a
 * running dev API at http://localhost:5000 to regenerate ./generated/v1.d.ts.
 *
 * Until the first generation runs, this re-exports the envelope contract
 * directly. After codegen, consumers should import endpoint paths/operations
 * from `@beqsan/api-types/generated`.
 */

export type ApiError = {
  code: string;
  message: string;
  field: string | null;
};

export type ApiResponse<T> =
  | { isSuccess: true; value: T; errors: [] }
  | { isSuccess: false; value: null; errors: ApiError[] };

export type HealthChecks = {
  db: { status: 'up' | 'down' | 'degraded'; latencyMs: number };
  cache: { status: 'up' | 'down' | 'degraded'; latencyMs: number };
  storage: { status: 'up' | 'down' | 'degraded'; latencyMs: number };
};

export type HealthResponse = {
  status: 'ok' | 'degraded' | 'down';
  version: string;
  commitSha: string;
  uptimeSeconds: number;
  checks: HealthChecks;
  timestampUtc: string;
};
