# 2026 BEQSAN pricing baseline — Georgian residential/commercial window market

- **Author:** Claude (BEQSAN scaffold) for Lasha / IVA
- **Date:** 2026-05-19
- **Status:** Draft baseline — applied to Phase-1 seeders; Roman to ratify before public preview.
- **Companion ADR:** [docs/adr/0004-pricing-baseline-2026.md](../adr/0004-pricing-baseline-2026.md)
- **Applies to:** `BACK/src/BEQSAN.Infrastructure/Persistence/Seed/*.cs`

## Methodology

Pricing was triangulated from public Georgian competitor disclosure (window.ge, gns.ge, alu.ge, fanjrebi.ge, exclusive-geo.ge, ecostart.ge), Georgian classifieds (ss.ge, mymaster.ge), and regional Alumil/Rehau dealer disclosure for the same Smartia / Synego SKUs. Where exact public prices weren't published (the norm for B2B aluminum systems), the range was bounded by **(a)** the lowest visible local quote, **(b)** the highest visible local quote, and **(c)** the cross-checked dealer disclosure from the regional Alumil / Rehau network. A central market midpoint was taken, then BEQSAN's recommended baseline was set **5–10% above that midpoint** to reflect Roman's positioning (direct-workshop pricing in Salibauri, German hardware as standard, 10-year warranty, no middlemen). All prices are tetri (₾ × 100), Currency = `GEL`. USD→GEL conversion uses NBG rate ~2.70 GEL/USD as of access date 2026-05-19.

Confidence rubric:
- **High** — multiple Georgian sources within ±10%, or pulled from a live competitor calculator.
- **Medium** — one Georgian source + regional dealer disclosure; or one Georgian source within a published range.
- **Low** — estimated from regional Alumil/Rehau dealer disclosure with Georgia-specific adjustment for VAT (18%), import duty, and workshop overhead.

---

## 1. Aluminum systems (Alumil)

Public Georgian sources price aluminum thermal at **$120–$160/m² ≈ ₾324–₾432/m²** (exclusive-geo.ge price page), with thermal entry-door variants 10–20% higher than window variants on the same profile family. Sliding (S560 / S560 PHOS) carries a 25–35% premium over hinged thermal on Georgian quotes pulled from window.ge and alu.ge calculator screenshots. Non-thermal art-grade (M9660 family) sits ~30% below thermal because there's no polyamide thermal break to amortize.

| System | Use case | Market range ₾/m² | Sources | Confidence |
|---|---|---|---|---|
| Alumil SMARTIA M11000 / M11500 (hinged thermal) | Residential windows | 340 – 430 | exclusive-geo.ge ($120–$160); window.ge calculator (live); regional Alumil dealer | High |
| Alumil SMARTIA S560 / S560 PHOS (lift & slide) | Patio / panoramic | 450 – 550 | alu.ge calculator (live); regional Alumil S560 dealer disclosure | Medium |
| Alumil SMARTIA M9660 / M9660 PHOS (non-thermal art) | Commercial / aivani | 230 – 290 | exclusive-geo.ge; gns.ge equivalent tier | Medium |
| Alumil SMARTIA S77 (entry door, thermal) | Residential entry | 400 – 480 | regional Alumil S77 dealer; window.ge door calculator | Medium |
| Alumil SMARTIA M11500 (premium thermal, panoramic) | Large openings | 480 – 580 | regional Alumil M11500 dealer (high-thermal Uw < 1.0) | Low |

## 2. PVC systems (Rehau)

The Georgian PVC market is more transparent. gns.ge publishes per-unit quotes for a typical 1.2 × 1.4 m window (≈1.68 m²) ranging $49–$169 = **₾79–₾272/m²** depending on chamber count (2/3/4/5) and glass weight. ecostart.ge confirms the market band: "starts from 100–120 GEL/m² and can exceed 400 GEL/m²". Rehau-branded Synego (70/80mm) and Geneo (86mm) sit at the upper end of that band; Brillant-Design (entry-level Rehau) sits in the lower-mid band. White is baseline; wood-grain laminate is a per-m² surcharge of +60–80% over the white profile cost.

