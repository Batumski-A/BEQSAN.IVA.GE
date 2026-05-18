# Visual Audit — Phase-1 Polish

**Date**: 2026-05-18
**Auditor**: Claude (Opus 4.7, 1M)
**Method**: `audit-capture.mjs` — Playwright Chromium 1.60, full-page screenshots, `reducedMotion: 'reduce'` + scroll-through to fire IntersectionObserver animations. 32 screenshots total (16 screens × desktop 1440×900 + mobile 390×844). Source: `audit/screenshots/{desktop,mobile}/*.png`.
**Baseline**: deployed staging at `https://iva.ge:4433` (commit b8ee3d3).

Legend: ✅ OK · 🟡 nit (visual polish, non-blocking) · 🔴 fix-required (blocking for Phase 1)

---

## Marketing / standalone pages

### 01 · `/` (Home)

| Severity | Finding |
|---|---|
| ✅ | Hero — display-1 + amber eyebrow + W/H/U DrawingMarkers reads as designed. |
| ✅ | Specs strip with hairline borders + mono labels — §9 grade. |
| ✅ | Values 3-col section — numbered amber eyebrows, h3 + body, consistent rhythm. |
| ✅ | CTA block — amber button at right, plenty of room. |
| 🔴 | **Language switcher hidden in footer only.** Lasha reported user couldn't find it. Per spec: move to top header as visible 3-chip control. |
| 🟡 | Top header amber "აწყვე შენი ფანჯარა" button is the only CTA — visually fine but on mobile it takes the header right-side slot, no language room. |
| 🟡 | Footer credit line `lasha sharashidze` lowercase — intentional but feels almost generic. Could be Display-cased "Lasha Sharashidze". Defer. |

### 02 · `/about`

| Severity | Finding |
|---|---|
| ✅ | Asymmetric magazine grid — hero / intro / pull-quote / facts / suppliers / founder / values / CTA all distinct sections. |
| ✅ | Pull-quote section reads well — large amber `"` mark + display-headline + cite attribution. |
| ✅ | Facts row (1998 / ~620 / 1100 m² / 12) renders as display-2 numbers — strong magazine vibe. |
| 🟡 | `WorkshopHeroIllustration` in the hero column appears small relative to the hero column width — the SVG renders correctly but feels under-weighted. Consider a 1.4× viewBox scale or anchor it tighter to the right edge. |
| 🟡 | `AssemblyIllustration` in the founder section reads as an empty rounded rectangle at this scale; the hairline figure is there but barely registers because the icon area is small relative to the page. Increase contrast (use `text-fg-secondary` instead of `text-fg-tertiary`) or upsize. |

### 03 · `/process`

| Severity | Finding |
|---|---|
| ✅ | 7 stages render in alternating-side narrative as designed. |
| ✅ | Number badge + amber display-2 numbers + mono spec callouts all on rhythm. |
| ✅ | Stage cards' illustrations render in their boxes (line-art workshop scenes). |
| 🔴 | **`whileInView` entrance animations stay at `opacity: 0` when capturing fullPage** — IntersectionObserver doesn't fire in Chromium's beyond-viewport capture mode. Mitigated for audit by manual scroll, but a real user with extremely fast scroll or with JS slow on a mid-tier mobile could see momentary blank stages. Either raise initial opacity from `0` to `0.4` or switch to plain `animate` (no IO). Same root cause affects `/materials`, `/warranty`. |
| 🟡 | Illustrations look small/abstract at viewport scale — the line-art reads as boxes-with-lines from 1m away. Acceptable for "technical drawing" intent but could be ~1.3× scaled within their tiles. |

### 04 · `/materials`

| Severity | Finding |
|---|---|
| ✅ | Three material sections each get their cross-section diagram (thermal-break / IGU / 5-chamber) — diagrams are recognizable. |
| ✅ | RAL palette grid with 6 colour tiles — clean. |
| ✅ | 8-term glossary in 2-col `<dl>` — semantic HTML correct. |
| 🟡 | Material section H2 ("ალუმინი") uses display-2 size — visually competes with the page H1 hero headline. Consider downscaling section H2 to `text-h1` so hero stays dominant. |
| 🟡 | Section background alternation (bg-base vs bg-elevated) is subtle — works in real browser but could use stronger separation (e.g. bg-elevated → bg-raised). |
| 🟡 | Glass section title "მინა-პაკეტი" reads as one word due to hyphen-no-break — could be "მინა-პაკეტი" with line-break opportunity for narrow viewports. Defer. |

