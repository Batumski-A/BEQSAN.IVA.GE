# Skill: configurator-architecture

**Trigger:** any work touching `FRONT/src/features/configurator/`.

**Source:** [docs/kickoff.md §6, §13](../../../docs/kickoff.md).

---

## The contract

The configurator is the product. It has 9 steps, a Zustand store, a server-truthed price, and a draft persistence layer. Get this contract right and the rest follows.

## State shape (Zustand)

```ts
type ConfiguratorState = {
  step: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  productType: 'window' | 'door' | 'sliding' | 'panoramic' | 'balcony';
  material: { id: string; profileSystemId: string };
  dimensions: {
    widthCm: number;
    heightCm: number;
    shape: 'rect' | 'arch' | 'trap' | 'custom';
  };
  customShape?: {
    points: Array<{ x: number; y: number }>;
    edgeLengthsCm: number[];
  };
  layout: { panes: Pane[] };
  glass: { typeId: string; count: 1 | 2 | 3 | 4; extras: GlassExtra[] };
  color: { id: string; ralCode?: string; lamination?: 'outside' | 'both' };
  accessories: Accessory[];
  pricing: {
    materialCost: number;
    glassCost: number;
    accessoryCost: number;
    installCost: number;
    vat: number;
    total: number;
    breakdown: PriceLine[];
  };
  // session
  draftId?: string;
  lastSavedAt?: number;
};
```

## Source-of-truth rules

- **Price is server-truthed.** The client mirrors the formula for instant feedback. On every meaningful change (debounced 400ms), `POST /api/v1/configurator/price` returns the authoritative breakdown.
- **At submit time, the server recalculates** the price and rejects if the client value drifted > 0.5%.
- **3D scene parameters derive purely from state.** No imperative scene mutation. The store changes → R3F re-renders.
- **Each step is route-addressable** (`/configurator?step=4`). Back-button works. SMS recovery links land on the right step.
- **Drafts auto-save** after every 5 seconds of inactivity or step transition, whichever comes first. `draftId` is generated server-side on first save.

## Step transitions (guards)

```
1 → 2: productType selected
2 → 3: material + profileSystem selected
3 → 4: dimensions valid (rect: width&height in range; custom: shape closed)
4 → 5: every pane has an opening_type, no overlapping panes
5 → 6: glass.typeId and count chosen
6 → 7: color chosen (RAL valid if used)
7 → 8: (accessories all optional)
8 → 9: review acknowledged
9   : phone provided, SMS code verified
```

A user can navigate **back** freely. **Forward** only after guard passes.

## Folder layout

```
FRONT/src/features/configurator/
├── 3d/
│   ├── Scene.tsx               # R3F Canvas root
│   ├── WindowMesh.tsx
│   ├── DoorMesh.tsx
│   ├── Lighting.tsx
│   └── Materials.ts            # PBR material factory
├── steps/
│   ├── StepType.tsx
│   ├── StepMaterial.tsx
│   ├── StepDimensions.tsx      # 3 sub-modes: manual, photo-ai, draw
│   ├── StepLayout.tsx
│   ├── StepGlass.tsx
│   ├── StepColor.tsx
│   ├── StepAccessories.tsx
│   ├── StepReview.tsx
│   └── StepOrder.tsx
├── canvas/
│   ├── ShapeDrawer.tsx         # Konva — custom shapes
│   └── PhotoMeasure.tsx        # camera + reference marking
├── photo-ai/
│   ├── DimensionEstimator.tsx
│   └── api.ts                  # POST /ai/estimate-dimensions
├── pricing/
│   ├── formula.ts              # client-side mirror
│   └── DiffDisplay.tsx
├── store.ts                    # Zustand
├── schema.ts                   # Zod validators per step
└── navigation.ts               # transition guards
```

## Persistence flow

1. User changes any field → store updates immediately.
2. Debounced 400ms → `POST /configurator/price` with current state. Update `pricing` slice.
3. Every 5s OR step transition → `POST /configurator/draft` with full state. Store returns `draftId`.
4. On submit (step 9) → `POST /configurator/submit` with `draftId` + verified phone. Server creates `Order`, returns `orderCode`. User redirected to `/order/:phone/:orderCode`.

## SMS recovery

- After 24h of inactivity on a draft, user gets an SMS: `„შენი კონფიგურაცია შენახულია. გააგრძელე: beqsan.iva.ge/c/{draftId}"`
- Visiting that URL rehydrates the store from the server draft.

## Pricing mirror (client formula)

The client formula is **identical in shape** to the server, but the server's prices are the source. Use the mirror only for sub-second feedback while the server response is pending.

```ts
// pricing/formula.ts (simplified)
export function mirrorPrice(state: ConfiguratorState, rules: PricingRules): PriceLine[] {
  const areaM2 = (state.dimensions.widthCm * state.dimensions.heightCm) / 10_000;
  const base = rules.materialPerM2[state.material.id] * areaM2;
  const glass = rules.glassPerM2[state.glass.typeId] * areaM2 * state.glass.count;
  const accessories = state.accessories.reduce((acc, a) => acc + rules.accessories[a.id], 0);
  const color = state.color.ralCode ? rules.colorPerM2.ral * areaM2 : 0;
  return [
    { label: 'მასალა', amount: base },
    { label: 'მინა', amount: glass },
    { label: 'ფერი', amount: color },
    { label: 'აქსესუარები', amount: accessories },
  ];
}
```

When the server response arrives, `DiffDisplay` shows the delta (if any) with a 600ms slide animation. If diff is > 1%, log to telemetry — the client formula needs updating.

## 3D scene integration

- `Scene.tsx` reads `ConfiguratorState` from Zustand (selectors only — don't subscribe to the whole store).
- Geometry/materials derive from state via memoized factories.
- Color changes apply via material `color` prop, not by swapping the mesh.
- Open/close anim uses the `mechanical` spring (see [3d-scene-design](../3d-scene-design/SKILL.md)).

## Anti-patterns

```
❌ useState scattered across step components       → all state in Zustand store
❌ Pricing logic only in client                    → server is source of truth
❌ Imperatively mutating Three.js objects          → derive from store state
❌ Step component imports another step component   → use navigation.ts events
❌ Storing the full configuration in URL           → use draftId only
❌ Skipping draft save on step transition          → always save before navigating
❌ Allowing forward without guard pass             → forward must validate
```

## Related skills

- [3d-scene-design](../3d-scene-design/SKILL.md) — R3F scene setup, materials, performance.
- [frontend-patterns](../frontend-patterns/SKILL.md) — query keys, forms, error boundaries.
- [ai-integration](../ai-integration/SKILL.md) — photo dimension estimation endpoint.
- [georgian-ux](../georgian-ux/SKILL.md) — number formatting, phone normalization.
- [design-system](../design-system/SKILL.md) — step-indicator visuals, pricing breakdown.
