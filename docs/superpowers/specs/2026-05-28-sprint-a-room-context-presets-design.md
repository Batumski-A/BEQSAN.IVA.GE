# Design: Sprint A — Room Context Presets

- **Date:** 2026-05-28
- **Status:** Approved (Lasha — brainstorming session 2026-05-28)
- **Author:** Claude (per [feedback-infra-decisions-self-made](../../../C:/Users/Administrator/.claude/projects/e--BEQSAN-IVA-GE/memory/) — implementation calls delegated)
- **Companion:** [ADR-0005](../../adr/0005-pascal-editor-rejected-csg-adopted.md), [ai-integration SKILL](../../../.claude/skills/ai-integration/SKILL.md)
- **Implementation plan:** TBD — created via `writing-plans` skill after this spec is approved.

## Context

The LiveStudio "ნახე ოთახში" toggle shipped 2026-05-28 ([commit cc3be86](../../..)) renders a single generic grey wall slab behind the configured window. Lasha's feedback after seeing it live: the scene does not feel like an apartment, a house, or a veranda — "სახლი არ გავს სახლს" — and the Pascal Editor demo on GitHub looks meaningfully more professional. Three quality fronts surfaced from the conversation:

| Front | Symptom |
|---|---|
| **A** — Room context variety | One generic wall ≠ "ბინა ვერანდით, სახლი კერძო" |
| **B** — Product geometry identity | Door lacks handle, lock, threshold; mullions are overlapping boxes |
| **C** — Animation realism | Spring physics minimal, glass refraction static |

