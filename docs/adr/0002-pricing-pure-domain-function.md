# ADR-0002: Pricing as a pure domain function with `Result<T>`

- **Date:** 2026-05-17
- **Status:** Accepted
- **Decider:** Claude (per [feedback-infra-decisions-self-made](../../) — Lasha delegates implementation calls)
- **Supersedes:** none. **Superseded by:** none.

## Context

The Configurator's price panel needs to update on every meaningful selection — Step 2's material pick, Step 3's dimensions (next slice), eventually Step 5-7's glass / color / accessory picks. We need a calculation surface that:

1. Is **deterministic**: same inputs → same outputs, always. No clock, no random, no DB, no network.
2. Is **trivially testable**: no doubles, no in-memory DB, no time-warping.
3. Returns **typed failures** (out-of-range dimensions, missing material) as `Result<T>` — never exceptions across the API boundary.
4. Stores money as **int minor units** (tetri for GEL). No `double`. No `decimal` at the persistence boundary.
5. Is **forward-compatible**: future `PriceLine` entries (glass / color / accessories / region) drop in without breaking callers.

Two unworkable alternatives ruled out before this decision:

- **Calculator embedded in the Application handler.** Couples math to MediatR + DI, makes property-style testing painful, and would mean rewriting it when (inevitably) admin tooling needs the same math headless.
- **Calculator as a registered service via DI.** Same problem — every test needs the substitute wired up, and the static-method-style "given X compute Y" intent is hidden behind ceremony.

## Decision

**Pricing math lives in `BEQSAN.Domain.Configurator.PriceCalculator` as `public static` methods.**

```csharp
public static class PriceCalculator
{
    public const decimal VatRate = 0.18m;
    public const int MinDimensionCm = 30;
    public const int MaxDimensionCm = 400;

    public static Result<PriceBreakdown> Compute(Material material, int widthCm, int heightCm)
    {
        // validate → area → material cost → vat → breakdown
    }
}
```

Returning `Result<PriceBreakdown>` keeps the failure modes (null material, out-of-range dims) inside the type system. Callers compose:

```csharp
var breakdown = PriceCalculator.Compute(material, w, h);
if (breakdown.IsFailure) return Result.Failure<PriceBreakdownDto>(breakdown.Errors);
return Result.Success(MapToDto(breakdown.Value));
```

### Storage and transport conventions

- **`Material.BasePricePerSqmMinor`** is `int`. 38 000 = 380.00 ₾/m².
- **`PriceLine.AmountMinor` and `PriceBreakdown.TotalMinor`** are `long` (sums can exceed int.MaxValue for hypothetical large orders).
- **DTOs** carry both `amountMinor` (`long`, raw) and `amountDisplay` (`string`, `"638.40"`) so the SPA never does its own currency math.
- **`Money` value object** keeps a `decimal Amount` for ergonomic compose-time math but gains `FromMinor(long, Currency)` and `ToMinor()` for safe crossings at storage / DTO boundaries.
- **Banker's rounding** (`MidpointRounding.ToEven`) on every rounding step so 0.5-tetri cases don't drift up systematically across thousands of orders.

### Composition layout

```
Domain/Configurator/
├── PriceCalculator.cs        // public static; pure
├── PriceBreakdown.cs         // value object (record)
└── PriceLine.cs              // value object (record)
```

Failure error codes follow the [Result envelope taxonomy](../api/result-envelope.md):

- `configurator.dimensions.widthOutOfRange` / `heightOutOfRange` — validation type, `field` = `"widthCm"` / `"heightCm"`, maps to HTTP 400 via `ErrorType.Validation`.
- `material.notFound` — bubbled when the handler upstream passes null.

## Consequences

**Positive:**
- **Hits the spec example exactly.** 120×140 cm at 38 000 tetri/m² produces `area 1.68 → material 63 840 → vat 11 491 → total 75 331 = 753.31 ₾`. The endpoint integration test (`PostPrice_HappyPath_Returns_753_31`) and the unit test (`Compute_120x140_AluminumThermal_Matches_753_31`) both assert against these numbers — any pricing-formula regression breaks loudly.
- **Tests are 1-liners.** `PriceCalculator.Compute(material, 120, 140)` — no fixtures, no DI, no async.
- **Easy to evolve.** Step 5+ slices add `PriceLine` entries to the returned breakdown. Callers that just sum `TotalMinor` don't need to know.
- **No accidental I/O.** Anything new requiring a DB lookup or service call has to happen in the handler before calling Compute. The function signature enforces purity.
- **Replicable client-side mirror.** The FRONT can ship the same formula for instant feedback (per configurator-architecture skill), with the server still the source of truth on submit.

