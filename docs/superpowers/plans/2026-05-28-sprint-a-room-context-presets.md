# Sprint A — Room Context Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single generic grey wall slab (shipped 2026-05-28 in commit `cc3be86`) with three named atmospheric preset environments — apartment interior, private house exterior, veranda seaside — built from hand-authored `three.js` geometry plus CC0 PBR textures from Poly Haven.

**Architecture:** A new `features/configurator/3d/rooms/` directory holds a small dispatcher (`RoomContext.tsx`) that delegates to one of three preset components based on a `PresetKind` union. Each preset assembles its scene from a shared library of leaf prop primitives (Plinth, Chandelier, TreeSilhouette, etc.) plus the existing CSG wall-cutout helper for any wall that hosts the window/door. The LiveStudio segmented control replaces the existing pill-toggle. State stays local to LiveStudio.

**Tech Stack:** React 18, TypeScript strict, `@react-three/fiber`, `@react-three/drei` (Environment, Sky, useTexture, Preload), `three`, `three-bvh-csg@0.0.17`, Tailwind, `i18next`, Vite 5.

**Spec:** [docs/superpowers/specs/2026-05-28-sprint-a-room-context-presets-design.md](../specs/2026-05-28-sprint-a-room-context-presets-design.md)

**Approved by:** Lasha — 2026-05-28 brainstorming session.

---

## Pre-flight

These hold across every task in this plan.

- **Working directory:** `e:\BEQSAN.IVA.GE\` (the repo root). Commands run from the FRONT workspace use `cd /e/BEQSAN.IVA.GE/FRONT && ...`.
- **Branch:** `main`. No feature branch — BEQSAN team's convention is direct commits to main with conventional-commits subjects (verified via `git log --oneline -10`).
- **Build verification command:** `cd /e/BEQSAN.IVA.GE/FRONT && pnpm --filter @beqsan/web build 2>&1 | tail -20`. Passes when last line is `✓ built in <N>s` and the chunk listing shows no errors. The same command runs `tsc -p tsconfig.json --noEmit` first, so a typecheck failure aborts the build.
- **Manual UI verification command:** `cd /e/BEQSAN.IVA.GE/FRONT && pnpm --filter @beqsan/web dev` then open `http://localhost:5173/configurator`. The dev server's terminal stays open; `Ctrl+C` to stop. Background it with the `run_in_background` flag if continuing other work.
- **Lint:** `pnpm --filter @beqsan/web lint` is currently broken (pre-existing `@eslint/js` missing in eslint.config.js, unrelated to this work). Do not block on lint. Track in `docs/questions.md` or a separate issue.
- **Commits:** Conventional Commits. Subject line under 70 chars. Each task ends with a commit. Use `git add <specific files>` not `git add -A`.
- **Co-author trailer:** all commits authored in this plan include `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` per existing repo convention.

---

## Task 1: Type contract — `rooms/presets.ts`

**Files:**
- Create: `FRONT/apps/web/src/features/configurator/3d/rooms/presets.ts`

- [ ] **Step 1: Create the file**

```ts
/**
 * Sprint A — Room Context Presets type contract.
 * Spec: docs/superpowers/specs/2026-05-28-sprint-a-room-context-presets-design.md
 */

export type PresetKind = 'apartment' | 'exterior' | 'veranda';

export type PresetMetadata = {
  kind: PresetKind;
  /** i18next key for the segmented-control label. */
  labelKey: string;
  /** i18next key for the aria-label. */
  ariaLabelKey: string;
  /** Lucide icon name — must match an existing import in LiveStudio.tsx. */
  iconName: 'building-2' | 'home' | 'sunset';
  /** drei <Environment> preset for image-based lighting. */
  hdriPreset: 'city' | 'sunset' | 'dawn';
  /** Primary key-light colour temperature (used for material warm/cool tuning). */
  keyTemperatureK: 2700 | 3500 | 5500;
};

export const PRESETS: ReadonlyArray<PresetMetadata> = [
  {
    kind: 'apartment',
    labelKey: 'studio.roomPreset.apartment',
    ariaLabelKey: 'studio.roomPreset.apartmentAria',
    iconName: 'building-2',
    hdriPreset: 'city',
    keyTemperatureK: 2700,
  },
  {
    kind: 'exterior',
    labelKey: 'studio.roomPreset.exterior',
    ariaLabelKey: 'studio.roomPreset.exteriorAria',
    iconName: 'home',
    hdriPreset: 'sunset',
    keyTemperatureK: 3500,
  },
  {
    kind: 'veranda',
    labelKey: 'studio.roomPreset.veranda',
    ariaLabelKey: 'studio.roomPreset.verandaAria',
    iconName: 'sunset',
    hdriPreset: 'dawn',
    keyTemperatureK: 5500,
  },
];

/** Look up metadata by kind. Returns undefined for unknown kinds. */
export function presetByKind(kind: PresetKind): PresetMetadata | undefined {
  return PRESETS.find((p) => p.kind === kind);
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /e/BEQSAN.IVA.GE/FRONT && pnpm --filter @beqsan/web typecheck 2>&1 | tail -5`
Expected: clean exit, no output past `$ tsc --noEmit`.

- [ ] **Step 3: Commit**

Defer commit until Task 3 — bundle Tasks 1–3 (type contract + dispatcher shell + i18n) into one logical commit.

---

## Task 2: Dispatcher shell — `rooms/RoomContext.tsx`

**Files:**
- Create: `FRONT/apps/web/src/features/configurator/3d/rooms/RoomContext.tsx`

- [ ] **Step 1: Create the file**

```tsx
import type { PresetKind } from './presets';

/**
 * Sprint A — Room Context dispatcher. Renders the right preset scene for
 * the chosen kind. Lasha confirmed (2026-05-28 brainstorming) that the
 * existing drag-to-rotate-world-group camera mode is preserved across all
 * presets — scenery rotates with the product, the product stays centred.
 *
 * Spec: docs/superpowers/specs/2026-05-28-sprint-a-room-context-presets-design.md
 */
export type RoomContextProps = {
  kind: PresetKind;
  /** Window/door opening width in centimetres (matches Scene.tsx convention). */
  widthCm: number;
  /** Window/door opening height in centimetres. */
  heightCm: number;
  /**
   * iPhone-class device flag. Drives the lowDetail path per preset
   * (ADR-0005 § Mobile fallback for CSG). True = skip heavy geometry.
   */
  isMobile: boolean;
};

/**
 * Phase-shell — preset components ship in Tasks 15–17. Until then this
 * renders null and the scene reverts to the bare studio backdrop (same as
 * `roomPreset === null`). The early shell exists so Task 4 can replace the
 * old `RoomContextWall` call with a stable target before the leaf presets
 * exist, keeping every commit independently buildable.
 */
export function RoomContext(_: RoomContextProps): JSX.Element | null {
  return null;
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /e/BEQSAN.IVA.GE/FRONT && pnpm --filter @beqsan/web typecheck 2>&1 | tail -5`
Expected: clean.

- [ ] **Step 3: Commit**

Deferred to Task 3.

---

## Task 3: i18n strings

**Files:**
- Modify: `FRONT/apps/web/src/i18n/locales/ka.json`
- Modify: `FRONT/apps/web/src/i18n/locales/en.json`
- Modify: `FRONT/apps/web/src/i18n/locales/ru.json`

The existing `studio.roomContext.*` keys (added in commit `cc3be86`) are removed in the same commit that adds `studio.roomPreset.*`.

- [ ] **Step 1: ka.json — replace `roomContext` block with `roomPreset`**

Find this block (around line 952 — `grep -n '"roomContext"' ka.json`):

```json
"roomContext": {
  "show": "ნახე ოთახში",
  "hide": "მხოლოდ ფანჯარა",
  "showAria": "ფანჯრის ჩვენება კედლის კონტექსტში",
  "hideAria": "კედლის ფარვა",
  "announceOn": "ფანჯარა კედლის კონტექსტშია",
  "announceOff": "მხოლოდ ფანჯარა ჩანს"
},
```

Replace with:

```json
"roomPreset": {
  "none": "ფანჯარა მხოლოდ",
  "apartment": "ბინა",
  "exterior": "კერძო სახლი",
  "veranda": "ვერანდა",
  "noneAria": "ოთახის კონტექსტის ფარვა",
  "apartmentAria": "ბინის ინტერიერში ჩვენება",
  "exteriorAria": "სახლის ფასადზე ჩვენება",
  "verandaAria": "ვერანდაზე ჩვენება",
  "groupAria": "ოთახის კონტექსტი",
  "announceChanged": "ოთახის კონტექსტი: {{name}}"
},
```

- [ ] **Step 2: en.json — same block swap**

Find the `"roomContext"` block:

```json
"roomContext": {
  "show": "See in a room",
  "hide": "Window only",
  "showAria": "Show window in wall context",
  "hideAria": "Hide wall",
  "announceOn": "Window shown in wall context",
  "announceOff": "Window only"
},
```

