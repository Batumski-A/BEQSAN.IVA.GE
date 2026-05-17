# Skill: 3d-scene-design

**Trigger:** Three.js / React Three Fiber / GLTF / shader / material work anywhere in `FRONT/`.

**Source:** [docs/kickoff.md §9.7, §13](../../../docs/kickoff.md).

---

## Art direction

We render real products that we manufacture. The 3D scene's job is to **look like a careful product photograph**, not like a video game.

- Camera: 35mm equivalent, slight off-axis (architectural photography rule-of-thirds).
- Lighting: 3-point — key from upper-left (warm 4500K, ~85% intensity), fill from right (cool 6500K, 25%), rim from behind for material edge highlight.
- Ground: subtle reflective surface (4-6% glossiness, not a mirror).
- Background: neutral fog gradient from `--bg-elevated` to `--bg-base`.

## Camera setup (default)

```tsx
<Canvas
  camera={{ position: [2.4, 1.6, 3.2], fov: 35, near: 0.1, far: 50 }}
  dpr={[1, 2]}
  performance={{ min: 0.5 }}
  shadows
>
  <OrbitControls
    minPolarAngle={Math.PI / 3}
    maxPolarAngle={Math.PI * 0.66}
    enablePan={false}
    enableZoom
    minDistance={1.5}
    maxDistance={6}
  />
</Canvas>
```

For tiny preview cards: `OrthographicCamera`, fixed isometric angle, no controls.

## Lighting setup (use in every product scene)

```tsx
<ambientLight intensity={0.15} />
<directionalLight
  position={[5, 8, 4]} intensity={1.2}
  color="#FFE4B0" castShadow
  shadow-mapSize={[2048, 2048]}
/>  {/* key — warm */}
<directionalLight
  position={[-3, 4, -2]} intensity={0.35}
  color="#9EC4FF"
/>  {/* fill — cool */}
<directionalLight
  position={[0, 2, -5]} intensity={0.5}
  color="#FFFFFF"
/>  {/* rim */}
<Environment preset="city" background={false} />
```

## Materials (PBR — never `MeshBasicMaterial` for products)

Use `MeshPhysicalMaterial` for every product surface.

```ts
// Aluminum (brushed direction horizontal)
{
  metalness: 1.0,
  roughness: 0.25,
  anisotropy: 0.4,
  anisotropyRotation: 0,
}

// PVC white
{
  metalness: 0.05,
  roughness: 0.55,
  sheen: 0.2,
  sheenColor: '#ffffff',
}

// Glass — transmissive
{
  transmission: 0.95,
  ior: 1.52,
  thickness: 0.01,
  roughness: 0.05,
  dispersion: 0.02,
  attenuationColor: '#f0f8ff',
  attenuationDistance: 0.5,
}
```

## Performance budget (per scene)

| Target | iPhone 12 | Desktop |
|---|---|---|
| FPS | 60 | 60 |
| GLTF size (Draco) | ≤ 800 KB | ≤ 1.5 MB |
| Texture max | 2048×2048 | 2048×2048 |
| Directional lights w/ shadow | 1 (mobile) | 2 |
| Total shadow casters | 1 mesh | 3 meshes |

## Performance practices

- **Compress every GLTF with Draco:** `gltf-pipeline -i model.gltf -o model-draco.glb -d`
- **Lazy load:** `useGLTF` inside `<Suspense>`, with a `useProgress`-driven loader.
- **One `<Canvas>` per page.** Multiple meshes inside; don't stack canvases.
- **`dpr={[1, 2]}` + `performance={{ min: 0.5 }}`** for auto-quality scaling.
- **Disable shadows on mobile:**
  ```ts
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  <Canvas shadows={!isMobile}>
  ```
- **Frustum culling** is on by default — verify nothing has `frustumCulled={false}`.
- **Max 2 directional lights with shadows.** Rest must be shadowless.
- **Basis-compressed textures** where possible (KTX2 with Basis Universal).

## Animation conventions

- **Door / window opening:** `useSpring({ stiffness: 80, damping: 18, mass: 1.4 })` — the `mechanical` curve from the design system.
- **Auto-rotate previews:** `useFrame((_, delta) => meshRef.current.rotation.y += delta * 0.15)` — slow, deliberate, 4s per full rotation.
- **Color transitions:** lerp over 400ms (in render loop, not via animation library — material `color.lerp` is cheap).
- **Material swatch swap:** instant. The user expects immediate feedback when picking a color.

## Configurator-specific rules

- Geometry params (width, height, panes, opening side) **derive from Zustand state** — see [configurator-architecture](../configurator-architecture/SKILL.md).
- One `Suspense` boundary at the Canvas level with a Georgian loading message: `„3D სცენა იტვირთება..."`.
- 3D camera responds to step changes with a 600ms `mechanical` ease (subtle re-frame on Step 4 → 5, etc.).
- Provide a **text-equivalent control panel** beside the canvas so screen-reader users get the same options (see [accessibility](../accessibility/SKILL.md)).

## File organization

```
FRONT/src/features/configurator/3d/
├── Scene.tsx             # root <Canvas>
├── WindowMesh.tsx        # parameterized window geometry
├── DoorMesh.tsx          # parameterized door geometry
├── SlidingMesh.tsx
├── PanoramicMesh.tsx
├── BalconyMesh.tsx
├── Materials.ts          # PBR material factories (aluminum, pvc, glass variants)
├── Lighting.tsx          # 3-point setup
├── Camera.tsx            # default rig + OrbitControls
├── Loader.tsx            # Suspense fallback w/ progress
└── hooks/
    ├── useOpenSpring.ts  # door/window hinge animation
    └── useAutoRotate.ts
```

`/public/3d/` holds Draco-compressed `.glb` base models per type.

## Anti-patterns

```
❌ MeshBasicMaterial on a product surface           → use MeshPhysicalMaterial
❌ Multiple <Canvas> on the same page               → one canvas, multiple meshes
❌ Uncompressed GLTF (.gltf with separate .bin)      → Draco-compress to .glb
❌ Imperative scene.add(mesh)                       → declare via R3F JSX
❌ 4+ directional lights with shadow                → max 2 with shadow
❌ Shadow maps > 2048                               → 2048 is the cap
❌ Loading every model upfront                      → lazy + Suspense
❌ 360° vertical orbit (camera flips upside down)   → clamp polarAngle
❌ Linear interpolation on the door hinge           → use spring physics
```

## Related skills

- [configurator-architecture](../configurator-architecture/SKILL.md) — state shape that drives the scene.
- [design-system](../design-system/SKILL.md) — material tokens, motion easing.
- [performance-optimization](../performance-optimization/SKILL.md) — bundle and runtime audits.
- [accessibility](../accessibility/SKILL.md) — text-equivalent controls for the 3D scene.