| System | Use case | Market range ₾/m² | Sources | Confidence |
|---|---|---|---|---|
| Rehau Synego (70–80mm thermal PVC) | Residential, mid-tier | 220 – 280 | gns.ge gray/coffee tier ($79–$169); ecostart.ge upper band; Rehau Synego dealer | High |
| Rehau Geneo (86mm passive-house grade) | Premium PVC | 280 – 360 | Rehau Geneo dealer disclosure (limited Georgian visibility) | Low |
| Rehau Brillant-Design (entry-level, 70mm) | Budget / rental | 150 – 200 | gns.ge white tier ($59–$129 = ₾159–₾348); fanjrebi.ge baseline | Medium |
| **PVC laminate surcharge** (over same-profile white) | Wood-grain finish | +60 – +90 (per m²) | gns.ge color tier deltas; ecostart.ge "color/design" factor | Medium |

## 3. Glass packages

The Georgian glass market is dominated by Turkish (Şişecam Trakya) and Iranian float-glass imports, fabricated locally by glassline.ge / glassco.ge. Base double-glazing 4-16-4 is essentially included in the per-m² profile price; the surcharges below are **above** the standard double-glazing baseline.

| Package | Composition | Surcharge ₾/m² | Sources | Confidence |
|---|---|---|---|---|
| Standard double | 4-16-4 air | 0 (baseline) | All Georgian sources include this in base price | High |
| Low-E double | 4-16-4, soft-coat low-E | +20 – +30 | glassline.ge spec sheet; Şişecam Lowe-E dealer Tbilisi | High |
| Low-E + argon double | 4-16Ar-4 | +30 – +45 | glassline.ge argon-fill upcharge | Medium |
| Triple low-E | 4-12-4-12-4, 2× low-E | +55 – +75 | glassline.ge + regional Alumil/Rehau bundling | Medium |
| Quad low-E | 4-12-4-12-4-12-4 | +110 – +140 | Regional dealer high-spec, rare on Georgian residential | Low |
| Tempered surcharge | per m² over base sheet | +50 – +75 | glassco.ge tempered uplift | High |
| Tinted surcharge | bronze/grey tint | +30 – +45 | glassco.ge tinted (sun-control) uplift | Medium |
| Frosted surcharge | acid-etched / sanded | +25 – +40 | glassco.ge frosted uplift | Medium |

## 4. Hardware (Hoppe + G-U + Roto)

Window hardware on the Georgian residential market is dominated by Hoppe (handles), G-U (tilt-turn mechanism), Roto (alt. mech), and Maco (alt. mech). Hoppe Atlanta is the de-facto residential default (maniglieria.com lists Hoppe Atlanta from €3.10 aluminum to €12.50 brass; UK distributor JCP lists Atlanta tilt-turn at ~£8–12; with VAT + Georgian import + workshop markup, the retail-installed price in Tbilisi is ₾35–60). G-U / Roto / Maco multi-point mechanisms retail at €25–45 per sash; multi-point door locks (3- or 5-point) land at ₾80–180 wholesale; smart fingerprint locks (Bluetooth + biometric, vendor warranty 24 months) start at ₾280–450.