The brainstorming session settled on a sequential A → B → C plan. This spec covers **Sprint A only**. Sprint B (incorporating [text-to-cad](https://github.com/earthtojake/text-to-cad) as a build-time GLB generator for hardware) and Sprint C (animation polish) get their own specs when their turn comes.

## Goal

Replace the single generic grey wall slab with **three named, distinct, atmospheric preset environments** — apartment interior, private house exterior, veranda seaside — built entirely from hand-authored `three.js` geometry plus CC0 PBR textures from [Poly Haven](https://polyhaven.com/). Each preset reads at a glance as the thing it is, so the configured window or door visually inherits the right architectural identity.

## Success criteria

1. **Visual recognition.** When the user picks the apartment preset, a casual observer recognises the scene as an interior apartment without being told. Same for the exterior and veranda presets.
2. **Camera UX preserved.** The existing drag-to-rotate-world-group interaction continues to work identically across presets. The product is the visual hero; scenery rotates with it.
3. **60 FPS on iPhone 12-class devices.** All presets ship with a `lowDetail` mobile variant that skips heavy geometry. Per ADR-0005 mobile-fallback convention.
4. **Preset switch cost < 100 ms.** No user-visible jank when toggling between presets. Geometry rebuilt only on dimension change, not on preset change.
5. **Zero new runtime dependencies.** Approach 2 was chosen specifically to stay inside `three.js` + `@react-three/drei` we already ship.
6. **Reversible to "off".** The user can always switch back to "ფანჯარა მხოლოდ" — the no-preset bare studio backdrop currently shipping.

## Non-goals (Sprint A out-of-scope)

- Real door/window hardware (handles, locks, hinges, thresholds). **Sprint B.**
- CSG mullion grooves on the window frame. **Sprint B.**
- Spring-physics opening animation, glass refraction during motion. **Sprint C.**
- Furniture meshes (sofas, tables, chairs, kitchen units). Defer to Sprint B's GLB asset pipeline.
- Per-preset camera mode switching (interior camera vs exterior camera). Lasha explicitly rejected this — keep the current "product spins, scenery follows" mode for all presets.
- Time-of-day slider per preset. Each preset has one fixed lighting mood.
- Persisting preset choice across sessions. Local state only; user re-picks on each visit. Revisit if usage patterns suggest otherwise.

## Architecture

### File layout

```
FRONT/apps/web/src/features/configurator/3d/
├── Scene.tsx                    # (existing) consumes <RoomContext> via showRoomContext prop
├── csg/wallCutout.ts            # (existing) CSG helper used by ApartmentInterior + HouseExterior
└── rooms/                       # ★ NEW directory
    ├── RoomContext.tsx          # dispatcher: kind → preset component
    ├── ApartmentInterior.tsx    # preset 1
    ├── HouseExterior.tsx        # preset 2
    ├── VerandaSeaside.tsx       # preset 3
    ├── presets.ts               # PresetKind union, metadata table, default selection
    └── props/                   # leaf prop primitives, each ~30-80 lines
        ├── Plinth.tsx           # apartment baseboard run
        ├── Chandelier.tsx       # apartment warm pendant + emissive bulb
        ├── PlantSilhouette.tsx  # apartment tall potted plant near window
        ├── TreeSilhouette.tsx   # exterior flanking trees (alpha-cutout quads)
        ├── GroundPlane.tsx      # exterior grass/dirt ground
        ├── GlassRailing.tsx     # veranda balustrade
        ├── WoodVault.tsx        # veranda pergola lattice
        └── SeaBackdrop.tsx      # veranda distant sea + horizon

FRONT/apps/web/public/textures/  # ★ NEW directory
├── apartment/
│   ├── wood_floor_worn_diff_1k.jpg          (CC0 Poly Haven)
│   ├── wood_floor_worn_nor_gl_1k.jpg
│   └── wood_floor_worn_arm_1k.jpg
├── exterior/
│   ├── painted_plaster_wall_diff_1k.jpg     (CC0 Poly Haven)
│   ├── painted_plaster_wall_nor_gl_1k.jpg
│   ├── painted_plaster_wall_arm_1k.jpg
│   └── grass_diff_1k.jpg
└── veranda/
    ├── wood_planks_diff_1k.jpg              (CC0 Poly Haven)
    ├── wood_planks_nor_gl_1k.jpg
    └── wood_planks_arm_1k.jpg
```

Each texture is 1K resolution (1024×1024), JPG diffuse, KTX2-compressed normal/ARM if budget allows in a follow-up — for Sprint A we ship plain JPG to keep the asset pipeline simple. Total texture budget: ≤ 6 MB committed to git (3 presets × ~2 MB each).

### Type contract

```ts
// rooms/presets.ts
export type PresetKind = 'apartment' | 'exterior' | 'veranda';

export type PresetMetadata = {
  kind: PresetKind;
  /** Georgian label shown in the LiveStudio segmented control. */
  labelKey: string; // 'studio.roomPreset.apartment' etc.
  /** Lucide icon name for the toggle. */
  icon: 'building' | 'house' | 'sunset';
  /** drei <Environment> preset name for IBL. */
  hdriPreset: 'city' | 'sunset' | 'dawn';
  /** Color temperature of the primary key light, used for material warm/cool tuning. */
  keyTemperatureK: 2700 | 3500 | 5500;
};

export const PRESETS: ReadonlyArray<PresetMetadata> = [
  { kind: 'apartment', labelKey: 'studio.roomPreset.apartment', icon: 'building', hdriPreset: 'city',   keyTemperatureK: 2700 },
  { kind: 'exterior',  labelKey: 'studio.roomPreset.exterior',  icon: 'house',    hdriPreset: 'sunset', keyTemperatureK: 3500 },
  { kind: 'veranda',   labelKey: 'studio.roomPreset.veranda',   icon: 'sunset',   hdriPreset: 'dawn',   keyTemperatureK: 5500 },
];
```

The four-state LiveStudio control is `PresetKind | null` — `null` means "ფანჯარა მხოლოდ" (current bare studio).

### Dispatcher contract

```ts
// rooms/RoomContext.tsx
type Props = {
  kind: PresetKind;
  widthCm: number;        // window/door opening width
  heightCm: number;       // window/door opening height
  isMobile: boolean;      // drives lowDetail path per preset
};

export function RoomContext({ kind, widthCm, heightCm, isMobile }: Props): JSX.Element;
```

The dispatcher returns the appropriate preset component. Each preset component owns its own materials, lighting, props, and (optionally) a CSG-cut wall for window placement.

### State + UI changes

**LiveStudio.tsx:**

- Replace the existing pill button `roomContextOpen: boolean` with a four-state local state `roomPresetKind: PresetKind | null` (default `null`).
- Render a segmented control top-center on desktop, mobile-sheet item on mobile:
  - `null` — 🚫 "ფანჯარა მხოლოდ" (current behaviour)
  - `'apartment'` — 🏢 "ბინა"
  - `'exterior'` — 🏡 "კერძო სახლი"
  - `'veranda'` — 🌅 "ვერანდა"
- Pass through to `<Scene>` as a new prop `roomPreset?: PresetKind | null` replacing `showRoomContext: boolean`. Backwards compat: if `roomPreset` is omitted, no preset renders (same effect as today).

**Scene.tsx:**

- Replace existing `showRoomContext?: boolean` prop with `roomPreset?: PresetKind | null`.
- Replace the existing `RoomContextWall` sub-component call with `<RoomContext kind={roomPreset} ... />` (only when `roomPreset !== null`).
- The old `RoomContextWall` function is deleted — the apartment preset's back wall replaces it.

**configurator/store.ts:** no changes. State is local to LiveStudio; preset choice does not affect price or order payload.

### Per-preset specification

#### Preset 1 — `ApartmentInterior`

Visual identity: a Batumi residential living room. The window or door is set into the back wall; left and right walls partially visible to frame the scene; floor and ceiling complete the box.

**Geometry:**
- **Back wall:** CSG slab via existing `buildWallCutoutGeometry` — opening matches the configured product dimensions. Wall slab 4 m × 2.7 m × 0.18 m, sill 0.9 m (residential default).
- **Left wall:** plain plane, 2 m wide × 2.7 m tall, positioned perpendicular at x = −2 m.
- **Right wall:** symmetric, at x = +2 m.
- **Floor:** plane 4 m × 4 m, horizontal at y = 0.
- **Ceiling:** plane 4 m × 4 m, horizontal at y = 2.7 m, with a thin emissive cove around the perimeter (one 0.05 m strip mesh inset from the ceiling edge).

**Materials:**
- Walls: `MeshPhysicalMaterial` with diffuse `#E8E4DC` (matte plaster), roughness 0.9, metalness 0.
- Floor: PBR with Poly Haven `wood_floor_worn_1k` — diffuse + normal + ARM (ambient occlusion / roughness / metallic combined map).
- Ceiling: `#FFFFFF`, roughness 0.95, slight `emissive` `#FFE8B5 * 0.05` baseline + ring around perimeter.

**Props:**
- **Plinth** around the floor edge: dark wood (`#3A2A1F`) box mesh, height 0.08 m, depth 0.02 m. Runs along the visible edges of the floor where it meets a wall.
- **Chandelier** centred above the floor, suspended from ceiling at y = 2.2 m: a single thin cylinder (cord) + a flat disc (shade) + a small sphere underneath (bulb) with emissive `#FFE8B5 * 1.5` and a `pointLight` co-located at `intensity={3}` `decay={2}` `distance={5}` `color="#FFE8B5"`.
- **Plant silhouette** at one side of the back wall (x = +1.5 m, y = 0): a tall thin trapezoid mesh (pot) + a vertical plane with alpha cutout for the foliage (simple stylised PNG, ~30 KB).

**Lighting:**
- `ambientLight intensity={0.25} color="#FFE8B5"`.
- `pointLight` from the chandelier (above).
- A weak `directionalLight` from the window direction (z = +1) at `intensity={0.4}` `color="#A8C8FF"` simulating daylight bleed.
- `<Environment preset="city">` for image-based lighting (drei built-in).

**Mobile lowDetail variant:**
- Skip the left/right walls, the plinth, and the plant silhouette.
- Keep the back wall (CSG cut), floor, and chandelier emissive sphere (no `pointLight` — too expensive).

---

#### Preset 2 — `HouseExterior`

Visual identity: a private house facade seen from the street under golden-hour evening light. The window or door is set into the facade; ground extends forward; sky completes the frame.

**Geometry:**
- **Facade wall:** CSG slab via `buildWallCutoutGeometry` — opening matches product dimensions. Slab 6 m × 3.5 m × 0.22 m (thicker exterior wall), sill 1.1 m (typical exterior).
- **Ground:** plane 12 m × 12 m at y = 0, rotated −π/2 around x.
- **Sky:** drei `<Sky>` component with sun position computed from golden-hour angle, OR a textured skybox plane at z = −8 if `<Sky>` is too heavy for mobile.

**Materials:**
- Facade: PBR with Poly Haven `painted_plaster_wall_1k` — diffuse + normal + ARM, base tint shifted toward warm cream (`color="#D8C9A8"`).
- Ground: `painted_plaster_wall`-adjacent or a separate `grass_diff_1k.jpg`; simple roughness 0.95.

**Props:**
- **Two flanking trees**: alpha-cutout PNG quad meshes at x = ±2.5 m, z = +0.5 m. Stylised tree silhouettes, ~50 KB each.
- Optional: small bush mesh (box scaled to 0.3 m cube) at one corner.

**Lighting:**
- `directionalLight` golden-hour key from low angle: `position={[5, 3, 5]}` `intensity={1.6}` `color="#FFB870"` `castShadow`.
- Cool sky fill: `hemisphereLight args={['#A8C8FF', '#5A4830', 0.5]}`.
- `<Environment preset="sunset">` for IBL.

**Mobile lowDetail variant:**
- Skip the two flanking trees and the bush.
- Replace `<Sky>` with a static gradient plane (one rectangular mesh with a vertical color ramp).
- Keep the facade (CSG cut) and ground.

---

#### Preset 3 — `VerandaSeaside`

Visual identity: a covered wooden veranda overlooking the Black Sea, late morning. The window or door is set into the back wall of the veranda; a pergola overhead; glass railing in front; sea backdrop in the distance.

**Geometry:**
- **Back wall:** CSG slab via `buildWallCutoutGeometry` — sized like the apartment back wall (4 m × 2.7 m × 0.18 m, sill 0.9 m).
- **Deck floor:** plane 5 m × 4 m at y = 0 in front of the back wall.
- **Pergola vault:** a `WoodVault` component renders 6 horizontal beams (box meshes 5 m × 0.08 m × 0.08 m) at y = 2.8 m, spaced 0.6 m apart, plus 2 perpendicular cross-beams.
- **Glass railing:** `GlassRailing` renders a low transparent plane at z = +1.8 m with 4 vertical metal posts (thin cylinders), top rail (thin horizontal box).
- **Sea backdrop:** `SeaBackdrop` renders a large plane far away (z = −15 m) with a vertical color gradient: blue at top, white near horizon, slight wave-line offsets baked into the texture.

**Materials:**
- Back wall: matte plaster (same as apartment) but slightly warmer (`#E8DCC8`).
- Deck: PBR with Poly Haven `wood_planks_1k` — diffuse + normal + ARM.
- Beams: same `wood_planks` texture but darker tint (`color="#5A3D28"`).
- Glass railing: `MeshPhysicalMaterial` with `transmission={0.95}` `roughness={0.05}` (same family as the configurator glass).
- Sea backdrop: emissive-style flat material so it stays bright even under low lighting.

**Props:**
- **Greenery edge** along one side: 1-2 potted plant silhouettes (reuse the apartment `PlantSilhouette` with different scale).

**Lighting:**
- `directionalLight` bright daylight: `position={[3, 6, 5]}` `intensity={1.8}` `color="#FFFCEC"` `castShadow`.
- `hemisphereLight args={['#A8E0FF', '#D8B080', 0.7]}` — sky blue from above, warm sand bounce from below.
- `<Environment preset="dawn">` for IBL.

**Mobile lowDetail variant:**
- Skip the pergola beams and the sea backdrop.
- Replace the glass railing with a single low translucent plane (no posts, no top rail).
- Keep the deck and the back wall (CSG cut).

### Texture asset pipeline

- Source: Poly Haven (CC0). Per-asset attribution not required by CC0 but credited in `docs/credits.md` (new file in Sprint A) as good practice.
- Download flow: a human (Claude or Lasha) downloads the 1K JPG variants from polyhaven.com via direct download links into `FRONT/apps/web/public/textures/<preset>/`.
- No build-time texture pipeline in Sprint A. KTX2 compression can come in Sprint B if bundle inspection shows it's worth it.
- Vite serves the textures statically; drei `useTexture` loads them with built-in async + suspense.
- A scene-level `<Preload>` component preloads all three preset texture sets on first mount so preset switching has no fetch delay.

### i18n

New keys added to `ka.json`, `en.json`, `ru.json`:

```json
"studio": {
  "roomPreset": {
    "none": "ფანჯარა მხოლოდ",
    "apartment": "ბინა",
    "exterior": "კერძო სახლი",
    "veranda": "ვერანდა",
    "noneAria": "ოთახის კონტექსტის ფარვა",
    "apartmentAria": "ბინის ინტერიერში ჩვენება",
    "exteriorAria": "სახლის ფასადზე ჩვენება",
    "verandaAria": "ვერანდაზე ჩვენება",
    "announceChanged": "ოთახის კონტექსტი შეიცვალა: {{name}}"
  }
}
```

The existing `studio.roomContext.*` keys are deleted in the same commit that ships the new control. No backward-compat shim — the `roomContextOpen` toggle is removed wholesale.

Per `content-voice` skill: each label is short, calm, craftsperson-like. No exclamation marks. No marketing language.

### Mobile detection

Inherit Scene.tsx's existing `isMobile = window.matchMedia('(max-width: 768px)').matches`. Pass through to `<RoomContext>` as a prop; each preset component branches internally.

On mobile, the four-state segmented control stays at top-center where the current Phase-2 room-context pill already lives — same horizontal flex container as the desktop background-preset swatches (which are themselves `hidden md:flex`, so on mobile the segmented control is alone). The control compresses to icon-only on mobile (the four icons fit in roughly 200 px). Long-pressing an icon surfaces a tooltip with the Georgian label via `title=` plus the existing `aria-label` for screen readers. No new mobile-sheet tab is introduced — Sprint A treats room context as a scene-decoration choice, not a configuration step.

### Accessibility

- The segmented control is implemented as a `<div role="radiogroup" aria-label="ოთახის კონტექსტი">` with four `<button role="radio" aria-checked>` children — standard ARIA radio pattern, full keyboard support (arrow keys to move, space to select).
- Each preset change fires an `aria-live="polite"` announcement using `studio.roomPreset.announceChanged` with the preset name interpolated.
- The 3D canvas remains `aria-hidden` per existing convention; the text-equivalent control is the segmented control itself.
- Touch targets ≥ 44 px on mobile (segmented control buttons size up).

### Performance budget

Per `3d-scene-design` skill and ADR-0005:

| Target | Mobile | Desktop |
|---|---|---|
| FPS | 60 | 60 |
| New textures total (loaded once) | ≤ 6 MB | ≤ 6 MB |
| New geometry vertices per preset | ≤ 5 k | ≤ 20 k |
| New directional lights with shadow per preset | 1 | 2 |

Verification (manual, owed before announcing the feature):
- iPhone 12 / Safari: each preset hits 60 FPS during a width slider sweep.
- Desktop Chrome: no console errors, no z-fighting at wall opening rims, no missing texture warnings.
- TalkBack / VoiceOver: `aria-live` announce fires on each preset change.

## Error handling

- **Texture failed to load:** drei's `useTexture` throws; the surrounding `<Suspense>` boundary at Scene level shows the existing Georgian "3D სცენა იტვირთება..." loader and the preset falls back to plain `MeshPhysicalMaterial` with a neutral colour. Single texture failure does not break the whole scene.
- **CSG build failure (apartment / exterior back wall):** the existing `buildFallbackWallGeometry` plain-plane path runs (same path mobile already uses). Logged to console once.
- **HDRI preset unavailable** (drei `<Environment>` 404): drei silently skips IBL; scene falls back to ambient + key lighting only. Visually acceptable.
- **Preset kind unknown** (typo, future preset addition): `RoomContext` dispatcher renders `null` and logs `console.warn` once. Scene unchanged from "ფანჯარა მხოლოდ" state.

No new exception surface needs to reach the user. All failure modes degrade gracefully.

## Testing strategy

Sprint A introduces no business-logic changes — there are no new pricing inputs, no new order fields, no new server calls. The existing canary pricing tests in BACK (`canaries #1-#7`) continue to lock the price math. No new BACK tests needed.

Frontend testing:
- **Build verification:** the existing `pnpm --filter @beqsan/web build` (tsc + vite) must pass.
- **Manual smoke test per preset:** load `/configurator`, switch through each preset, confirm visual and toggle behaviour. Documented as a checklist in the implementation plan.
- **No new Vitest suite for Sprint A.** Geometry helpers are visual — automated tests would only assert internal structure that the design constraints already document. Cost-benefit doesn't justify it for Sprint A. Sprint B's hardware GLBs may justify a snapshot-style test for asset loading.

## Open questions

These do not block Sprint A start. Capture and revisit during implementation.

1. **Skybox heaviness on mobile:** `<Sky>` from drei pulls in `three-sky-shader` which inflates the Scene chunk. If bundle inspection during implementation shows a meaningful jump, fall back to a static gradient plane on both desktop and mobile.
2. **Plant silhouette PNG art:** the asset doesn't exist yet. Implementation may use a placeholder stylised SVG converted to PNG, or sit empty until Lasha approves a sketch. Don't block Sprint A on this — ship without the plant prop if needed.
3. **Sea backdrop subtlety:** a flat gradient plane risks looking cheap. Implementation may iterate visually — possibly a baked-in slight wave texture, or a thin animated `shaderMaterial` (deferred to Sprint C if performance allows).
4. **Audit of duplicated security headers** seen during the prior deploy investigation (`X-Frame-Options` appearing both as `DENY` and `SAMEORIGIN` in headers from `beqsan.iva.ge`) — not Sprint A scope, but worth opening a separate issue.

## Rollout

- All changes ship in a single feature commit `feat(studio): room context presets — apartment / exterior / veranda`.
- Followed by texture-asset commits, one per preset, so the diff stays reviewable.
- Push to `main`. CI builds + uploads artifacts. Then the deploy procedure from [project-deployment-layout](../../../C:/Users/Administrator/.claude/projects/e--BEQSAN-IVA-GE/memory/project_deployment_layout.md) ships the new bundle to `C:\inetpub\wwwroot\BEQSAN.IVA.GE\FRONT\`.
- Backup the current FRONT/ before the deploy as always. Rollback is `mv` of the backup directory.

## Dependencies on prior work

- ADR-0005 (three-bvh-csg adoption, room-context toggle Phase 2). The apartment and exterior presets call `buildWallCutoutGeometry` directly. The veranda preset reuses `buildWallCutoutGeometry` for its back wall.
- `project-deployment-layout` memory (deploy lives at `C:\inetpub\wwwroot\BEQSAN.IVA.GE\FRONT\` on this Windows Server 2022 box, no SSH needed).
- `3d-scene-design` skill (lighting and material conventions).
- `content-voice` skill (Georgian copy register).
- `accessibility` skill (radio-group pattern, `aria-live` announcement convention).

## Approved-by

Lasha (BEQSAN owner) approved the design overview during the 2026-05-28 brainstorming session. Approval scope: file layout, three-preset list, camera mode preservation, hand-built three.js + CC0 PBR textures, Approach 2 (mid-tier, 2 sessions). Implementation plan to follow via the `writing-plans` skill.
