# Visual Polish & UX Fix Slice — Final Report

**Date**: 2026-05-18
**Author**: Claude (Opus 4.7, 1M)
**Scope**: pure FRONT slice — no BACK changes. Audit-first, atomic-commits after.

---

## Commits

| # | Hash | Title |
|---|---|---|
| 1 | `5dd9e9f` | docs(audit): visual audit pass — 16 screens × 2 viewports + findings |
| 2 | `fbdda70` | fix(web): move language switcher into top header (audit 🔴) |
| 3 | `b9b53e4` | fix(web): raise whileInView opacity floor on long pages (audit 🔴) |
| 4 | `d6c7a06` | feat(3d): camera auto-fit + lighting recheck + hinges + breathing + labels (audit 🔴) |

Bundle: every FRONT page chunk stayed within ±0.5 KB gzip of pre-slice baseline. Scene chunk (the only 3D-bearing chunk) grew by ~2 KB gzip — CameraRig + Hinges + PaneOverlayLabels + the rewritten AnimatedPane — well within the §9 budget. No new dependencies.

---

## What changed, per audit finding

### 🔴 Language switcher hidden in footer only
**Fix**: extracted `<LanguageSwitcher variant="header|drawer" />`, rendered next to the BEQSAN logo on every page (3 chips ქარ · EN · РУ) and pinned to top of mobile hamburger drawer. Active locale gets a 1px amber underline + amber text (no chip background — reads as editorial inline, not a CTA). Footer language block removed.

### 🔴 `whileInView` sections rendering at opacity 0 on long pages
**Fix**: lifted initial state from `{ opacity: 0, y: 16 }` to `{ opacity: 0.55, y: 8 }` on `/process`, `/materials`, `/warranty`. Degraded behaviour (IO never fires) is now legible at 55% opacity; the 0.55→1 settle still reads as a soft entrance on intersection. Caught by the audit when `/process` fullPage screenshot rendered hero + CTA only with a 3000px void between them.

### 🔴 3D scene visibility — compound issue
**Camera**: replaced hardcoded `[2.4, 1.6, 3.2]` with `<CameraRig>` that computes distance from frame bounding box (fov 35°, target 65% fill). Small windows no longer drift in empty space; wide windows no longer clip. Smoothly lerps when Step-3 dimensions change.

**Lighting**: §9.7 three-point setup re-tuned:
| Param | Before | After |
|---|---|---|
| ambient | 0.15 | 0.35 |
| amber key | 1.2 / #FFE4B0 | 1.7 / #FFEFC8 |
| cool fill | 0.35 | 0.55 |
| back light | 0.5 | 0.40 |
| hemisphere | — | added (0.5, warm sky / cool ground) |
| front fill | — | added (0.45 from camera direction) |

Aluminium (metalness 1.0) frames were rendering near-black against the dark navy bg with only specular highlights. With the new floor + hemisphere they now read as discrete metal edges in any orbit angle.