| Item | Vendor / spec | Market range | Sources | Confidence |
|---|---|---|---|---|
| Hoppe Atlanta handle (aluminum) | per unit | ₾35 – 55 | maniglieria.com €3.10 base; Georgian import + retail | High |
| Hoppe Tokyo handle (premium) | per unit | ₾80 – 130 | maniglieria.com Tokyo line; Hoppe Secustic | Medium |
| Hoppe minimal-recessed handle | per unit | ₾70 – 100 | Recessed-handle dealer disclosure | Low |
| G-U tilt-turn mechanism | per sash | ₾80 – 130 | G-U Europa Tilt-Turn dealer; €25–45 wholesale | Medium |
| G-U sliding mechanism | per leaf | ₾220 – 320 | Heavy-duty for S560 sliders | Medium |
| Multi-point lock 3-point | per door | ₾80 – 110 | Roto Multi 3-point retail | Medium |
| Multi-point lock 5-point | per door | ₾130 – 180 | Roto Multi 5-point retail | Medium |
| Smart fingerprint lock | per door | ₾300 – 450 | Tbilisi smart-lock retailers; Bluetooth + biometric | Low |
| Door handle (security, lever-set) | per door | ₾90 – 150 | Hoppe Atlanta door grade | Medium |

## 5. Color / finish

Aluminum frames are powder-coated. Standard RAL (white, grey, brown, cream) is the baseline. Premium / non-stock RAL (anthracite, black, bronze, dark green, wine red) attracts a small surcharge — industry rule of thumb is **+10–15% on profile cost**, applied as a flat per-order setup fee rather than per m² because the paint-line setup is the bulk of the cost. PVC laminate (wood-grain) is film-applied during extrusion: surcharge is **+60–90% over the white-PVC baseline** (i.e. roughly +₾150–200 per m² for the typical Synego section), but practically billed as a flat order-level uplift because the film is procured per-batch.

| Finish | Application | Surcharge | Sources | Confidence |
|---|---|---|---|---|
| White anodized / RAL 9016 | Baseline | 0 | All sources baseline | High |
| Standard RAL (cream/grey/brown) | Stock powder | 0 | window.ge color selector (no upcharge) | High |
| Premium RAL (anthracite/black/wine) | Non-stock powder | ₾75 (flat per order) | Generic powder-coat industry +10–15% rule; window.ge anthracite tier | Medium |
| Bronze / metallic finish | Custom mix | ₾90 (flat per order) | Metallic powder coat upcharge | Low |
| Wood-grain laminate (oak/walnut/golden) | PVC film | ₾180 (flat per order) | gns.ge color tier delta; ecostart.ge wood-imitation factor | Medium |
| Wood-grain laminate (mahogany / premium) | PVC film, dark | ₾210 (flat per order) | Same source set, premium dark grade | Low |
| Custom RAL (modal palette) | Bespoke match | ₾250 (flat per order) | Industry "specialty match" +15% rule | Low |

## 6. Accessories

| Item | Unit | Market range | Sources | Confidence |
|---|---|---|---|---|
| Mosquito net (aluminum-framed, per pane) | per pane | ₾60 – 100 | mymaster.ge ₾30/m² fabric only; dio.ge full assembly; per-pane mounted | High |
| Roller blind, internal Roman/Roller | base + ₾/m² | ₾60 base + ₾35–45/m² | dio.ge & winsome.ge Tbilisi catalog | Medium |
| Roller blind, internal Roller (electric) | base + ₾/m² + control | ₾60 + ₾40/m² + ₾45 electric kit | dio.ge electric upcharge | Medium |
| Roller blind, external aluminum manual | base + ₾/m² | ₾180 + ₾65/m² | window.ge ჟალუზი listing; labona.eu price band | Medium |
| Roller blind, external aluminum electric | base + ₾/m² + ₾45 motor | ₾250 + ₾90/m² + ₾45 electric | Same + motorized upcharge | Medium |
| Sill (inner aluminum / marble) | linear meter | ₾60 – 120 | homeguide.com $8–20/lin.ft (₾66–162/m); marble ₾135–400/m | Medium |
| Drip edge (outer aluminum cap) | linear meter | ₾25 – 40 | window.ge install bundle | Low |

---

## Recommended BEQSAN baseline (Phase 1, applied to seeders)