**Negative:**
- `public static` makes the function harder to mock — but it should never be mocked. Callers needing different math should use a different function.
- Adding state (e.g. region-based install pricing that varies by date) would require a parameter on Compute or a new function. **Constraint, not a bug.** When that pressure arrives, evaluate whether the new pricing needs a different abstraction.

## Implementation status

- `Money.FromMinor` / `ToMinor` shipped in `feat(domain): Material entity + Money tightening` (commit `eaecb14`).
- `PriceCalculator` + value objects shipped in `feat(domain): PriceCalculator + PriceBreakdown + PriceLine` (commit `c4bd0aa`).
- `ComputePriceHandler` (validation + cross-field + math) in `feat(app): ComputePriceCommand` (commit `7af0fc8`).
- Endpoint `POST /api/v1/configurator/price` in `feat(api): /v1/configurator/price endpoint` (commit `a06e15c`).
- 16 unit tests (`PriceCalculatorTests`) + 6 handler tests (`ComputePriceHandlerTests`) + 4 endpoint tests (`MaterialsAndPriceEndpointTests`).

## Amendments

### 2026-05-17 — Constraint dependency (Step 3 slice)

`PriceCalculator.Compute` signature extended to take `ProductType` as the
first argument. Reasons:

1. Per-product-type dimension ranges (door 60-140 × 180-260 cm differs from
   window 30-300 × 30-250 cm) — needed for Step 3 inputs. Hardcoding them
   in the calculator would lose admin editability; loading them in the
   handler and passing in works.
2. Cross-field check (material belongs to product type) moved from the
   handler into the calculator. Same input → same output still holds —
   the cross-field error is determined by `material.ProductTypeId ==
   productType.Id`, no I/O.
3. Out-of-range failures now carry **metadata** (`min`, `max`, `actual`)
   via the new `Error.WithMetadata(key, value)` helper. FRONT renders
   "სიგანე 60–140 სმ შორის უნდა იყოს" from the metadata, not by parsing
   the server's Georgian message.

**Second regression canary locked**: door 80×210 cm × door-aluminum-thermal
(42 000 tetri/m²) → area 1.68 m² → material 70 560 → vat 12 701 (banker's
12 700.8) → total **83 261 tetri = 832.61 ₾**. Asserted at the unit
(`Compute_Door_80x210_AluminumThermal_Matches_851_47`), handler
(`Handle_Door_80x210_DoorThermal_Matches_832_61`), and HTTP
(`PostPrice_Door_80x210_Matches_832_61` in
`ProductTypeDetailEndpointTests`) layers.

Constraint columns added to `product_types`: `min_width_cm`, `max_width_cm`,
`min_height_cm`, `max_height_cm`. Seeded with market-realistic values by
slug. Admin-editable Phase 2; for now Roman locks the numbers before
public preview (see docs/questions.md).

### 2026-05-17 — Multi-pane layout (Step 4 slice)

`PriceCalculator.Compute` signature extended to accept an optional
`IReadOnlyList<ConfigurationPane>? panes` parameter. Reasons:

1. Real windows aren't a single sheet of glass — they have **mullions and
   sashes**: one fixed pane next to a casement, two sliders, three
   panoramic fixed lights, etc. Each non-Fixed pane carries an opening
   mechanism that costs more than plain glass.
2. **Per-pane opening surcharge** computed against the pane's own
   pro-rata area (`paneArea = totalArea × widthRatio`):
   - Fixed (ყრუ): +0%
   - Casement (გასაღები): +8%
   - Tilt (დასაკეცი): +10%
   - TiltAndTurn (გასაღები + დასაკეცი): +18%
   - Sliding (სლაიდინგი): +12%
3. **Mosquito net additive**: per-pane boolean `HasMosquitoNet` adds
   80.00 ₾ (8 000 tetri) flat per opted pane. Aluminum-framed mesh,
   per Roman's quote.
4. **VAT semantics tightened**: VAT is now applied to the **subtotal**
   (material + surcharges + mosquito) instead of material-only. Step 1+2
   canaries hold because surcharges = 0 for a single Fixed pane and
   mosquito = 0 by default, so material+vat math is unchanged.
