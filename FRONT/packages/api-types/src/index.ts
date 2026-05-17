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
  // Structured context that flows alongside the message. FRONT renders
  // localized strings from these keys instead of parsing the server's
  // Georgian message (see ADR-0002 amendment 2026-05-17).
  metadata?: Record<string, unknown> | null;
};

export type ApiResponse<T> =
  | { isSuccess: true; value: T; errors: [] }
  | { isSuccess: false; value: null; errors: ApiError[] };

// Wire-shape enums for the configurator layout. Values match the BACK
// PaneOpeningType / HingeSide enums (Enum.TryParse with ignoreCase:false)
// so PascalCase is the only legal form on the wire.
export type PaneOpeningType = 'Fixed' | 'Casement' | 'Tilt' | 'TiltAndTurn' | 'Sliding';
export type HingeSide = 'Left' | 'Right';

// Per-pane additive glass treatments (Step 5). PascalCase to match the
// BACK enum names; the validator allow-list rejects anything else.
export type GlassExtra = 'LowECoating' | 'Tempered' | 'Frosted' | 'Tinted';

export type ConfigurationPaneInput = {
  position: number;
  widthRatio: number;
  openingType: PaneOpeningType;
  hingeSide: HingeSide | null;
  hasMosquitoNet: boolean;
  // Optional — when omitted (or null/Guid.Empty) the server resolves the
  // material's default glass package. New panes added in Step 5+ always
  // populate this.
  glassTypeId?: string | null;
  glassExtras?: GlassExtra[];
};

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