Replace with:

```json
"roomPreset": {
  "none": "Window only",
  "apartment": "Apartment",
  "exterior": "House",
  "veranda": "Veranda",
  "noneAria": "Hide room context",
  "apartmentAria": "Show in apartment interior",
  "exteriorAria": "Show on house facade",
  "verandaAria": "Show on veranda",
  "groupAria": "Room context",
  "announceChanged": "Room context: {{name}}"
},
```

- [ ] **Step 3: ru.json — same block swap**

Find the `"roomContext"` block:

```json
"roomContext": {
  "show": "В контексте стены",
  "hide": "Только окно",
  "showAria": "Показать окно в контексте стены",
  "hideAria": "Скрыть стену",
  "announceOn": "Окно в контексте стены",
  "announceOff": "Только окно"
},
```

Replace with:

```json
"roomPreset": {
  "none": "Только окно",
  "apartment": "Квартира",
  "exterior": "Дом",
  "veranda": "Веранда",
  "noneAria": "Скрыть контекст комнаты",
  "apartmentAria": "Показать в интерьере квартиры",
  "exteriorAria": "Показать на фасаде дома",
  "verandaAria": "Показать на веранде",
  "groupAria": "Контекст комнаты",
  "announceChanged": "Контекст комнаты: {{name}}"
},
```

- [ ] **Step 4: Typecheck**

Run: `cd /e/BEQSAN.IVA.GE/FRONT && pnpm --filter @beqsan/web typecheck 2>&1 | tail -5`
Expected: clean — i18next is dynamic so missing keys don't break typecheck, but the build does pull these JSON files in.

- [ ] **Step 5: Build verification**

Run: `cd /e/BEQSAN.IVA.GE/FRONT && pnpm --filter @beqsan/web build 2>&1 | tail -10`
Expected: `✓ built in <N>s`.

- [ ] **Step 6: Commit Tasks 1–3 together**

```bash
git add FRONT/apps/web/src/features/configurator/3d/rooms/presets.ts \
        FRONT/apps/web/src/features/configurator/3d/rooms/RoomContext.tsx \
        FRONT/apps/web/src/i18n/locales/ka.json \
        FRONT/apps/web/src/i18n/locales/en.json \
        FRONT/apps/web/src/i18n/locales/ru.json
git commit -m "$(cat <<'EOF'
feat(rooms): type contract + dispatcher shell + roomPreset i18n

Sprint A scaffolding per the room-context-presets spec. Adds the
PresetKind union and PRESETS metadata table, a no-op dispatcher
RoomContext component (preset bodies arrive in tasks 15-17), and
replaces the studio.roomContext.* i18n keys with the four-state
studio.roomPreset.* set.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Scene.tsx — replace `showRoomContext` with `roomPreset`

**Files:**
- Modify: `FRONT/apps/web/src/features/configurator/3d/Scene.tsx`

- [ ] **Step 1: Replace the import line**

Find:

```tsx
import { buildFallbackWallGeometry, buildWallCutoutGeometry } from './csg/wallCutout';
```

Add the RoomContext + presets imports just after it:

```tsx
import { buildFallbackWallGeometry, buildWallCutoutGeometry } from './csg/wallCutout';
import { RoomContext } from './rooms/RoomContext';
import type { PresetKind } from './rooms/presets';
```

- [ ] **Step 2: Replace the prop definition**

Find:

```tsx
  /**
   * LiveStudio "ნახე ოთახში" toggle — when true, wraps the window in a
   * parametric wall slab with a CSG-cut opening (desktop) or a plain plane
   * backdrop (mobile, per ADR-0005 fallback). When false, the LiveStudio
   * surface stays empty around the window. Ignored by the legacy wizard.
   */
  showRoomContext?: boolean;
```

Replace with:

```tsx
  /**
   * LiveStudio room-context preset (Sprint A). `null` = bare studio
   * backdrop (the legacy "ფანჯარა მხოლოდ" state). Otherwise the named
   * preset wraps the window/door in apartment / exterior / veranda
   * scenery. Mobile path drives lowDetail per preset via the existing
   * isMobile check. Ignored by the legacy wizard.
   */
  roomPreset?: PresetKind | null;
