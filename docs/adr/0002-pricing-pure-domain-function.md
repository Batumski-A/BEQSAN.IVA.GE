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

## Future considerations

- **Domain events for price changes.** If a saved configuration needs to react to a price change (e.g. admin updates `BasePricePerSqmMinor` for `aluminum-thermal`), we'd raise a `MaterialPriceChanged` event and let interested aggregates resubscribe. Not needed for Phase 1.
- **Multi-currency pricing.** `Material.Currency` is already a field; today every seeded row is GEL. When a USD price comes along, the formula is unchanged — currency just propagates through.
- **Regional install cost.** Per the kickoff §8, regions outside Batumi get a per-km install modifier. That would appear as a new `PriceLine("install", "მონტაჟი", X)` line once the address-to-region service ships.