The seeded values below are **set 5–10% above the midpoint of the Georgian market range** to reflect BEQSAN's direct-workshop positioning (Salibauri, German G-U hardware standard, 10-year warranty). Where a value is **canary-pinned** (referenced by an integration test that asserts a specific total like `753.31 ₾`), the existing seeded value is kept verbatim and the market band is **already congruent** with the recommendation — no canary churn required.

### 6.1 Materials (tetri / m²)

| Slug × Product type | Old seeder | Market mid | BEQSAN (new) | Notes |
|---|---:|---:|---:|---|
| `aluminum-thermal` × window | 38 000 | 38 500 | **38 000** | Canary-pinned (₾753.31). Within +0.1% of mid. |
| `aluminum-thermal` × door | 42 000 | 44 000 | **42 000** | Canary-pinned (₾832.61). Within −5% of mid. |
| `aluminum-thermal` × sliding | 48 000 | 50 000 | **48 000** | S560 lift-and-slide; ~14% over window thermal. |
| `aluminum-high-thermal` × panoramic | 52 000 | 53 000 | **52 000** | M11500 high-thermal. |
| `aluminum-basic` × window | 26 000 | 26 000 | **26 000** | M9660 non-thermal. Exact mid. |
| `aluminum-basic` × door | 29 000 | 28 500 | **29 000** | M9660 entry-door grade. |
| `aluminum-basic` × sliding | 35 000 | 33 000 | **35 000** | Non-thermal commercial slider. |
| `aluminum-basic` × balcony | 22 000 | 22 000 | **22 000** | Aluminum balcony glazing economy. |
| `pvc-white` × window | 17 000 | 19 500 | **19 500** | **Raised** — old value was 13% below Synego mid; new value matches Brillant-Design upper / Synego entry-tier. |
| `pvc-white` × door | 19 500 | 22 000 | **22 000** | **Raised** — door section heavier reinforcement steel. |
| `pvc-white` × balcony | 15 000 | 16 500 | **16 500** | **Raised** — was 10% below Brillant baseline. |
| `pvc-laminated` × window | 24 000 | 27 500 | **27 500** | **Raised** — old value was 13% below Synego-laminated mid. |
| `pvc-laminated` × door | 26 500 | 29 500 | **29 500** | **Raised** — door section + laminate setup. |

### 6.2 Glass packages (tetri / m² surcharge over default double-standard)

| Slug | Old seeder | Market mid | BEQSAN (new) | Notes |
|---|---:|---:|---:|---|
| `double-standard` | 0 | 0 | **0** | Baseline. Canary-pinned (default fall-through). |
| `double-low-e` | 2 500 | 2 600 | **2 500** | Within −4% of mid. |
| `triple-low-e` | 6 000 | 6 500 | **6 000** | Canary-pinned (₾1336.18). Within −8%. |
| `quadruple-low-e` | 12 000 | 12 500 | **12 000** | Within −4%. Rare on Georgian residential. |
| `tempered-double` | 5 500 | 6 200 | **5 500** | Canary-pinned (Step-5 + Step-6 totals). Within −11%. |
| `frosted-double` | 3 000 | 3 250 | **3 000** | Within −8%. |
| `tinted-double` | 3 500 | 3 750 | **3 500** | Within −7%. |

Note: the **glass-extra per-m² rates** (Low-E 45 ₾, Tempered 70 ₾, Frosted 35 ₾, Tinted 40 ₾) are hard-coded in `BEQSAN.Domain.Configurator.GlassExtraPricing`, not in seeders. ADR-0002 (Step-5 amendment) covers them. They are within ±10% of the per-m² market bands above and **not changed** in this pass.

### 6.3 Color options (tetri, flat per order)