5. **Layout validation is its own pure function**: `LayoutValidator.Validate`
   (Domain/Configurator) enforces pane-count ranges by slug, ratio sum =
   1.000 ± 0.001, position sequence 1..N, slug-specific rules (door ≤ 1
   Fixed; sliding only Sliding/Fixed), and the hinge matrix (Casement /
   TiltAndTurn require HingeSide; others forbid it). All failures carry
   structured metadata for FRONT rendering — see the
   [result-envelope contract](../api/result-envelope.md).

**Backwards compatibility**: `panes` is optional and null/empty means
"synthesize a single full-width Fixed pane." Both prior canaries
(753.31 ₾, 832.61 ₾) re-asserted against the new code path and pass
unchanged. Integration test
`PostPrice_OmittedPanes_PreservesCanary1_WindowDefaultFixedAt_753_31`
locks the no-panes shape against canary #1.

**Third regression canary locked**: window 165×140 cm × aluminum-thermal,
two equal-width panes — pane 1 Casement (Right hinge), pane 2 Fixed.
- area = 2.31 m² (165 × 140 / 10 000, banker's-rounded to 2dp for display)
- material = round(2.31 × 38 000) = 87 780 tetri
- pane 1 area = 2.31 × 0.5 = 1.155 m² → casement surcharge = round(1.155 × 38 000 × 0.08) = 3 511 tetri
- pane 2 = Fixed → 0 tetri
- subtotal = 87 780 + 3 511 = 91 291 tetri
- vat = round(91 291 × 0.18) = 16 432 (banker's 16 432.38)
- total = **107 723 tetri = 1077.23 ₾**

Asserted at unit (`Compute_Canary3_Window_165x140_2pane_CasementFixed_Matches_1077_23`),
endpoint (`PostPrice_Canary3_Window_165x140_2pane_CasementFixed_Equals_1077_23`),
and as live curl smoke check before commit.

New domain types: `PaneOpeningType` enum, `HingeSide` enum,
`ConfigurationPane` record (Position, WidthRatio, OpeningType, HingeSide?,
HasMosquitoNet), `LayoutValidator` static class with `LayoutErrors`
constants. New wire-shape: `ConfigurationPaneInput` with string enums
parsed defensively in the handler before reaching the calculator.

Pane-count ranges (slug-keyed static table, mirrored on FRONT for the
segmented control):

| Slug      | Min | Max |
|-----------|-----|-----|
| window    | 1   | 4   |
| door      | 1   | 2   |
| sliding   | 2   | 4   |
| panoramic | 1   | 6   |
| balcony   | 1   | 8   |
| (unknown) | 1   | 4   |

`ProductType.MinPaneCount` / `MaxPaneCount` columns are Phase 2 admin
work; the static table is the source of truth until then.

### 2026-05-18 — Per-pane glass packages + extras (Step 5 slice)

`PriceCalculator.Compute` signature extended to accept an optional
`IReadOnlyDictionary<Guid, GlassType>? availableGlassTypes` parameter
representing the glass packages compatible with the chosen material.
Reasons:

1. Real glazing isn't a single sheet — customers pick from a 7-package
   catalog (double-standard, double-low-e, triple-low-e, quadruple-
   low-e, tempered-double, frosted-double, tinted-double) per pane,
   and stack additive treatments (Low-E coating, Tempered, Frosted,
   Tinted) on top.
2. Compatibility is **material-keyed**: aluminum-thermal allows all 7;
   PVC-white tops out at double (no triple/quad weight-allowed). New
   `material_glass_compatibility` table holds the M:M mesh; the
   pricing handler pulls the per-material slice and hands the
   dictionary to the calculator.
3. **Per-pane glass surcharge** valued at `round(paneArea × glass.SurchargePerSqmMinor)` —
   emitted as `pane.{n}.glass.{slug}` lines, suppressed when surcharge
   is 0 (the default package).
4. **Per-pane extras** — additive treatments per pane area at hard-
   coded rates (Roman-locked; Phase 2 promotes to admin PricingRule):
   Low-E 45 ₾/m², Tempered 70 ₾/m², Frosted 35 ₾/m², Tinted 40 ₾/m².
   Distinct-deduped before pricing; Frosted+Tinted on the same pane
   is rejected by the validator (visual conflict).
5. **VAT semantics widen further**: VAT is now applied to
   `material + opening + glass + extras + mosquito`. The previous
   three canaries hold because surcharges = 0 when glass falls back
   to the default + no extras + no panes (single-Fixed synth).
6. **Backwards compatibility**: when `availableGlassTypes` is null or
   empty, the whole glass branch is skipped. Step 4 tests and callers
   that don't know about glass still pass byte-for-byte (canary #3
   = 1077.23 ₾ asserted on the new code path with `availableGlassTypes:
   null`).
7. **Default-glass auto-resolution**: when a glass set IS supplied but
   a pane carries `GlassTypeId == Guid.Empty`, the calculator resolves
   it to the IsDefault row in the available set (deterministic
   tiebreaker: lowest surcharge, then SortOrder). So canary #1
   (753.31 ₾) and canary #2 (832.61 ₾) also re-pass on the new code
   path because the handler-resolved default for ALU-thermal is
   `double-standard` (surcharge 0).

**Fourth regression canary locked**: window 165×140 cm × aluminum-
thermal, two equal-width panes; both `triple-low-e`, pane-1 also
`tempered`:
- area = 2.31 m² (165 × 140 / 10 000)
- material = round(2.31 × 38 000) = 87 780 tetri
- pane 1: paneArea 1.155 m², Casement-Right
  - opening = round(1.155 × 38 000 × 0.08) = 3 511 tetri
  - glass triple-low-e (6 000 tetri/m²) = round(1.155 × 6 000) = 6 930 tetri
  - tempered (7 000 tetri/m²) = round(1.155 × 7 000) = 8 085 tetri
- pane 2: paneArea 1.155 m², Fixed
  - glass triple-low-e = 6 930 tetri
- subtotal = 87 780 + 3 511 + 6 930 + 8 085 + 6 930 = 113 236 tetri
- vat = round(113 236 × 0.18) = 20 382 tetri (banker's: 20 382.48)
- total = **133 618 tetri = 1336.18 ₾**

Asserted at unit
(`Canary4_Window_165x140_TripleLowE_Plus_Tempered_Equals_1336_18` in
`PriceCalculatorGlassTests`) and HTTP
(`PostPrice_Canary4_Window_165x140_TripleLowEPlusTempered_Equals_1336_18`
in `GlassEndpointTests`).

New domain types: `GlassType` entity, `GlassExtra` enum,
`GlassExtraPricing` static table. `ConfigurationPane` gains optional
`GlassTypeId` + `GlassExtras` params (defaulted so Steps 1-4 record
literals still compile). `LayoutValidator.Validate` gains an optional
`availableGlassTypes` dictionary and three new error codes:
`configurator.glass.required`, `.notCompatibleWithMaterial`
(BusinessRule → 422), `.frostedTintedConflict`. New wire-shape:
`ConfigurationPaneInput` gains optional `GlassTypeId?` +
`GlassExtras` (string[]); validator + handler defensive on token
parsing.

New tables: `glass_types`, `material_glass_compatibility` (composite
PK, cascade FKs). Seeded with the 7 Roman-locked packages + 25 compat
rows by material slug.

Glass surcharge table (tetri / m² above material baseline):

| Slug              | Pane count | Surcharge | U-value |
|-------------------|-----------:|----------:|--------:|
| double-standard   | 2          | 0         | 2.8     |
| double-low-e      | 2          | 2 500     | 1.6     |
| triple-low-e      | 3          | 6 000     | 1.0     |
| quadruple-low-e   | 4          | 12 000    | 0.7     |
| tempered-double   | 2          | 5 500     | 2.7     |
| frosted-double    | 2          | 3 000     | 2.7     |
| tinted-double     | 2          | 3 500     | 2.5     |

Roman to verify U-values against actual ALUPROF / ASAŞ datasheets
before public launch.

## Future considerations

- **Domain events for price changes.** If a saved configuration needs to react to a price change (e.g. admin updates `BasePricePerSqmMinor` for `aluminum-thermal`), we'd raise a `MaterialPriceChanged` event and let interested aggregates resubscribe. Not needed for Phase 1.
- **Multi-currency pricing.** `Material.Currency` is already a field; today every seeded row is GEL. When a USD price comes along, the formula is unchanged — currency just propagates through.
- **Regional install cost.** Per the kickoff §8, regions outside Batumi get a per-km install modifier. That would appear as a new `PriceLine("install", "მონტაჟი", X)` line once the address-to-region service ships.
