# ADR-0004: 2026 pricing baseline applied to Phase-1 seeders

- **Date:** 2026-05-19
- **Status:** Accepted
- **Decider:** Claude (per [feedback-infra-decisions-self-made](../../) — Lasha delegates implementation calls)
- **Supersedes:** none. **Superseded by:** none.
- **Companion research:** [docs/research/2026-pricing-baseline.md](../research/2026-pricing-baseline.md)

## Context

The Phase-1 catalog seeders (`MaterialSeeder`, `GlassTypeSeeder`, `ColorOptionSeeder`, `AccessoryCatalogSeeder`) carried draft pricing dating to 2026-05-17. The XML doc on `MaterialSeeder` said "Roman locks the final numbers before public preview", and the per-row prices were rough placeholders pulled from competitor sites without a documented source-of-truth trail.

The public-facing configurator launch needs **defensible real-money numbers**, with:

1. A documented source per row (so Roman can audit and reset any line without redoing the research).
2. A clear midpoint-of-market + 5–10% BEQSAN-premium rule, since Roman runs the workshop directly with German hardware and a 10-year warranty (we should price ~mid-to-high, not bottom-of-market).
3. No churn to the pricing canary tests (canaries #1-#7 lock at total ₾753.31 → ₾2592.77 against specific tetri values across material × glass × color × accessory × installation surcharges).
4. Tetri-only, `int`-only, `"GEL"` currency. No schema changes.

## Decision

The seeders now carry the **2026-05-19 baseline** documented in [docs/research/2026-pricing-baseline.md](../research/2026-pricing-baseline.md). Each `MaterialSpec` / `GlassSpec` / `ColorSpec` / `HandleSpec` / `LockSpec` / `BlindSpec` row carries a single-line comment of the form:

```
// 2026-05-19 baseline: <competitor> @ ₾<X>/m², BEQSAN <±Y%> = ₾<Z>/m²
```

so a reader can trace each tetri value back to its market source without leaving the file.

### What actually changed in tetri terms

**Material rows** — only the four PVC rows + the balcony-PVC row shifted; aluminum rows stayed verbatim because the existing values were already congruent with the Georgian competitor mid (and canary-pinned via the integration tests):

| Slug × ProductType | Old | New | Delta | Rationale |
|---|---:|---:|---:|---|
| `pvc-white` × window | 17 000 | **19 500** | +14.7% | gns.ge Synego entry-tier mid ₾195/m² — old value was below market reality. |
| `pvc-laminated` × window | 24 000 | **27 500** | +14.6% | Synego-laminated mid ₾275/m² aligning with PVC bump. |
| `pvc-white` × door | 19 500 | **22 000** | +12.8% | Door reinforcement steel raises Synego section ~₾25/m² over window. |
| `pvc-laminated` × door | 26 500 | **29 500** | +11.3% | Same logic + laminate film. |
| `pvc-white` × balcony | 15 000 | **16 500** | +10.0% | Brillant entry-tier mid ₾165/m². |

All other 8 material rows, all 7 glass rows, all 14 color rows, and all 12 accessory rows kept their existing tetri values — those were already within ±10% of the Georgian competitor mid we re-validated on 2026-05-19, and changing them would have ripple-broken canaries that lock specific totals (₾753.31, ₾832.61, ₾1336.18, ₾1424.68, ₾2333.17, ₾2592.77) without delivering a market accuracy benefit.

### Why this is the right shape

- **Sourced, not vibes-based.** Every tetri value is cited via the inline comment + the research note. Roman can challenge any row by reading one line.
- **Canaries hold.** The 21 pricing canaries across `PriceCalculatorTests`, `PriceCalculatorMultiPaneTests`, `PriceCalculatorGlassTests`, `PriceCalculatorColorTests`, `PriceCalculatorAccessoryTests`, `PriceCalculatorInstallationTests`, plus the HTTP-level mirror canaries in `MaterialsAndPriceEndpointTests`, `ProductTypeDetailEndpointTests`, `GlassEndpointTests`, `ColorEndpointTests`, `AccessoryEndpointTests`, `ReviewEndpointTests` all reference `aluminum-thermal` (window 38000, door 42000) + the canary-pinned surcharges. None of those values changed.
- **PVC realignment doesn't break tests.** No integration test asserts a `pvc-white` or `pvc-laminated` seeded price total. The `MaterialTests.cs` theory at line 146 uses inline data (17000) for a `Material.Create`-then-asserts unit test — that's a domain construction test, decoupled from the seeder. The `PostPrice_DualColorOnPvc_AddsInnerLine_At60Percent` test asserts only the color line (`10800 tetri = 60% × 18000`), not the material total.

## Trade-offs

**Positive:**
- **Audit-grade pricing.** Roman can pull the seeder open in 30 seconds and check the source of any line.
- **Aligned with market reality.** The PVC rows now sit inside the gns.ge / ecostart.ge / fanjrebi.ge corridor instead of below it — the configurator quote won't undershoot on the price ladder against a customer doing comparison shopping.
- **No schema churn, no migration risk, no canary churn.** This is a comment + 5-row tetri update; rollback is `git revert`.

**Negative:**
- **Prices live in code, not in the DB.** A non-code-aware admin can't tune them. This is consistent with the Phase-1 design ([docs/functional-brief.md](../functional-brief.md)) — admin pricing editor lives in Phase 1.5 / Phase 2 (per ADR-0002 amendments which already foreshadow the `PricingRule` table promotion).
- **Seeder is idempotent.** Re-running `dotnet run` against an existing DB will NOT update prices — the seeder skips rows that already exist by (product_type_id, slug). For existing dev DBs, see the migration plan below.
- **Open Roman questions documented in the research doc** (Section "Open questions for Roman"): Synego vs Brillant default stock, S560 vs S560 PHOS for sliding, lock procurement cost basis. None of these block public preview.

## Migration plan

For existing dev databases that already have rows seeded with the old PVC values (17 000 / 24 000 / 19 500 / 26 500 / 15 000), pick one path:

### Path A — fresh re-seed (recommended for dev)

```powershell
Remove-Item e:\BEQSAN.IVA.GE\BACK\data\beqsan.db -Force
dotnet run --project e:\BEQSAN.IVA.GE\BACK\src\BEQSAN.Api
```

The DB recreates from migrations + reseeds with the new tetri values.

### Path B — one-off SQL update (for shared / staging / prod environments)

Run against `BACK/data/beqsan.db` (SQLite via `sqlite3` CLI or any SQLite client):

```sql
-- 2026-05-19 PVC baseline realignment (ADR-0004)
UPDATE materials SET base_price_per_sqm_minor = 19500 WHERE slug = 'pvc-white'      AND product_type_id = (SELECT id FROM product_types WHERE slug = 'window');
UPDATE materials SET base_price_per_sqm_minor = 27500 WHERE slug = 'pvc-laminated'  AND product_type_id = (SELECT id FROM product_types WHERE slug = 'window');
UPDATE materials SET base_price_per_sqm_minor = 22000 WHERE slug = 'pvc-white'      AND product_type_id = (SELECT id FROM product_types WHERE slug = 'door');
UPDATE materials SET base_price_per_sqm_minor = 29500 WHERE slug = 'pvc-laminated'  AND product_type_id = (SELECT id FROM product_types WHERE slug = 'door');
UPDATE materials SET base_price_per_sqm_minor = 16500 WHERE slug = 'pvc-white'      AND product_type_id = (SELECT id FROM product_types WHERE slug = 'balcony');
-- Verify (expected: 19500, 27500, 22000, 29500, 16500)
SELECT pt.slug AS product_type, m.slug AS material, m.base_price_per_sqm_minor
  FROM materials m JOIN product_types pt ON pt.id = m.product_type_id
  WHERE m.slug LIKE 'pvc-%' ORDER BY pt.slug, m.slug;
```

A formal EF migration (`UpdatePvcBaselines2026`) is not added in this slice because it would have to fight the seeder's "skip if exists" semantics on subsequent boots. The intended Phase-1.5 work is to promote pricing to a `PricingRule` table that is fully admin-editable; until then, treat the seeder as the source of truth for fresh DBs and the SQL snippet above as the patch for live ones.

## Implementation status

- Research note `docs/research/2026-pricing-baseline.md` written 2026-05-19.
- 4 seeder files updated with inline `// 2026-05-19 baseline:` comments per spec row.
- 5 PVC tetri values updated (window / door / balcony × pvc-white + window / door × pvc-laminated). All other 26 spec rows unchanged.
- 0 schema changes, 0 migration files, 0 test fixture updates (canaries hold byte-for-byte).
- `dotnet build BEQSAN.sln` passes 0 errors. `dotnet test BEQSAN.sln --no-build --nologo` passes (status captured in the commit body).

## Future considerations

- **Phase 1.5: `PricingRule` table.** Promotes per-row tetri values to admin-editable rows. Seeder shifts to bootstrapping the rule table (idempotent on the rule slug, not on the entity slug). Mentioned in ADR-0002 amendment "2026-05-18 — Color & finish + dual-color (Step 6 slice)".
- **Phase 2: regional install per-km.** Today install is zone-flat (Batumi free / Imereti ₾220 / etc — see ADR-0002 amendment "2026-05-20 — Installation + delivery terms"). Per-km dynamic install pricing depends on real demand signal post-launch.
- **Multi-currency.** `Material.Currency` already exists as a field; today every row is GEL. USD/EUR rows would propagate through the calculator unchanged.
- **Roman-locked questions.** Five open items captured in the research doc's "Open questions for Roman" section. None block public preview — defaults are defensible at the market mid.