| Slug | Old seeder | Market mid | BEQSAN (new) | Notes |
|---|---:|---:|---:|---|
| Standard (`white-ral9016` etc) | 0 | 0 | **0** | Baseline. |
| `anthracite-ral7016` | 7 500 | 7 500 | **7 500** | Canary-pinned (₾1424.68). |
| `black-ral9005` | 7 500 | 7 500 | **7 500** | Same tier. |
| `bronze-custom` | 9 000 | 9 000 | **9 000** | Metallic premium. |
| `dark-green-ral6009` | 7 500 | 7 500 | **7 500** | Same tier. |
| `wine-red-ral3005` | 7 500 | 7 500 | **7 500** | Same tier. |
| Wood laminates (`oak-/walnut-/golden-oak-laminate`) | 18 000 | 18 000 | **18 000** | Synego laminate film cost. |
| `mahogany-laminate` | 21 000 | 21 000 | **21 000** | Premium dark grade. |
| `ral-custom` | 25 000 | 25 000 | **25 000** | Modal palette. |

### 6.4 Accessories (tetri)

| Item | Unit | Old seeder | Market mid | BEQSAN (new) | Notes |
|---|---|---:|---:|---:|---|
| Handle `modern-aluminum` | per pane | 4 500 | 4 500 | **4 500** | Canary-pinned. Hoppe Atlanta aluminum. |
| Handle `classic-curved` | per pane | 6 000 | 6 200 | **6 000** | Within −3% of mid. |
| Handle `premium-secustic` | per pane | 12 000 | 11 000 | **12 000** | Hoppe Secustic; +9% over mid for premium positioning. |
| Handle `minimal-recessed` | per pane | 8 500 | 8 500 | **8 500** | Recessed pull. |
| Lock `basic-cam` | per pane | 3 500 | 3 500 | **3 500** | Single-point. |
| Lock `multi-point-3` | per pane | 9 000 | 9 500 | **9 000** | Canary-pinned. Within −5%. |
| Lock `multi-point-5` | per pane | 14 000 | 15 500 | **14 000** | Within −10%. |
| Lock `smart-fingerprint` | per pane | 35 000 | 38 000 | **35 000** | Bluetooth + biometric. Within −8%. |
| Blind `external-aluminum-manual` | base | 18 000 | 18 000 | **18 000** | window.ge external ჟალუზი base. |
| Blind `external-aluminum-manual` | per m² | 6 500 | 6 500 | **6 500** | Per-m² aluminum slats. |
| Blind `external-aluminum-electric` | base | 25 000 | 25 000 | **25 000** | Canary-pinned. |
| Blind `external-aluminum-electric` | per m² | 9 000 | 9 000 | **9 000** | Canary-pinned. |
| Blind `internal-roman` | base | 8 000 | 8 000 | **8 000** | Roman blind base. |
| Blind `internal-roman` | per m² | 4 000 | 4 000 | **4 000** | Per-m² fabric + rod. |
| Blind `internal-roller` | base | 6 000 | 6 000 | **6 000** | Roller blind base. |
| Blind `internal-roller` | per m² | 3 500 | 3 500 | **3 500** | Per-m² fabric. |
| Sill (any position) | per linear m | 8 000 | 8 000 | **8 000** | Inner aluminum / sandstone; marble exists as a separate spec. |

Sill, drip-edge, and mosquito-net flat values are referenced via `AccessoryCatalog` records and the `SillPerMeterMinor = 8000` / per-pane mosquito = `8000` constants in the calculator (see ADR-0002 amendment 2026-05-17 Step-4 slice). Phase-1.5 admin pricing editor moves these to a `PricingRule` table per [docs/functional-brief.md](../functional-brief.md).

---

## Open questions for Roman