### 05 · `/warranty`

| Severity | Finding |
|---|---|
| ✅ | Coverage `<table>` semantic + readable; amber duration values stand out from element/note columns. |
| ✅ | 3-step problem flow with numbered amber badges — consistent with /process style. |
| ✅ | Climate section + care guide in 2-col cards — well paced. |
| 🟡 | Same `whileInView` issue as /process — sections initially invisible until scrolled. Same root fix. |

### 06 · `/contact`

| Severity | Finding |
|---|---|
| ✅ | 2-col layout — info column left, map column right. |
| ✅ | Stylised SVG map reads cleanly — coastline path, street grid, amber workshop marker + label, Batumi centre marker. |
| ✅ | Phone + WhatsApp + email + hours all present with proper `tel:` / `mailto:` / `wa.me/` links. |
| ✅ | Closer section "შემოგვინახე" with paired CTAs (configurator + phone). |
| 🟡 | Placeholder phone `+995 5XX XX XX XX` and email `hello@beqsan.ge` are obvious — flagged in `docs/questions.md §8b`, not a code issue. |

### 07 · `/catalog`

| Severity | Finding |
|---|---|
| ✅ | 5 product cards (window / door / sliding / panoramic / balcony) in 3-col grid. |
| ✅ | Each card has deterministic muted tint + slug eyebrow + spec rows. |
| 🟡 | Cards show "From 280 ₾/m²" placeholder — same starting price across all types. Once Roman supplies real pricing, this should vary per family. Backend data concern, not visual. |

### 08 · `/gallery`

| Severity | Finding |
|---|---|
| ✅ | Stub renders cleanly — eyebrow + h1 + body. Expected for Phase-1 scaffold. |
| 🟡 | Empty hero section creates ~80vh blank area before footer — visually thin. Could lift footer up or add placeholder grid for upcoming projects. Defer to gallery work. |

---

## Configurator steps

### cfg-01 · Step 1 — Product type

| Severity | Finding |
|---|---|
| ✅ | 5 product cards in 2-col responsive grid, with hover lift, amber selected state. |
| ✅ | StepIndicator vertical ticker on left (desktop). |
| 🟡 | When no product is picked yet, 3D scene shows nothing meaningful — the Scene mounts with default `widthCm/heightCm` from the store. Could hide the Scene column until Step 3 or replace with an editorial illustration. |

### cfg-02 · Step 2 — Material

| Severity | Finding |
|---|---|
| ✅ | Two material cards (Aluminium / PVC variants) with thermal-break info. |
| 🟡 | Same Scene-empty-frame issue as Step 1. |

### cfg-03 · Step 3 — Dimensions

| Severity | Finding |
|---|---|
| ✅ | Width + height inputs with units, slider-style. |
| 🔴 | **3D scene is very dark — frame edges barely visible.** Per Lasha §3: ambient too low, key light at 1.2 intensity but the warm amber color (`#FFE4B0`) plus dark navy bg yields almost no contrast on aluminium colour materials. Rework lighting. |
| 🔴 | **Camera is hardcoded `[2.4, 1.6, 3.2]` — small/large dimensions cause window to fill ≠ 60-70% of viewport.** Add bounding-box-based auto-fit. |

### cfg-04 · Step 4 — Layout

| Severity | Finding |
|---|---|
| ✅ | Pane count selector (1-4), schematic preview, per-pane opening-type buttons, mosquito-net checkbox, navigation. |
| ✅ | Schematic preview (the 2D box with P1/P2 labels) renders correctly. |
| 🔴 | **Opening-type buttons are flat text labels** — no animation preview on hover, no visual mapping to what each type actually does. Per Lasha §2: hover should preview that pane's animation in the 3D. |
| 🔴 | **Hinge direction has no visible primitive** — currently only the `amber tick mark hint` (the colored glass tint). Add cylindrical hinges per openable pane. |

### cfg-05 · Step 5 — Glass

