# ADR-0005: Pascal Editor rejected as dependency; `three-bvh-csg` adopted for product geometry

- **Date:** 2026-05-28
- **Status:** Accepted
- **Decider:** Claude (per [feedback-infra-decisions-self-made](../../) — Lasha delegated package-choice calls)
- **Supersedes:** none. **Superseded by:** none.
- **Source prompt:** Lasha asked whether [pascalorg/editor](https://github.com/pascalorg/editor) could be installed and used as a foundation for the BEQSAN configurator preview surface. This ADR records the answer and the narrower adoption that actually pays off.

## Context

[pascalorg/editor](https://github.com/pascalorg/editor) is a popular (16.3k★, MIT, active) open-source 3D architectural editor — a SketchUp / Sweet Home 3D-style tool for designing whole buildings. It runs on Next.js 16 + React 19 + Three.js + WebGPU + React Three Fiber + Drei + Zustand + three-bvh-csg + Zod, structured as a Turborepo monorepo with hierarchical scene state (`Site → Building → Level → Zone → Items`).

BEQSAN's configurator is a fundamentally different shape:

| Dimension | Pascal Editor | BEQSAN configurator |
|---|---|---|
| Scope | Whole buildings (walls, levels, zones, furniture) | One product (one window or door) |
| State shape | Hierarchical tree of architectural entities | Flat Zustand store: material → dimensions → panes → opening → hinge → color → glass → accessories |
| User goal | Design a space | Get a defensible price + send order |
| Frontend stack | Next.js 16, React 19 | Vite 5, React 18 |
| Renderer | WebGPU (no Safari support yet) | WebGL via R3F (Safari OK) |
| Customer device | Desktop-first architectural workflow | Mobile-first (iPhone-dominant Batumi market) |

The mismatch is structural, not cosmetic. Adopting Pascal Editor as a dependency or fork would require either (a) gutting most of its building-scale features and bending its hierarchical state into our flat configurator model, or (b) reshaping BEQSAN's domain into a building-modeling tool — both of which lose months of existing work and push the product away from its actual users.

Separately, **`three-bvh-csg`** — one of Pascal Editor's component dependencies — is a standalone npm package (`gkjohnson/three-bvh-csg`, MIT) that performs Boolean operations (union, subtract, intersect) on three.js meshes using a BVH-accelerated CSG algorithm. It has no Next.js, React 19, or WebGPU requirement; it's pure three.js code. Its peer dep is `three`, which we already ship at 0.169.

`three-bvh-csg` solves real geometry problems we currently fake with overlapping boxes in [Scene.tsx](../../FRONT/apps/web/src/features/configurator/3d/Scene.tsx):

1. **Mullion grooves cut into the frame** — today our frames are unioned boxes; rebates and mullion intersections look flat.
2. **Arched and trapezoidal openings** — currently impossible without authoring custom GLTF per shape; CSG produces them parametrically from rectangle ± arch primitives.
3. **Wall cutout for the future room-context preview** — the `ai-integration` skill plans a "see the window in my room" feature; the parametric 3D variant of that flow needs a Boolean subtraction of the window opening from a wall plane.

## Decision

### Rejected

**Pascal Editor (the application / monorepo / its `@pascal/*` packages) is not adopted as a dependency, vendored module, or upstream fork.** No PRs may add Pascal Editor packages to [FRONT/apps/web/package.json](../../FRONT/apps/web/package.json) or [FRONT/package.json](../../FRONT/package.json). If a future need (e.g. multi-window "design my whole house" flow) makes building-scale modeling worth it, open a new ADR rather than reopening this one.

### Accepted

**`three-bvh-csg` is adopted as the BEQSAN parametric geometry library** for the following uses, in order of expected delivery:

1. **(Phase 1 polish, pending)** Mullion grooves in the frame mesh — replaces overlapping-box mullion rendering in [Scene.tsx](../../FRONT/apps/web/src/features/configurator/3d/Scene.tsx) with frame minus rebate slot minus mullion channel. Improves perceived product realism without changing the price calc or store shape.
2. **(Phase 1.5, pending)** Arched / trapezoidal openings — when Roman confirms the workshop builds them (currently 4–8% of orders per the conversation log).
3. **(Phase 2 — SHIPPED 2026-05-28)** Room-context preview "wall cutout" mode — companion to the existing Replicate/FLUX `ai-integration` flow. Lets the user see their configured window mounted in a parametric wall slab from inside their room, computed instantly in the browser instead of waiting on a paid AI generation. Toggle lives in [LiveStudio.tsx](../../FRONT/apps/web/src/features/configurator/LiveStudio.tsx) (`„ნახე ოთახში"` / `„მხოლოდ ფანჯარა"`), `RoomContextWall` component in [Scene.tsx](../../FRONT/apps/web/src/features/configurator/3d/Scene.tsx), CSG helper at [csg/wallCutout.ts](../../FRONT/apps/web/src/features/configurator/3d/csg/wallCutout.ts). Mobile fallback uses `buildFallbackWallGeometry` (plain plane with DoubleSide material) — see the `ai-integration` SKILL § "Parametric 3D room context (CSG path)".

### Phase 2 — manual verification still owed before user-facing rollout

The Phase 2 code is on `main` and clears typecheck + production build. The following physical-device checks were *not* run as part of shipping the code and should happen before announcing the toggle publicly:

- iPhone 12-class device: confirm 60 FPS during a width/height slider sweep with the room-context toggle on. The `isMobile` fallback should kick in and skip CSG; verify no console errors and the plain plane renders behind the window.
- iPad / desktop Safari: confirm CSG path renders correctly (no z-fighting at the opening rim, opening dimensions match window dimensions, opening centers on the window).
- TalkBack / VoiceOver: confirm the `aria-live="polite"` announcement fires when the toggle is pressed (`studio.roomContext.announceOn` / `announceOff`).
- Reduced motion: confirm the toggle has no animation overhead under `prefers-reduced-motion: reduce` (it shouldn't — the only state change is a React re-render).

### Installation

```sh
# from FRONT/
pnpm --filter @beqsan/web add three-bvh-csg@0.0.17
```

**Version pin rationale (verified at adoption time):**

| Package | Pin | Why |
|---|---|---|
| `three-bvh-csg` | `0.0.17` | The current latest `0.0.18` requires `three >= 0.179` and `three-mesh-bvh >= 0.9.7`. Our `three@^0.169` (which is itself constrained by `@react-three/drei@^9.114.3`) is incompatible. `0.0.17` requires `three >= 0.151` and `three-mesh-bvh >= 0.6.6` — both satisfied today. |
| `three` | `^0.169` | Locked by `@react-three/drei@^9`. Upgrading three to ≥ 0.179 forces drei v10 + R3F v9 — a multi-day migration with broken type signatures across the configurator. Out of scope for this ADR. |

**When we eventually upgrade `three`** (e.g. to pull in newer Drei features), `three-bvh-csg` upgrades in lockstep — bump `0.0.17` to whatever the latest version's peer-deps allow. The helper modules under `3d/csg/` import only the stable `Brush` / `Evaluator` / `SUBTRACTION` surface, which has not changed across `0.0.15` → `0.0.18`, so the upgrade is a peer-deps-only diff.

### File organization

CSG geometry helpers live alongside other 3D code:

```
FRONT/apps/web/src/features/configurator/3d/
├── Scene.tsx
├── csg/
│   ├── BrushFromBox.ts        # thin Brush wrapper for axis-aligned boxes
│   ├── frameWithRebate.ts     # frame minus glass rebate minus mullion grooves
│   ├── wallCutout.ts          # wall plane minus window opening (room context)
│   └── arches.ts              # arch / trapezoid primitives (Phase 1.5)
└── __spike__/
    └── CsgWallCutout.tsx      # POC route, DEV-only; deleted once #3 ships
```

A `Brush` is built once per geometry change (memoize via `useMemo` against the dependency set) — CSG operations are expensive enough that doing them every frame is forbidden.

## Consequences

**Positive:**
- Real mullion / rebate geometry without authoring a GLTF per pane configuration.
- Arched and trapezoidal opening shapes become parametric.
- Future room-context preview ships as a free, instant alternative to paid Replicate generations — cost ceiling on AI flow gets a non-AI fallback that's *better* for "does this fit my space" intent.
- No stack drift (Vite 5, React 18, WebGL, Safari support all preserved).
- Bundle cost: roughly +60 KB gzipped (`three-bvh-csg` + `three-mesh-bvh` minus what's already pulled in by Drei). Verified against the [performance-optimization](../../.claude/skills/performance-optimization/SKILL.md) bundle budget.

**Negative:**
- One more library to keep on the dependency dashboard. `three-bvh-csg` is single-maintainer (gkjohnson) — same maintainer as `three-mesh-bvh`, which is already a transitive dep, so the risk surface doesn't meaningfully expand.
- CSG operations cost more CPU than primitive geometry. Mitigated by memoizing Brushes per dimension change, not per render frame; mobile gets a fallback path (see Notes).
- The `frameWithRebate` helper has to stay in sync with Scene.tsx's pane layout math (`paneRects`, `frameThickness`, `innerW`). Adding integration tests against the canary pricing fixtures is cheap insurance.

## Notes

- **Mobile fallback for CSG:** if the BVH build phase pushes iPhone-12-class devices below the 60 FPS budget set by [3d-scene-design](../../.claude/skills/3d-scene-design/SKILL.md), the helper functions accept an `lowDetail: boolean` flag and skip the CSG step in favor of the current overlapping-box approximation. This is a runtime decision, not a build-time one — measure first.
- **Why not implement CSG ourselves?** `three-bvh-csg` uses three-mesh-bvh's accelerated triangle index, which is non-trivial. Re-implementing it is a multi-week project for no business value. The library is MIT — we own a vendored copy if the upstream ever goes silent.
- **Patterns from Pascal Editor we may revisit later (not now):**
  - Hierarchical Zustand store with undo/redo — relevant only if multi-window order configurations grow common enough to justify it.
  - Spatial grid for collision detection — relevant only for multi-pane vitrines or multi-window-on-a-facade flows.
  These do not justify an ADR until a feature request actually pulls them in. Recorded here so a future engineer doesn't have to re-research Pascal Editor.
- **Companion memory:** [memory/project_pascal_editor_rejected.md](../../../C:/Users/Administrator/.claude/projects/e--BEQSAN-IVA-GE/memory/project_pascal_editor_rejected.md) carries the short-form decision so Claude doesn't re-debate this in a future conversation.