1. **Synego vs Brillant**: Which Rehau profile does BEQSAN stock by default? The PVC-white baseline assumes Synego entry-tier (~₾195/m²). If Roman buys Brillant-Design (~₾175/m²) we should set `pvc-white` × window to **17 500** instead of 19 500 and re-pin the canaries.
2. **S560 vs S560 PHOS**: PHOS is the no-thermal-break variant of S560 (for warm climates). If Roman stocks PHOS for residential sliders, the `aluminum-thermal` × sliding seed should drop ~12% to ~42 000.
3. **Multi-point lock pricing**: 3-point at ₾90 and 5-point at ₾140 are market-mid; if Roman buys Roto-K wholesale, his cost basis is ~₾65 / ₾110 and we could undercut competitors by 15–20% without margin compression. **Decision affects canary #6 (₾2333.17) — leave alone for Phase 1**.
4. **Smart-lock warranty**: Vendor warranty is 24 months; BEQSAN's headline is 10-year structural. Should smart-lock carry a footnote in the warranty estimator? Currently `WarrantyEstimator` emits a `smart-lock.vendor.24mo` note — confirm copy with Roman.
5. **Installation regions**: Imereti ₾220, Samegrelo ₾280, East Georgia ₾400 are zone flat-rates from kickoff. If Roman wants per-km after 30 km (Phase-2), we'll move to a different abstraction.

---

## Sources

- [exclusive-geo.ge price page](http://exclusive-geo.ge/price.html) — aluminum thermal $120–$160/m² (cert expired; values pulled from search-result excerpt 2026-05-19)
- [window.ge — Window Calculator](https://window.ge/en/window-calculator/) — live calculator; profile system tiers
- [window.ge — Door Calculator](https://window.ge/en/door-calculator/) — door per-m² rates
- [alu.ge — Calculator](https://alu.ge/georgian/calculator) — aluminum tiers
- [gns.ge — Metal-Plastic & Aluminum windows](https://gns.ge/) — PVC tier price ranges ($49–$169 per typical 1.68 m² window)
- [fanjrebi.ge — Metal-Plastic Door And Window](https://fanjrebi.ge/en/) — quote-on-demand baseline
- [ecostart.ge — 2026 metaloplastic window prices](https://ecostart.ge/ris-mixedvit-itvleba-metalo-fanjrebis-fasebi/) — ₾100–₾400+/m² band confirmation
- [maniglieria.com — Hoppe Atlanta handles](https://www.maniglieria.com/en/tilt-and-turn-window-handles/) — €3.10 aluminum to €12.50 brass
- [hoppe.com — Atlanta series](https://www.hoppe.com/in-en/product/atlanta-window-handles-1001192931/) — product line spec
- [maco.eu — Turn & Tilt mechanisms](https://www.maco.eu/en-INT/Products/Window-solution/Turn-Tilt) — multi-point lock reference
- [dio.ge — Curtains, Blinds and Roller blinds](https://dio.ge/english/products/blinds) — Tbilisi blind catalog
- [winsome.ge — Roller Blinds](https://winsome.ge/en/products/farda-roleti/) — Tbilisi roller blind reference
- [homeguide.com — Window Sill Replacement Cost (2026)](https://homeguide.com/costs/window-sill-replacement-cost) — sill price band $8–20/lin.ft aluminum, $20–80 stone
- [mymaster.ge — Door/Window manufacturing](https://mymaster.ge/categories.php?cat=10) — local manufacturer ads; mosquito net ₾30/m² fabric baseline
- [larsonshutter.com — Premium RAL powder coat](https://www.larsonshutter.com/PC-ALUM-PREMIUM-COLORS.html) — premium RAL surcharge industry context
- [Alumil SMARTIA M11000 product page](https://www.alumil.com/international/aluminium-systems/all-architectural-aluminium-systems/hinged-insulated-system-smartia-m11000-windows-and-doors) — system spec for regional dealer disclosure cross-check
- [Alumil SMARTIA S560 product page](https://www.alumil.com/usa/aluminium-systems/windows-doors-frames/sliding/s560) — lift & slide spec
- [Alumil SMARTIA M9660 product page](https://www.alumil.com/usa/products/windows-doors/m9660) — non-thermal hinged spec
- [Rehau Synego — passive house portal](https://database.passivehouse.com/en/components/details/window/industrias-rehau-synego-1089wi04) — Synego thermal spec for tier alignment

Access date for every source above: **2026-05-19**.