| Severity | Finding |
|---|---|
| ✅ | Glass-type selector cards (single / double / triple / quad pane) with pane-count visual + extras checkboxes. |
| 🟡 | Same lighting issue — Scene barely shows glass tint differences. Tied to lighting fix. |

### cfg-06 · Step 6 — Colour

| Severity | Finding |
|---|---|
| ✅ | Outer/inner colour split with swatch grid + dual-color toggle for PVC + RAL custom hex/code input. |
| ✅ | Selected swatch has amber border state. |

### cfg-07 · Step 7 — Accessories

| Severity | Finding |
|---|---|
| ✅ | Handle, lock, sill, blind selectors with conditional fields. |
| 🟡 | Form-heavy step; could benefit from grouping eyebrows but acceptable. |

### cfg-08 · Step 8 — Review

| Severity | Finding |
|---|---|
| ✅ | Configuration summary (per-step), installation option grid (Batumi / Kobuleti / etc.), price breakdown, send-order CTA. |
| 🟡 | Send-order CTA labelled "მე-9 ნაბიჯი ემზადება" (placeholder) — expected for Phase 1. |

---

## Cross-cutting findings

### 🔴 Language switcher placement
Lasha confirmed the footer-only switcher is too discoverable. Move to top header as visible 3-chip control (ქარ · EN · РУ). Active state: subtle amber underline; idle: fg-tertiary. Mobile: top of hamburger drawer.

### 🔴 3D scene visibility (all configurator steps)
Compound issues:
- Hardcoded camera position (`[2.4, 1.6, 3.2]`) — wide windows clip, narrow windows isolated in negative space.
- Lighting too dim — amber key on dark navy bg yields <1.5:1 contrast on the frame.
- No hinge primitives — opening direction unreadable.
- No always-on opening animation — user has to click "open" toggle and even then it's not obvious which pane swings.
- No HTML overlay labels — no semantic affordance for "which pane opens which way."
- Wall stub exists but its colour (#E8E5E0 warm beige) is fighting the dark navy bg through Scene's z-depth.

### 🔴 `whileInView` initial opacity 0
Pages /process, /materials, /warranty all use `motion.li/section` with `initial: { opacity: 0, y: 16 }` + `whileInView`. If IntersectionObserver doesn't fire (Playwright capture, slow JS, screen reader), content stays invisible. Fix: raise initial opacity to ~0.5 so degraded state is still readable; or convert key sections to plain `animate` (no IO gating).

### 🟡 Empty Scene on Steps 1-2
Scene mounts on every step but has no product/material yet, so it renders default-dimension empty box against dark navy. Either hide the column until material is picked, or show an editorial placeholder ("გადახედე → აირჩიე მასალა").

### 🟡 Workshop SVG illustrations look small/abstract
At their current 1× scale within section columns, the line-art reads as "rectangles with squiggles" rather than recognisable scenes. Either upsize within container or reframe at higher zoom. Defer — real photos replace these in Phase 1.5 (`docs/questions.md §8b`).

### 🟡 manifest.webmanifest icons
PWA precache includes 29 entries — but no `icons` array surfaced in any of the screenshots. Browser may use favicon as fallback. Verify and add real icons.

### ✅ Things that ARE working well
- Studio nav dropdown label localised correctly (`სახელოსნო`) — not English.
- Footer 12-col grid renders identically on every page.
- Step indicator vertical ticker works on all configurator steps with current step highlighted.
- Mobile hamburger drawer functional.
- All page H1s use display sizes, body uses headline + sans correctly.
- Hairline borders 1px @ ~8% opacity hold up against the dark bg.
- Schema.org JSON-LD present on /about, /process, /materials, /warranty, /contact.

---

## Fix priority

1. **Language switcher to top header** (🔴, fast, ~1 commit).
2. **Initial opacity fix for `whileInView`** sections (🔴, fast, ~1 commit).
3. **3D camera auto-fit + lighting recheck + wall context** (🔴, ~1-2 commits).
4. **3D hinge primitives + always-on breathing animation + HTML overlay labels** (🔴, ~2 commits).
5. **Step 4 opening-type buttons trigger preview animation on hover** (🔴, ~1 commit).
6. **Workshop illustrations upsize/reweight** (🟡, ~1 commit if doing).
7. **Hide Scene on Steps 1-2 OR replace with editorial placeholder** (🟡, ~1 commit).