```

- [ ] **Step 3: Replace the destructure default**

Find:

```tsx
export function ConfiguratorScene({
  interactive,
  isStudio,
  background,
  showRoomContext = false,
}: ConfiguratorSceneProps = {}) {
```

Replace with:

```tsx
export function ConfiguratorScene({
  interactive,
  isStudio,
  background,
  roomPreset = null,
}: ConfiguratorSceneProps = {}) {
```

- [ ] **Step 4: Replace the in-scene render call**

Find:

```tsx
            {showRoomContext ? (
              <RoomContextWall
                widthCm={dimensions.widthCm}
                heightCm={dimensions.heightCm}
                isMobile={isMobile}
              />
            ) : null}
```

Replace with:

```tsx
            {roomPreset !== null ? (
              <RoomContext
                kind={roomPreset}
                widthCm={dimensions.widthCm}
                heightCm={dimensions.heightCm}
                isMobile={isMobile}
              />
            ) : null}
```

- [ ] **Step 5: Delete the old `RoomContextWall` function definition**

Find the entire block beginning with `function RoomContextWall({` and ending with the closing `}` of the function (Scene.tsx line range will be approximately 1710-1770 — verify with `grep -n 'function RoomContextWall' Scene.tsx`).

Remove the whole function block plus the doc comment immediately above it that starts with `/**\n * LiveStudio "ნახე ოთახში" backdrop`.

- [ ] **Step 6: Typecheck + build**

```bash
cd /e/BEQSAN.IVA.GE/FRONT && pnpm --filter @beqsan/web build 2>&1 | tail -20
```

Expected: `✓ built in <N>s`. The Scene chunk shrinks slightly (RoomContextWall removed, RoomContext is still a no-op stub).

- [ ] **Step 7: Commit (deferred to Task 5)**

---

## Task 5: LiveStudio.tsx — segmented control

**Files:**
- Modify: `FRONT/apps/web/src/features/configurator/LiveStudio.tsx`

- [ ] **Step 1: Replace state declaration**

Find:

```tsx
  // ADR-0005 § Phase 2 — "ნახე ოთახში" toggle. Off by default so the user
  // first sees the bare product against the studio backdrop, then opts in.
  const [roomContextOpen, setRoomContextOpen] = useState<boolean>(false);
```

Replace with:

```tsx
  // Sprint A — Room-context preset (apartment / exterior / veranda / null).
  // Null = bare studio backdrop (the prior "ფანჯარა მხოლოდ" state).
  // Lasha confirmed local state is fine; persist is not needed.
  const [roomPreset, setRoomPreset] = useState<PresetKind | null>(null);
```

- [ ] **Step 2: Add the type import**

Find the existing import line near the top:

```tsx
import type { ConfigurationPaneInput, HingeSide, PaneOpeningType } from '@beqsan/api-types';
```

Add immediately after:

```tsx
import type { PresetKind } from './3d/rooms/presets';
import { PRESETS } from './3d/rooms/presets';
```

- [ ] **Step 3: Add the icon imports**

Find the existing lucide-react import:

```tsx
import {
  ArrowLeft,
  Box,
  Check,
  DoorOpen,
  GalleryHorizontal,
  Square,
  PanelsTopLeft,
  Eye,
  EyeOff,
  LayoutGrid,
  Ruler,
  Columns3,
  X,
  Building2,
} from 'lucide-react';
```

Replace with (adds `Home`, `Sunset`, `EyeOff` already present):

```tsx
import {
  ArrowLeft,
  Box,
  Check,
  DoorOpen,
  GalleryHorizontal,
  Square,
  PanelsTopLeft,
  Eye,
  EyeOff,
  LayoutGrid,
  Ruler,
  Columns3,
  X,
  Building2,
  Home,
  Sunset,
} from 'lucide-react';
```

- [ ] **Step 4: Update the Scene prop pass-through**

Find:

```tsx
            <Suspense fallback={null}>
              <Scene
                interactive={sceneInteractive}
                isStudio={true}
                background={bgPreset}
                showRoomContext={roomContextOpen}
              />
            </Suspense>
```

Replace with:

```tsx
            <Suspense fallback={null}>
              <Scene
                interactive={sceneInteractive}
                isStudio={true}
                background={bgPreset}
                roomPreset={roomPreset}
              />
            </Suspense>
```

- [ ] **Step 5: Replace the toggle button block**

Find the entire top-center block — the comment that starts `{/* Top-center: room-context toggle + background preset swatches.`, the room-context pill button, and the SR live region (`<span aria-live="polite"...>`). This is roughly 50 lines.

Replace with:

```tsx
        {/* Top-center: room-preset segmented control + background preset
            swatches (3D mode only — both controls are meaningless against
            the 2D blueprint). The segmented control implements the ARIA
            radiogroup pattern so keyboard + screen-reader users get the
            same options as the visual mouse path. */}
        {showPanels && viewMode === '3d' ? (
          <div className="absolute left-1/2 top-[calc(1rem+env(safe-area-inset-top,0px))] z-30 flex -translate-x-1/2 items-center gap-2 md:top-6">
            <div
              role="radiogroup"
              aria-label={t('studio.roomPreset.groupAria')}
              className="flex rounded-xl border border-studio-ink-3 bg-studio-ink-2/90 p-1 shadow-lg backdrop-blur-md"
            >
              <RoomPresetChip
                active={roomPreset === null}
                onClick={() => setRoomPreset(null)}
                ariaLabel={t('studio.roomPreset.noneAria')}
                title={t('studio.roomPreset.none')}
                icon={<EyeOff className="h-4 w-4" aria-hidden />}
                label={t('studio.roomPreset.none')}
              />
              <RoomPresetChip
                active={roomPreset === 'apartment'}
                onClick={() => setRoomPreset('apartment')}
                ariaLabel={t('studio.roomPreset.apartmentAria')}
                title={t('studio.roomPreset.apartment')}
                icon={<Building2 className="h-4 w-4" aria-hidden />}
                label={t('studio.roomPreset.apartment')}
              />
              <RoomPresetChip
                active={roomPreset === 'exterior'}
                onClick={() => setRoomPreset('exterior')}
                ariaLabel={t('studio.roomPreset.exteriorAria')}
                title={t('studio.roomPreset.exterior')}
                icon={<Home className="h-4 w-4" aria-hidden />}
                label={t('studio.roomPreset.exterior')}
              />
              <RoomPresetChip
                active={roomPreset === 'veranda'}
                onClick={() => setRoomPreset('veranda')}
                ariaLabel={t('studio.roomPreset.verandaAria')}
                title={t('studio.roomPreset.veranda')}
                icon={<Sunset className="h-4 w-4" aria-hidden />}
                label={t('studio.roomPreset.veranda')}
              />
            </div>

            <div className="hidden items-center gap-1 rounded-xl border border-studio-ink-3 bg-studio-ink-2/80 p-1 shadow-lg backdrop-blur-md md:flex">
              {(['dark', 'studio', 'warm'] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setBgPreset(preset)}
                  aria-label={t(`studio.background.${preset}`)}
                  title={t(`studio.background.${preset}`)}
                  className={cn(
                    'h-7 w-7 rounded-lg border transition-all',
                    bgPreset === preset
                      ? 'border-studio-brand ring-1 ring-studio-brand'
                      : 'border-studio-ink-3 hover:border-studio-fg-inv-mute',
                  )}
                  style={{
                    background:
                      preset === 'studio'
                        ? '#E8ECF2'
                        : preset === 'warm'
                          ? '#2A1F18'
                          : '#0B1220',
                  }}
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* SR live region — announces preset changes so screen-reader users
            track the visual change happening in the aria-hidden 3D canvas. */}
        <span aria-live="polite" className="sr-only">
          {t('studio.roomPreset.announceChanged', {
            name: roomPreset === null
              ? t('studio.roomPreset.none')
              : t(`studio.roomPreset.${roomPreset}`),
          })}
        </span>
```

- [ ] **Step 6: Add the `RoomPresetChip` helper component**

At the bottom of LiveStudio.tsx (after the existing helpers like `ProfileChoice`, `DimensionSlider`, etc., before the file's closing structure), add:

```tsx
type RoomPresetChipProps = {
  active: boolean;
  onClick: () => void;
  ariaLabel: string;
  title: string;
  icon: React.ReactNode;
  label: string;
};

/**
 * One option in the room-preset radiogroup. Icon-only on mobile (label
 * hidden under `md:`) so all four chips fit at the top-center of the
 * canvas; label appears on desktop. The aria-label carries the full
 * description for screen readers in both cases.
 */
function RoomPresetChip({ active, onClick, ariaLabel, title, icon, label }: RoomPresetChipProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={ariaLabel}
      title={title}
      onClick={onClick}
      className={cn(
        'flex h-9 min-w-11 items-center gap-2 rounded-lg px-2.5 text-xs font-bold transition-colors md:px-3',
        active
          ? 'bg-studio-brand text-white'
          : 'text-studio-fg-inv-mute hover:bg-studio-ink-3 hover:text-white',
      )}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}
```

- [ ] **Step 7: Build verification**

Run: `cd /e/BEQSAN.IVA.GE/FRONT && pnpm --filter @beqsan/web build 2>&1 | tail -20`
Expected: `✓ built in <N>s`. LiveStudio chunk size shifts by a few KB.

- [ ] **Step 8: Manual UI verification**

Run dev server in the background:

```bash
cd /e/BEQSAN.IVA.GE/FRONT && pnpm --filter @beqsan/web dev
```

Open `http://localhost:5173/configurator` in a browser. Verify:
- Four chips visible at top-center (or icon-only on mobile screens).
- Clicking each chip highlights it with the studio-brand background.
- Console shows no warnings about missing i18n keys.
- Scene renders normally — no preset bodies yet (RoomContext is a no-op), so the bare studio backdrop stays regardless of chip choice. This is expected at this checkpoint.

Stop the dev server (Ctrl+C in its terminal).

- [ ] **Step 9: Commit Tasks 4 + 5**

```bash
git add FRONT/apps/web/src/features/configurator/3d/Scene.tsx \
        FRONT/apps/web/src/features/configurator/LiveStudio.tsx
git commit -m "$(cat <<'EOF'
feat(studio): swap room-context pill for 4-state preset segmented control

LiveStudio control changes from on/off pill to a four-button radiogroup
(none / apartment / exterior / veranda). Scene.tsx prop renames from
showRoomContext: boolean to roomPreset: PresetKind | null and dispatches
through the new RoomContext component (still a no-op stub — preset
bodies ship in subsequent commits).

This commit is a UI-visible checkpoint: the segmented control works and
is keyboard / screen-reader accessible, but every option renders the
bare studio backdrop until the preset components land.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Apartment props — `Plinth`, `Chandelier`, `PlantSilhouette`

**Files:**
- Create: `FRONT/apps/web/src/features/configurator/3d/rooms/props/Plinth.tsx`
- Create: `FRONT/apps/web/src/features/configurator/3d/rooms/props/Chandelier.tsx`
- Create: `FRONT/apps/web/src/features/configurator/3d/rooms/props/PlantSilhouette.tsx`

- [ ] **Step 1: `Plinth.tsx` — dark wood baseboard run**

```tsx
/**
 * Plinth — dark-wood baseboard running along the bottom edge of an
 * apartment wall. Rendered as a thin box mesh; the parent positions and
 * scales it per-wall. Single-purpose, no props beyond width/depth.
 */
export type PlinthProps = {
  /** Length of this baseboard run, in metres. */
  lengthM: number;
};

export function Plinth({ lengthM }: PlinthProps) {
  // 8 cm tall × 2 cm deep — standard Batumi apartment plinth section.
  const heightM = 0.08;
  const depthM = 0.02;
  return (
    <mesh position={[0, heightM / 2, depthM / 2]} receiveShadow>
      <boxGeometry args={[lengthM, heightM, depthM]} />
      <meshPhysicalMaterial color="#3A2A1F" metalness={0} roughness={0.6} />
    </mesh>
  );
}
```

- [ ] **Step 2: `Chandelier.tsx` — pendant + emissive bulb + point light**

```tsx
/**
 * Chandelier — apartment ceiling pendant. A thin suspension cord + a flat
 * disc shade + a small emissive sphere bulb + a co-located point light.
 * Lowered to a fixed y=2.2 m position (under the 2.7 m ceiling) so the
 * cord visually reads.
 */
export type ChandelierProps = {
  /** When true, the point light is dropped — emissive sphere stays. */
  lowDetail?: boolean;
};

export function Chandelier({ lowDetail = false }: ChandelierProps) {
  return (
    <group position={[0, 2.2, 0]}>
      {/* Suspension cord — thin cylinder from ceiling */}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.7, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Shade — flat disc */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.18, 0.04, 24]} />
        <meshPhysicalMaterial color="#E8E0C8" metalness={0.05} roughness={0.4} />
      </mesh>
      {/* Bulb — emissive sphere */}
      <mesh position={[0, -0.05, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial
          color="#FFF4D8"
          emissive="#FFE8B5"
          emissiveIntensity={2.5}
        />
      </mesh>
      {!lowDetail ? (
        <pointLight color="#FFE8B5" intensity={3} distance={5} decay={2} castShadow />
      ) : null}
    </group>
  );
}
```

- [ ] **Step 3: `PlantSilhouette.tsx` — pot + alpha-cutout foliage plane**

```tsx
/**
 * PlantSilhouette — a tall potted plant for the apartment preset. The
 * pot is a tapered cylinder; the foliage is a billboard plane that
 * always faces the camera. Used inside an apartment to break the
 * geometric harshness of the wall corners.
 *
 * Sprint A ships without an actual alpha-cutout PNG (the asset doesn't
 * exist yet — see spec § Open questions). For now the foliage is a
 * simple stylised cone in a dark sage colour; swap to a textured plane
 * once Lasha approves the artwork.
 */
export type PlantSilhouetteProps = {
  scale?: number;
};

export function PlantSilhouette({ scale = 1 }: PlantSilhouetteProps) {
  return (
    <group scale={scale}>
      {/* Terracotta pot */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.13, 0.3, 16]} />
        <meshStandardMaterial color="#A55F3A" roughness={0.85} />
      </mesh>
      {/* Foliage placeholder — stylised cone */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <coneGeometry args={[0.35, 1.1, 16]} />
        <meshStandardMaterial color="#3F5640" roughness={0.7} />
      </mesh>
    </group>
  );
}
```

- [ ] **Step 4: Typecheck + build**

```bash
cd /e/BEQSAN.IVA.GE/FRONT && pnpm --filter @beqsan/web build 2>&1 | tail -10
```

Expected: clean build.

- [ ] **Step 5: Commit Task 6**

```bash
git add FRONT/apps/web/src/features/configurator/3d/rooms/props/Plinth.tsx \
        FRONT/apps/web/src/features/configurator/3d/rooms/props/Chandelier.tsx \
        FRONT/apps/web/src/features/configurator/3d/rooms/props/PlantSilhouette.tsx
git commit -m "$(cat <<'EOF'
feat(rooms): apartment props — Plinth, Chandelier, PlantSilhouette

Three leaf primitives consumed by the upcoming ApartmentInterior preset.
Each is a small self-contained component with no state and one job:
Plinth runs along a baseboard line, Chandelier suspends a warm emissive
bulb from a ceiling cord, PlantSilhouette stylises a tall potted plant
(real alpha-cutout PNG art deferred to a follow-up).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Exterior props — `TreeSilhouette`, `GroundPlane`

**Files:**
- Create: `FRONT/apps/web/src/features/configurator/3d/rooms/props/TreeSilhouette.tsx`
- Create: `FRONT/apps/web/src/features/configurator/3d/rooms/props/GroundPlane.tsx`

- [ ] **Step 1: `TreeSilhouette.tsx` — stylised tree (cone + trunk)**

```tsx
/**
 * TreeSilhouette — stylised tree for the HouseExterior preset. Sprint A
 * uses a simple trunk + foliage-cone primitive; a textured alpha-cutout
 * billboard is a Sprint B+ upgrade once the asset exists. Two of these
 * flank the house facade.
 */
export type TreeSilhouetteProps = {
  scale?: number;
};

export function TreeSilhouette({ scale = 1 }: TreeSilhouetteProps) {
  return (
    <group scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 1.6, 12]} />
        <meshStandardMaterial color="#5A3D28" roughness={0.85} />
      </mesh>
      {/* Foliage — broad cone */}
      <mesh position={[0, 2.0, 0]} castShadow>
        <coneGeometry args={[0.9, 1.8, 16]} />
        <meshStandardMaterial color="#3F5640" roughness={0.7} />
      </mesh>
    </group>
  );
}
```

- [ ] **Step 2: `GroundPlane.tsx` — large textured ground**

```tsx
import { useTexture } from '@react-three/drei';
import { RepeatWrapping } from 'three';
import { useMemo } from 'react';

/**
 * GroundPlane — large textured horizontal plane used by HouseExterior
 * (grass) and conceptually reusable by other exterior-ish presets. The
 * texture is tiled via RepeatWrapping so a 1K JPG covers a 12×12 m
 * footprint without obvious tile seams.
 */
export type GroundPlaneProps = {
  /** Public path to a diffuse texture, e.g. /textures/exterior/grass_diff_1k.jpg */
  diffuseTexturePath: string;
  /** Plane width/height in metres. Default 12 m matches the spec. */
  sizeM?: number;
  /** Texture tile count across the plane. Default 4 (so each tile ≈ 3 m). */
  tile?: number;
};

export function GroundPlane({
  diffuseTexturePath,
  sizeM = 12,
  tile = 4,
}: GroundPlaneProps) {
  const texture = useTexture(diffuseTexturePath);
  // Configure tiling once per texture reference.
  useMemo(() => {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(tile, tile);
  }, [texture, tile]);

  return (
    <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[sizeM, sizeM]} />
      <meshStandardMaterial map={texture} roughness={0.95} metalness={0} />
    </mesh>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `cd /e/BEQSAN.IVA.GE/FRONT && pnpm --filter @beqsan/web typecheck 2>&1 | tail -5`
Expected: clean. The `useTexture` import resolves via the existing Drei dep; no runtime failures yet since the texture asset isn't referenced.

- [ ] **Step 4: Commit Task 7**

```bash
git add FRONT/apps/web/src/features/configurator/3d/rooms/props/TreeSilhouette.tsx \
        FRONT/apps/web/src/features/configurator/3d/rooms/props/GroundPlane.tsx
git commit -m "$(cat <<'EOF'
feat(rooms): exterior props — TreeSilhouette + GroundPlane

Two leaf primitives for HouseExterior. TreeSilhouette is a stylised
trunk + foliage cone; the textured-alpha-billboard upgrade waits for a
real art asset. GroundPlane reads its diffuse texture by path so any
exterior-style preset can swap (grass, dirt, etc.) without forking.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Veranda props — `GlassRailing`, `WoodVault`, `SeaBackdrop`

**Files:**
- Create: `FRONT/apps/web/src/features/configurator/3d/rooms/props/GlassRailing.tsx`
- Create: `FRONT/apps/web/src/features/configurator/3d/rooms/props/WoodVault.tsx`
- Create: `FRONT/apps/web/src/features/configurator/3d/rooms/props/SeaBackdrop.tsx`

- [ ] **Step 1: `GlassRailing.tsx` — transparent panel + posts + top rail**

```tsx
/**
 * GlassRailing — low transparent panel with vertical metal posts and a
 * thin top rail. Used at the front edge of the VerandaSeaside deck so
 * the user reads the sea/sky as "outside" beyond the veranda.
 */
export type GlassRailingProps = {
  /** Railing length along x in metres. Default 4 m matches the spec deck. */
  lengthM?: number;
  /** Total railing height in metres. Default 1 m. */
  heightM?: number;
  /** When true, posts and top rail are skipped — just the glass panel. */
  lowDetail?: boolean;
};

export function GlassRailing({
  lengthM = 4,
  heightM = 1,
  lowDetail = false,
}: GlassRailingProps) {
  const postCount = 5;
  const postSpacingM = lengthM / (postCount - 1);

  return (
    <group>
      {/* Glass panel */}
      <mesh position={[0, heightM / 2, 0]}>
        <planeGeometry args={[lengthM, heightM]} />
        <meshPhysicalMaterial
          transmission={0.95}
          ior={1.52}
          thickness={0.005}
          roughness={0.04}
          transparent
          opacity={0.5}
        />
      </mesh>

      {!lowDetail ? (
        <>
          {/* Posts */}
          {Array.from({ length: postCount }, (_, i) => (
            <mesh
              key={i}
              position={[-lengthM / 2 + i * postSpacingM, heightM / 2, 0]}
              castShadow
            >
              <cylinderGeometry args={[0.015, 0.015, heightM, 8]} />
              <meshStandardMaterial color="#8a8a8a" metalness={0.8} roughness={0.3} />
            </mesh>
          ))}
          {/* Top rail */}
          <mesh position={[0, heightM + 0.02, 0]} castShadow>
            <boxGeometry args={[lengthM, 0.04, 0.04]} />
            <meshStandardMaterial color="#8a8a8a" metalness={0.8} roughness={0.3} />
          </mesh>
        </>
      ) : null}
    </group>
  );
}
```

- [ ] **Step 2: `WoodVault.tsx` — pergola lattice (beams + cross-beams)**

```tsx
/**
 * WoodVault — overhead wooden pergola lattice for the VerandaSeaside
 * preset. Renders 6 main beams along z plus 2 perpendicular cross-beams
 * along x. Skipped entirely in lowDetail mode (the beam count is the
 * most expensive part of the veranda preset).
 */
export type WoodVaultProps = {
  /** Vault width along x in metres. */
  widthM?: number;
  /** Vault depth along z in metres. */
  depthM?: number;
  /** Mounting height of the vault above the deck, in metres. */
  heightM?: number;
};

export function WoodVault({
  widthM = 5,
  depthM = 4,
  heightM = 2.8,
}: WoodVaultProps) {
  const beamCount = 6;
  const beamSpacingM = depthM / (beamCount - 1);
  const beamSection = 0.08;

  return (
    <group position={[0, heightM, 0]}>
      {/* Main beams running along x */}
      {Array.from({ length: beamCount }, (_, i) => (
        <mesh
          key={`main-${i}`}
          position={[0, 0, -depthM / 2 + i * beamSpacingM]}
          castShadow
        >
          <boxGeometry args={[widthM, beamSection, beamSection]} />
          <meshStandardMaterial color="#5A3D28" roughness={0.85} />
        </mesh>
      ))}
      {/* Cross-beams running along z (front + back) */}
      {[-depthM / 2, depthM / 2].map((z, i) => (
        <mesh
          key={`cross-${i}`}
          position={[0, beamSection, z]}
          castShadow
        >
          <boxGeometry args={[beamSection, beamSection, depthM]} />
          <meshStandardMaterial color="#5A3D28" roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}
```

- [ ] **Step 3: `SeaBackdrop.tsx` — gradient plane for distant sea + sky**

```tsx
import { useMemo } from 'react';
import { CanvasTexture, LinearFilter } from 'three';

/**
 * SeaBackdrop — large distant plane with a baked vertical gradient that
 * reads as "sky transitioning to sea at the horizon". A canvas-generated
 * texture (drawn once into a CanvasTexture) keeps the asset out of the
 * git tree — no PNG file needed.
 *
 * Positioned far away (z = -15 m by default) so the parallax tells the
 * brain "this is the open horizon", not "this is a wall behind me".
 */
export type SeaBackdropProps = {
  /** Plane width in metres. */
  widthM?: number;
  /** Plane height in metres. */
  heightM?: number;
};

export function SeaBackdrop({ widthM = 30, heightM = 12 }: SeaBackdropProps) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx === null) {
      throw new Error('SeaBackdrop: 2D context not available');
    }
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    // Sky → distant haze → sea
    grad.addColorStop(0.0, '#A8C8E8');  // pale sky
    grad.addColorStop(0.55, '#D8E0E0'); // haze at horizon
    grad.addColorStop(0.6, '#6A8DA8');  // sea start
    grad.addColorStop(1.0, '#1F4868');  // deep sea
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const tex = new CanvasTexture(canvas);
    tex.minFilter = LinearFilter;
    tex.magFilter = LinearFilter;
    return tex;
  }, []);

  return (
    <mesh position={[0, heightM / 2 - 1.5, -15]}>
      <planeGeometry args={[widthM, heightM]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}
```

- [ ] **Step 4: Typecheck + build**

```bash
cd /e/BEQSAN.IVA.GE/FRONT && pnpm --filter @beqsan/web build 2>&1 | tail -10
```

Expected: clean build.

- [ ] **Step 5: Commit Task 8**

```bash
git add FRONT/apps/web/src/features/configurator/3d/rooms/props/GlassRailing.tsx \
        FRONT/apps/web/src/features/configurator/3d/rooms/props/WoodVault.tsx \
        FRONT/apps/web/src/features/configurator/3d/rooms/props/SeaBackdrop.tsx
git commit -m "$(cat <<'EOF'
feat(rooms): veranda props — GlassRailing, WoodVault, SeaBackdrop

Three leaf primitives for VerandaSeaside. GlassRailing is the standard
transmissive glass panel with brushed posts and top rail; lowDetail
strips posts+rail. WoodVault renders a pergola lattice (6 beams + 2
cross-beams) and is skipped on mobile. SeaBackdrop bakes a vertical
sky→sea gradient into a CanvasTexture in-memory so no PNG ships with
the build.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Texture assets — download CC0 from Poly Haven

**Files:**
- Create: `FRONT/apps/web/public/textures/apartment/<files>`
- Create: `FRONT/apps/web/public/textures/exterior/<files>`
- Create: `FRONT/apps/web/public/textures/veranda/<files>`

CC0 means no attribution required, but we record sources in [docs/credits.md](../../credits.md) (the file is created if it doesn't exist) as good practice.

- [ ] **Step 1: Pick concrete Poly Haven asset slugs**

The Poly Haven catalogue is browseable at `https://polyhaven.com/textures`. Sprint A needs three diffuse + matching normal + ARM (ambient/roughness/metallic combined) maps. Pick assets whose visual characteristics match the spec:

| Preset | Slot | Visual brief | Candidate slug |
|---|---|---|---|
| apartment | floor parquet | medium-tone oak parquet, worn but clean | `wood_floor` or `oak_veneer_01` |
| exterior | facade plaster | painted matte plaster, warm cream | `painted_plaster_wall` or `painted_concrete` |
| exterior | ground grass | dry coastal grass, medium green | `aerial_grass_rock` or `meadow_2` |
| veranda | wooden deck | wooden planks, medium tone | `wood_planks` or `weathered_planks` |

The above are suggestions. Browse Poly Haven, pick the assets that match the brief best, and update the filenames in subsequent tasks. Record the final choices below before downloading:

```
APARTMENT_FLOOR_SLUG=<fill in>
EXTERIOR_FACADE_SLUG=<fill in>
EXTERIOR_GROUND_SLUG=<fill in>
VERANDA_DECK_SLUG=<fill in>
```

- [ ] **Step 2: Download each set (1K JPG, diffuse + normal + ARM)**

For each slug, the Poly Haven 1K JPG URLs follow:

```
https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/<SLUG>/<SLUG>_diff_1k.jpg
https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/<SLUG>/<SLUG>_nor_gl_1k.jpg
https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/<SLUG>/<SLUG>_arm_1k.jpg
```

Download command pattern (run from repo root, replace `<SLUG>` and `<PRESET>`):

```bash
mkdir -p FRONT/apps/web/public/textures/<PRESET>
cd FRONT/apps/web/public/textures/<PRESET>
curl -L -o <SLUG>_diff_1k.jpg "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/<SLUG>/<SLUG>_diff_1k.jpg"
curl -L -o <SLUG>_nor_gl_1k.jpg "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/<SLUG>/<SLUG>_nor_gl_1k.jpg"
curl -L -o <SLUG>_arm_1k.jpg "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/<SLUG>/<SLUG>_arm_1k.jpg"
```

Total expected size: roughly 1-2 MB per slot × 4 slots = ~5-8 MB.

- [ ] **Step 3: Verify total size and write credits.md**

```bash
du -sh FRONT/apps/web/public/textures/
```

Expected: under 8 MB. If a slot's JPG is over 2 MB, swap to a less detailed variant on Poly Haven (some assets have stylistic detail that inflates JPG even at 1K — pick a flatter one).

Create or extend `docs/credits.md`:

```markdown
# Asset Credits

## Textures (Poly Haven, CC0)

CC0 does not require attribution. We list assets here as good practice.

| Asset | URL | Used in |
|---|---|---|
| <SLUG> | https://polyhaven.com/a/<SLUG> | Apartment floor parquet |
| <SLUG> | https://polyhaven.com/a/<SLUG> | Exterior facade plaster |
| <SLUG> | https://polyhaven.com/a/<SLUG> | Exterior ground grass |
| <SLUG> | https://polyhaven.com/a/<SLUG> | Veranda wooden deck |
```

- [ ] **Step 4: Commit textures + credits**

```bash
git add FRONT/apps/web/public/textures/ docs/credits.md
git commit -m "$(cat <<'EOF'
chore(assets): CC0 Poly Haven 1K textures for room presets

Four texture sets — apartment parquet floor, exterior plaster facade,
exterior ground, veranda wooden deck — each at 1K JPG (diffuse + normal
+ ARM). Credits recorded in docs/credits.md as good practice though CC0
does not require attribution.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: `ApartmentInterior` preset

**Files:**
- Create: `FRONT/apps/web/src/features/configurator/3d/rooms/ApartmentInterior.tsx`

- [ ] **Step 1: Create the file**

Replace `<APARTMENT_FLOOR_SLUG>` with the actual slug picked in Task 9.

```tsx
import { useTexture, Environment } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { RepeatWrapping } from 'three';

import { buildFallbackWallGeometry, buildWallCutoutGeometry } from '../csg/wallCutout';
import { Plinth } from './props/Plinth';
import { Chandelier } from './props/Chandelier';
import { PlantSilhouette } from './props/PlantSilhouette';

/**
 * ApartmentInterior — a Batumi residential living room. Window or door
 * is set into the back wall via CSG cutout; left/right walls partially
 * frame the scene; floor + ceiling close the box.
 *
 * Spec: docs/superpowers/specs/2026-05-28-sprint-a-room-context-presets-design.md
 */
export type ApartmentInteriorProps = {
  widthCm: number;
  heightCm: number;
  isMobile: boolean;
};

export function ApartmentInterior({
  widthCm,
  heightCm,
  isMobile,
}: ApartmentInteriorProps) {
  const widthM = widthCm / 100;
  const heightM = heightCm / 100;

  // Back wall sizing — match the apartment baseline spec.
  const wallWidthM = Math.max(4, widthM + 2);
  const wallHeightM = Math.max(2.7, heightM + 0.9);
  const wallDepthM = 0.18;
  const sillHeightM = 0.9;

  const backWallGeometry = useMemo(() => {
    if (isMobile) {
      return buildFallbackWallGeometry({ wallWidthM, wallHeightM });
    }
    return buildWallCutoutGeometry({
      wallWidthM,
      wallHeightM,
      wallDepthM,
      openingWidthM: widthM,
      openingHeightM: heightM,
      sillHeightM,
    });
  }, [isMobile, wallWidthM, wallHeightM, wallDepthM, widthM, heightM, sillHeightM]);

  useEffect(() => {
    return () => {
      backWallGeometry.dispose();
    };
  }, [backWallGeometry]);

  // Floor — Poly Haven parquet PBR.
  const floor = useTexture({
    map: '/textures/apartment/<APARTMENT_FLOOR_SLUG>_diff_1k.jpg',
    normalMap: '/textures/apartment/<APARTMENT_FLOOR_SLUG>_nor_gl_1k.jpg',
    aoMap: '/textures/apartment/<APARTMENT_FLOOR_SLUG>_arm_1k.jpg',
  });
  useMemo(() => {
    [floor.map, floor.normalMap, floor.aoMap].forEach((t) => {
      if (t === null) return;
      t.wrapS = RepeatWrapping;
      t.wrapT = RepeatWrapping;
      t.repeat.set(2, 2);
    });
  }, [floor]);

  const wallColor = '#E8E4DC';

  return (
    <>
      {/* Image-based lighting */}
      <Environment preset="city" background={false} />

      {/* Back wall with CSG-cut opening, positioned per ADR-0005 convention. */}
      <group position={[0, -sillHeightM, -wallDepthM / 2 - 0.04]}>
        <mesh geometry={backWallGeometry} receiveShadow castShadow={!isMobile}>
          <meshPhysicalMaterial color={wallColor} metalness={0} roughness={0.9} />
        </mesh>
      </group>

      {/* Floor */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4, 4]} />
        <meshStandardMaterial
          map={floor.map ?? null}
          normalMap={floor.normalMap ?? null}
          aoMap={floor.aoMap ?? null}
          roughness={0.85}
          metalness={0}
        />
      </mesh>

      {!isMobile ? (
        <>
          {/* Left wall — plane perpendicular to back wall. */}
          <mesh position={[-2, wallHeightM / 2 - sillHeightM, 0.4]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[2, wallHeightM]} />
            <meshPhysicalMaterial color={wallColor} metalness={0} roughness={0.9} side={2} />
          </mesh>
          {/* Right wall — symmetric. */}
          <mesh position={[2, wallHeightM / 2 - sillHeightM, 0.4]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[2, wallHeightM]} />
            <meshPhysicalMaterial color={wallColor} metalness={0} roughness={0.9} side={2} />
          </mesh>
          {/* Ceiling */}
          <mesh position={[0, wallHeightM - sillHeightM, 0.4]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[4, 2]} />
            <meshPhysicalMaterial color="#FFFFFF" metalness={0} roughness={0.95} />
          </mesh>
          {/* Plinth along the front of the back wall */}
          <group position={[0, 0, -0.02]}>
            <Plinth lengthM={4} />
          </group>
          {/* Plant — to the right of the window */}
          <group position={[1.4, 0, 0.5]}>
            <PlantSilhouette scale={1.1} />
          </group>
        </>
      ) : null}

      {/* Chandelier — emissive even on mobile, point light only on desktop. */}
      <Chandelier lowDetail={isMobile} />

      {/* Daylight bleed through the window — soft cool key from +z. */}
      <directionalLight
        position={[0, 1.5, 3]}
        intensity={0.5}
        color="#A8C8FF"
        castShadow={!isMobile}
      />
      <ambientLight color="#FFE8B5" intensity={0.25} />
    </>
  );
}
```

- [ ] **Step 2: Typecheck + build**

```bash
cd /e/BEQSAN.IVA.GE/FRONT && pnpm --filter @beqsan/web build 2>&1 | tail -10
```

Expected: clean. The Scene chunk grows by ~5-10 KB.

- [ ] **Step 3: Commit Task 10**

```bash
git add FRONT/apps/web/src/features/configurator/3d/rooms/ApartmentInterior.tsx
git commit -m "$(cat <<'EOF'
feat(rooms): ApartmentInterior preset

Batumi residential living-room scene: back wall with CSG opening,
floor with Poly Haven parquet PBR, left/right walls + ceiling on
desktop, plinth + plant prop, warm 2700K chandelier with point light.
Mobile path strips the side walls, ceiling, plinth, and plant; the
chandelier emissive stays, the point light drops.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: `HouseExterior` preset

**Files:**
- Create: `FRONT/apps/web/src/features/configurator/3d/rooms/HouseExterior.tsx`

- [ ] **Step 1: Create the file**

Replace `<EXTERIOR_FACADE_SLUG>` and `<EXTERIOR_GROUND_SLUG>` with the slugs from Task 9.

```tsx
import { Environment, Sky, useTexture } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { RepeatWrapping } from 'three';

import { buildFallbackWallGeometry, buildWallCutoutGeometry } from '../csg/wallCutout';
import { TreeSilhouette } from './props/TreeSilhouette';
import { GroundPlane } from './props/GroundPlane';

/**
 * HouseExterior — private house facade seen from the street under
 * golden-hour evening light. Window or door is set into the facade via
 * CSG; ground extends forward; sky completes the frame.
 *
 * Spec: docs/superpowers/specs/2026-05-28-sprint-a-room-context-presets-design.md
 */
export type HouseExteriorProps = {
  widthCm: number;
  heightCm: number;
  isMobile: boolean;
};

export function HouseExterior({
  widthCm,
  heightCm,
  isMobile,
}: HouseExteriorProps) {
  const widthM = widthCm / 100;
  const heightM = heightCm / 100;

  // Exterior facade is wider + thicker than apartment.
  const wallWidthM = Math.max(6, widthM + 3);
  const wallHeightM = Math.max(3.5, heightM + 1.5);
  const wallDepthM = 0.22;
  const sillHeightM = 1.1;

  const facadeGeometry = useMemo(() => {
    if (isMobile) {
      return buildFallbackWallGeometry({ wallWidthM, wallHeightM });
    }
    return buildWallCutoutGeometry({
      wallWidthM,
      wallHeightM,
      wallDepthM,
      openingWidthM: widthM,
      openingHeightM: heightM,
      sillHeightM,
    });
  }, [isMobile, wallWidthM, wallHeightM, wallDepthM, widthM, heightM, sillHeightM]);

  useEffect(() => {
    return () => {
      facadeGeometry.dispose();
    };
  }, [facadeGeometry]);

  const facade = useTexture({
    map: '/textures/exterior/<EXTERIOR_FACADE_SLUG>_diff_1k.jpg',
    normalMap: '/textures/exterior/<EXTERIOR_FACADE_SLUG>_nor_gl_1k.jpg',
    aoMap: '/textures/exterior/<EXTERIOR_FACADE_SLUG>_arm_1k.jpg',
  });
  useMemo(() => {
    [facade.map, facade.normalMap, facade.aoMap].forEach((t) => {
      if (t === null) return;
      t.wrapS = RepeatWrapping;
      t.wrapT = RepeatWrapping;
      t.repeat.set(2, 1.5);
    });
  }, [facade]);

  return (
    <>
      <Environment preset="sunset" background={false} />

      {/* Sky — drei's <Sky> on desktop; static plane fallback on mobile. */}
      {!isMobile ? (
        <Sky distance={450000} sunPosition={[5, 1, 5]} inclination={0.3} azimuth={0.25} />
      ) : (
        <mesh position={[0, 6, -10]}>
          <planeGeometry args={[30, 15]} />
          <meshBasicMaterial color="#FFB870" />
        </mesh>
      )}

      {/* Facade with CSG-cut opening. Slightly warm-shifted tint over the
          plaster diffuse to read as cream paint under golden hour. */}
      <group position={[0, -sillHeightM, -wallDepthM / 2 - 0.04]}>
        <mesh geometry={facadeGeometry} receiveShadow castShadow={!isMobile}>
          <meshStandardMaterial
            color="#D8C9A8"
            map={facade.map ?? null}
            normalMap={facade.normalMap ?? null}
            aoMap={facade.aoMap ?? null}
            roughness={0.9}
            metalness={0}
          />
        </mesh>
      </group>

      {/* Ground */}
      <GroundPlane
        diffuseTexturePath={'/textures/exterior/<EXTERIOR_GROUND_SLUG>_diff_1k.jpg'}
        sizeM={isMobile ? 8 : 12}
        tile={isMobile ? 2 : 4}
      />

      {/* Two flanking trees on desktop only. */}
      {!isMobile ? (
        <>
          <group position={[-2.5, 0, 0.8]}>
            <TreeSilhouette scale={1.2} />
          </group>
          <group position={[2.5, 0, 0.8]}>
            <TreeSilhouette scale={1.0} />
          </group>
        </>
      ) : null}

      {/* Golden hour key light. */}
      <directionalLight
        position={[5, 3, 5]}
        intensity={1.6}
        color="#FFB870"
        castShadow={!isMobile}
      />
      <hemisphereLight args={['#A8C8FF', '#5A4830', 0.5]} />
    </>
  );
}
```

- [ ] **Step 2: Typecheck + build**

```bash
cd /e/BEQSAN.IVA.GE/FRONT && pnpm --filter @beqsan/web build 2>&1 | tail -10
```

Expected: clean. The Scene chunk may grow by ~10-20 KB due to drei `<Sky>` shader. If the chunk exceeds 1.1 MB, swap `<Sky>` for the static gradient fallback even on desktop and revisit in Sprint B.

- [ ] **Step 3: Commit Task 11**

```bash
git add FRONT/apps/web/src/features/configurator/3d/rooms/HouseExterior.tsx
git commit -m "$(cat <<'EOF'
feat(rooms): HouseExterior preset

Private house facade under golden-hour evening light. Facade with CSG
opening + Poly Haven plaster PBR (warm-tinted); ground plane with
grass texture; sky via drei <Sky> on desktop, flat warm plane on
mobile; two flanking TreeSilhouettes on desktop; directional key
warm-light + cool sky fill.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: `VerandaSeaside` preset

**Files:**
- Create: `FRONT/apps/web/src/features/configurator/3d/rooms/VerandaSeaside.tsx`

- [ ] **Step 1: Create the file**

Replace `<VERANDA_DECK_SLUG>` with the slug from Task 9.

```tsx
import { Environment, useTexture } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { RepeatWrapping } from 'three';

import { buildFallbackWallGeometry, buildWallCutoutGeometry } from '../csg/wallCutout';
import { GlassRailing } from './props/GlassRailing';
import { WoodVault } from './props/WoodVault';
import { SeaBackdrop } from './props/SeaBackdrop';

/**
 * VerandaSeaside — covered wooden veranda overlooking the Black Sea
 * under late-morning daylight. Back wall hosts the window/door via
 * CSG; wooden deck floor; pergola lattice overhead; glass railing at
 * the front edge; gradient sea backdrop in the distance.
 *
 * Spec: docs/superpowers/specs/2026-05-28-sprint-a-room-context-presets-design.md
 */
export type VerandaSeasideProps = {
  widthCm: number;
  heightCm: number;
  isMobile: boolean;
};

export function VerandaSeaside({
  widthCm,
  heightCm,
  isMobile,
}: VerandaSeasideProps) {
  const widthM = widthCm / 100;
  const heightM = heightCm / 100;

  // Back wall — same baseline as apartment but a slightly warmer plaster.
  const wallWidthM = Math.max(4, widthM + 2);
  const wallHeightM = Math.max(2.7, heightM + 0.9);
  const wallDepthM = 0.18;
  const sillHeightM = 0.9;

  const backWallGeometry = useMemo(() => {
    if (isMobile) {
      return buildFallbackWallGeometry({ wallWidthM, wallHeightM });
    }
    return buildWallCutoutGeometry({
      wallWidthM,
      wallHeightM,
      wallDepthM,
      openingWidthM: widthM,
      openingHeightM: heightM,
      sillHeightM,
    });
  }, [isMobile, wallWidthM, wallHeightM, wallDepthM, widthM, heightM, sillHeightM]);

  useEffect(() => {
    return () => {
      backWallGeometry.dispose();
    };
  }, [backWallGeometry]);

  const deck = useTexture({
    map: '/textures/veranda/<VERANDA_DECK_SLUG>_diff_1k.jpg',
    normalMap: '/textures/veranda/<VERANDA_DECK_SLUG>_nor_gl_1k.jpg',
    aoMap: '/textures/veranda/<VERANDA_DECK_SLUG>_arm_1k.jpg',
  });
  useMemo(() => {
    [deck.map, deck.normalMap, deck.aoMap].forEach((t) => {
      if (t === null) return;
      t.wrapS = RepeatWrapping;
      t.wrapT = RepeatWrapping;
      t.repeat.set(2, 1.5);
    });
  }, [deck]);

  return (
    <>
      <Environment preset="dawn" background={false} />

      {/* Sea backdrop on desktop only — the parallax cue helps the brain
          read it as "horizon far away" rather than "wall behind me". */}
      {!isMobile ? <SeaBackdrop /> : null}

      {/* Back wall with CSG opening. */}
      <group position={[0, -sillHeightM, -wallDepthM / 2 - 0.04]}>
        <mesh geometry={backWallGeometry} receiveShadow castShadow={!isMobile}>
          <meshPhysicalMaterial color="#E8DCC8" metalness={0} roughness={0.9} />
        </mesh>
      </group>

      {/* Deck floor — runs forward from the back wall. */}
      <mesh position={[0, 0, 1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5, 4]} />
        <meshStandardMaterial
          map={deck.map ?? null}
          normalMap={deck.normalMap ?? null}
          aoMap={deck.aoMap ?? null}
          roughness={0.8}
          metalness={0}
        />
      </mesh>

      {/* Pergola vault — desktop only. */}
      {!isMobile ? <WoodVault widthM={5} depthM={4} heightM={2.8} /> : null}

      {/* Glass railing at front edge of deck. */}
      <group position={[0, 0, 2.8]}>
        <GlassRailing lengthM={4} heightM={1} lowDetail={isMobile} />
      </group>

      {/* Bright daylight key + warm bounce. */}
      <directionalLight
        position={[3, 6, 5]}
        intensity={1.8}
        color="#FFFCEC"
        castShadow={!isMobile}
      />
      <hemisphereLight args={['#A8E0FF', '#D8B080', 0.7]} />
    </>
  );
}
```

- [ ] **Step 2: Typecheck + build**

```bash
cd /e/BEQSAN.IVA.GE/FRONT && pnpm --filter @beqsan/web build 2>&1 | tail -10
```

Expected: clean.

- [ ] **Step 3: Commit Task 12**

```bash
git add FRONT/apps/web/src/features/configurator/3d/rooms/VerandaSeaside.tsx
git commit -m "$(cat <<'EOF'
feat(rooms): VerandaSeaside preset

Covered wooden veranda overlooking the Black Sea. Back wall with CSG
opening (slightly warmer plaster tint than apartment); wooden deck
floor with Poly Haven planks PBR; pergola lattice overhead on
desktop; glass railing at front edge (lowDetail strips posts+rail);
in-memory CanvasTexture sea backdrop placed far behind for parallax;
bright daylight key + sea/sand hemisphere fill.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Wire `RoomContext` dispatcher to the three presets

**Files:**
- Modify: `FRONT/apps/web/src/features/configurator/3d/rooms/RoomContext.tsx`

- [ ] **Step 1: Replace the no-op shell with the real dispatcher**

Open `RoomContext.tsx` (from Task 2). Replace the entire file with:

```tsx
import type { PresetKind } from './presets';
import { ApartmentInterior } from './ApartmentInterior';
import { HouseExterior } from './HouseExterior';
import { VerandaSeaside } from './VerandaSeaside';

/**
 * Sprint A — Room Context dispatcher. Renders the right preset scene
 * for the chosen kind. Lasha confirmed (2026-05-28 brainstorming) that
 * the existing drag-to-rotate-world-group camera mode is preserved
 * across all presets — scenery rotates with the product.
 *
 * Spec: docs/superpowers/specs/2026-05-28-sprint-a-room-context-presets-design.md
 */
export type RoomContextProps = {
  kind: PresetKind;
  widthCm: number;
  heightCm: number;
  isMobile: boolean;
};

export function RoomContext({ kind, widthCm, heightCm, isMobile }: RoomContextProps): JSX.Element | null {
  switch (kind) {
    case 'apartment':
      return <ApartmentInterior widthCm={widthCm} heightCm={heightCm} isMobile={isMobile} />;
    case 'exterior':
      return <HouseExterior widthCm={widthCm} heightCm={heightCm} isMobile={isMobile} />;
    case 'veranda':
      return <VerandaSeaside widthCm={widthCm} heightCm={heightCm} isMobile={isMobile} />;
    default: {
      // Exhaustiveness check — adding a new PresetKind will fail compile here.
      const _exhaustive: never = kind;
      void _exhaustive;
      // eslint-disable-next-line no-console
      console.warn(`RoomContext: unknown preset kind`, kind);
      return null;
    }
  }
}
```

- [ ] **Step 2: Typecheck + build**

```bash
cd /e/BEQSAN.IVA.GE/FRONT && pnpm --filter @beqsan/web build 2>&1 | tail -20
```

Expected: clean. The Scene chunk grows by the combined preset weight (~30-50 KB total).

- [ ] **Step 3: Commit Task 13**

```bash
git add FRONT/apps/web/src/features/configurator/3d/rooms/RoomContext.tsx
git commit -m "$(cat <<'EOF'
feat(rooms): wire RoomContext dispatcher to the three preset components

Replaces the no-op shell shipped in commit <first-commit-sha> with the
real switch over PresetKind. Exhaustiveness check via `never` so adding
a fourth preset later forces an update here.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Smoke test + manual verification

No commit — verification only.

- [ ] **Step 1: Start dev server in background**

```bash
cd /e/BEQSAN.IVA.GE/FRONT && pnpm --filter @beqsan/web dev
```

Wait for `Local: http://localhost:5173/`.

- [ ] **Step 2: Smoke checklist (desktop)**

Open `http://localhost:5173/configurator` in Chrome. For each chip in the segmented control at top-center, verify:

| Chip | Expected behaviour |
|---|---|
| 🚫 ფანჯარა მხოლოდ | Window/door floats against the studio gradient background. No wall, no scenery. |
| 🏢 ბინა | Back wall with CSG opening, parquet floor, side walls + ceiling, chandelier emissive sphere visible with warm light cast on nearby surfaces, plinth around base, plant on the right. |
| 🏡 კერძო სახლი | Facade with CSG opening, plaster texture warm-tinted, ground extends forward, two trees flank the facade, sky gradient (golden hour). |
| 🌅 ვერანდა | Back wall with CSG opening, wooden deck visible forward, pergola beams overhead, glass railing at front, sea gradient far in the distance. |

For each preset:
- Drag the canvas to rotate the world — the scenery should rotate with the product. The product stays centred.
- Change the width or height slider — the CSG opening should recompute and stay aligned with the window.
- Console should show no warnings about missing textures, missing keys, or invalid props. (A one-time "RoomContext: unknown preset kind" warn is a regression — file an issue.)

- [ ] **Step 3: Smoke checklist (mobile emulator)**

In Chrome DevTools, switch to a phone profile (iPhone 12 / iPhone SE). Reload `/configurator`. For each chip verify:

| Chip | Mobile expectation |
|---|---|
| 🚫 ფანჯარა მხოლოდ | Same as desktop — no scenery. |
| 🏢 ბინა | Back wall + floor + chandelier emissive only. No side walls, no ceiling, no point light, no plinth, no plant. |
| 🏡 კერძო სახლი | Facade + ground + static warm sky plane. No `<Sky>` shader. No trees. |
| 🌅 ვერანდა | Back wall + deck + simple glass panel railing. No pergola, no sea backdrop. |

If FPS appears to drop below 60 fps on the emulator profile, the device's CPU throttling makes this a noisy signal — the real test is on a physical iPhone 12 (ADR-0005 § Mobile fallback verification). The emulator is a sanity check only.

- [ ] **Step 4: Stop the dev server**

Send `Ctrl+C` to the dev server terminal.

- [ ] **Step 5: Document any issues found**

If any smoke check fails, do not deploy. Open `docs/questions.md` (or create a follow-up plan) and capture the failure precisely. Otherwise proceed to Task 15.

---

## Task 15: Production deploy

Per `project-deployment-layout` memory (production runs on this Windows Server 2022 box, IIS at `C:\inetpub\wwwroot\BEQSAN.IVA.GE\`).

- [ ] **Step 1: Final build**

```bash
cd /e/BEQSAN.IVA.GE/FRONT && pnpm --filter @beqsan/web build 2>&1 | tail -10
```

Expected: `✓ built in <N>s`. Confirm no error or warning lines.

- [ ] **Step 2: Push the commits to main**

```bash
git push origin main 2>&1 | tail -10
```

Expected: `<old-sha>..<new-sha>  main -> main`. CI runs `build.yml` automatically — verify in `https://github.com/Batumski-A/BEQSAN.IVA.GE/actions` that it goes green.

- [ ] **Step 3: Backup the current production FRONT**

```bash
TS=$(date +%Y-%m-%d_%H%M)
cp -r "C:/inetpub/wwwroot/BEQSAN.IVA.GE/FRONT" "C:/inetpub/wwwroot/BEQSAN.IVA.GE/FRONT_backup_${TS}"
du -sh "C:/inetpub/wwwroot/BEQSAN.IVA.GE/FRONT_backup_${TS}"
```

Expected: ~18-30 MB depending on accumulated texture assets.

- [ ] **Step 4: Deploy — copy `dist/.` preserving `.well-known/`**

```bash
cp -r /e/BEQSAN.IVA.GE/FRONT/apps/web/dist/. "C:/inetpub/wwwroot/BEQSAN.IVA.GE/FRONT/"
```

The trailing `/.` is required — preserves the existing `.well-known/acme-challenge/` directory in the destination.

- [ ] **Step 5: Verify the deploy**

```bash
# .well-known preserved
ls "C:/inetpub/wwwroot/BEQSAN.IVA.GE/FRONT/.well-known/acme-challenge" | head -3
# index.html freshly stamped
stat -c '%y  %s bytes  %n' "C:/inetpub/wwwroot/BEQSAN.IVA.GE/FRONT/index.html"
# live site serves new index
curl -sSI "https://beqsan.iva.ge/index.html?bust=$(date +%s)" --max-time 10 2>&1 | grep -iE '(http|last-mod)' | head -3
# new chunk hash appears in index.html
grep -oE '"/assets/[a-zA-Z0-9_-]+\.js"' "C:/inetpub/wwwroot/BEQSAN.IVA.GE/FRONT/index.html" | sort -u
```

Expected:
- `.well-known/acme-challenge` directory still present.
- `index.html` `Last-Modified` matches the current minute.
- Live `curl` returns the same hashes that appear in the deployed `index.html`.
- API still healthy: `curl -sS "https://iva.ge:5299/api/v1/health" --max-time 10` → `{"status":"ok",...}`.

- [ ] **Step 6: Production smoke test**

Open `https://beqsan.iva.ge/configurator` in a real browser (not the dev server). Step through each chip again. Confirm the same behaviour observed in Task 14 desktop checklist.

- [ ] **Step 7: Report**

Status update to Lasha with:
- Commits shipped (SHAs).
- Production URL.
- The backup directory path (so a rollback can be done with a single `mv`).
- Any remaining open questions logged from the smoke tests.

---

## Self-review log

After writing the plan above, I checked it against the spec:

**Spec coverage** — every spec requirement maps to a task:

| Spec section | Plan task |
|---|---|
| File layout (rooms/, presets.ts, RoomContext, 3 presets, 8 props) | Tasks 1, 2, 6, 7, 8, 10, 11, 12, 13 |
| Type contract (PresetKind, PresetMetadata, PRESETS) | Task 1 |
| Dispatcher contract | Task 2 (shell) + Task 13 (real) |
| State + UI changes (LiveStudio + Scene) | Tasks 4, 5 |
| Per-preset spec (apartment / exterior / veranda) | Tasks 10, 11, 12 |
| Texture asset pipeline (Poly Haven CC0) | Task 9 |
| i18n | Task 3 |
| Mobile detection / lowDetail per preset | embedded in each preset task |
| Accessibility (radio-group, aria-live) | Task 5 |
| Performance budget verification | Task 14 |
| Error handling (graceful degrade) | embedded in preset code (fallback paths) |
| Testing strategy (smoke checklist, no Vitest) | Task 14 |
| Rollout (backup + cp + verify) | Task 15 |

No gaps.

**Placeholder scan** — the only `<SLUG>` placeholders are in Tasks 9, 10, 11, 12 and they are explicitly tied to a Task 9 step that picks them. Not the "TBD / add appropriate error handling" anti-pattern — they're parametric inputs the implementer resolves once on Poly Haven. The plant-silhouette art asset is explicitly deferred in the spec § Open questions; the prop ships with a stylised-cone fallback so no `TODO` lingers in the code.

**Type consistency** — function/property names line up across tasks:
- `PresetKind` / `PresetMetadata` / `PRESETS` (Task 1) → used in 2, 4, 5, 13.
- `RoomContextProps { kind, widthCm, heightCm, isMobile }` (Task 2) → matched by Task 13 dispatcher signature and by each preset's own `*Props`.
- `buildWallCutoutGeometry` / `buildFallbackWallGeometry` (existing ADR-0005 helpers) → consumed unchanged.
- `roomPreset: PresetKind | null` prop on Scene (Task 4) → matched by LiveStudio pass-through (Task 5).

No drift.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-28-sprint-a-room-context-presets.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best for the 15-task plan above because: (a) tasks 6, 7, 8 (the three prop groups) are independent and can run in parallel; (b) tasks 10, 11, 12 (the three presets) are independent after Task 9 lands; (c) fresh-context subagents make fewer mistakes on the texture-slug substitution work.

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints for review. Best if Lasha wants every step visible in one log.

Which approach?