**Wall context**: re-sized to `8× max(w,h)` (min 6m) so it always fills the camera frustum. Slightly cooler plaster (#C9C3B8) sits behind the frame as wall, not décor — visible across **all** Steps 1-7 (Lasha noted it was missing on early steps; turned out it was rendering but the prior dim ambient made it invisible).

**Hinges**: new `<Hinges>` primitive — 1.5cm × 8cm brushed-aluminium cylinders on the hinge edge of each openable pane:
- Casement → 2 (top + bottom of stile)
- TiltAndTurn → 3 (adds middle)
- Tilt → 2 along bottom edge
- Sliding / Fixed → 0

Hinges live in the static frame group (outside AnimatedPane), not swinging with the glass — they're the pivot axis.

**Breathing animation**: AnimatedPane rewritten. Default loop now runs `±12°` amplitude over 3-second period via `|sin(πt/3)|`, so the user sees at a glance which panes open and in which direction without clicking. The Step-8 open/close toggle still works — it scales the target to the full ~75° / 15° tilt / 70% slide. Reduced-motion users get a static 25% partial-open pose.

**HTML overlay labels**: new `<PaneOverlayLabels>` sibling to Canvas (not inside it — keeps WebGL bundle untouched). One mono caption per openable pane:
- ` ← მენტეშე მარცხნივ` / `მენტეშე მარჯვნივ → `
- `← გასაღება + დასაკეცი` / `გასაღება + დასაკეცი →`
- `↥ ზემოდან დასაკეცი`
- `↔ სლაიდინგი`

Position computed from each pane's relative cx. pointer-events: none so OrbitControls drag passes through.

i18n keys added (ka/en/ru): `configurator.scene.overlay.{casementLeft, casementRight, tiltAndTurnLeft, tiltAndTurnRight, tilt, sliding}`.

---

## What I deferred and why

### Step 4 opening-type hover preview
Lasha's spec asked for "hover on opening-type button → 3D preview animates that motion." The always-on breathing animation already shows the motion for whichever opening type is currently selected, so the hover preview is now lower-value (it would duplicate visible information). Defer to a later polish slice if Roman feedback shows users still don't get it. Tracked in audit doc.

### Hide Scene on Steps 1-2
The Scene currently renders an empty frame with no material / no panes on Steps 1-2. The wall-context + new lighting makes this less jarring than before (it now looks like "an empty frame waiting to be configured" rather than "a black void"). 🟡 not 🔴 — defer; revisit if Roman flags it.

### Workshop SVG illustrations under-scaled
Hand-drawn line-art reads as "rectangles with squiggles" at column scale on /about /process. 🟡, defer until real photos arrive per `docs/questions.md §8b`.

---

## Canary verification — all 7 prices intact

```
dotnet test --filter "FullyQualifiedName~Canary"
Passed!  13/13 unit tests
Passed!  10/10 integration tests
```

The 7 canary prices (753.31 / 832.61 / 1077.23 / 1336.18 / 1424.68 / 2333.17 / 2592.77 ₾) are pinned in `BACK/tests/BEQSAN.IntegrationTests/*EndpointTests.cs`. The visible 1077.23 ₾ on the re-captured Step-4 screenshot is the live-API readout from the same canary config (Window 165×140, 2-pane, Casement+Fixed) — frontend display ↔ backend math both holding.

---

## Where to verify visually

Re-captured screenshots in `audit/screenshots/{desktop,mobile}/` reflect the post-slice state. Key before/after pairs:

| Screen | Before | After |
|---|---|---|
| Home header | Logo + nav only — no lang switcher visible | Logo + `ქარ EN РУ` chips + nav |
| Home footer | 4-col footer w/ language block | 4-col footer, no language block |
| /process | Hero + CTA only (3000px void mid-page) | All 7 stages visible at 0.55→1 fade |
| Configurator scene (Step 4) | Tiny dark window in dark void, no hinges | Visible amber-lit window on warm wall, hinges + overlay labels per openable pane |
| Configurator (Step 8 review) | Same dim void | Frame clearly readable with wall context + breathing animation |

Mobile parity verified at 390×844 — language switcher pinned to top of hamburger drawer, all 3D fixes apply identically.

---

## Files changed

```
FRONT/apps/web/src/features/_layout/Layout.tsx          (lang switcher)
FRONT/apps/web/src/features/process/Process.tsx         (opacity floor)
FRONT/apps/web/src/features/materials/Materials.tsx     (opacity floor)
FRONT/apps/web/src/features/warranty/Warranty.tsx       (opacity floor)
FRONT/apps/web/src/features/configurator/3d/Scene.tsx   (full 3D rework)
FRONT/apps/web/src/i18n/locales/{ka,en,ru}.json         (overlay labels)
FRONT/audit-capture.mjs                                  (capture script)
audit/capture.mjs                                        (mirrored)
docs/visual-audit.md                                     (findings table)
docs/visual-polish-report.md                             (this file)
```

No BACK changes. No new dependencies. Typecheck + canary tests green.
