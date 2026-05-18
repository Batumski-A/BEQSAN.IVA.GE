import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { Group, PerspectiveCamera } from 'three';

import type {
  AccessorySelectionInput,
  ConfigurationPaneInput,
  HingeSide,
  PaneOpeningType,
} from '@beqsan/api-types';
import { useColorsByMaterial, useGlassTypesByMaterial, type GlassType } from '../api';
import { useConfiguratorStore } from '../store';

/**
 * Phase 1 placeholder scene. A box scaled to the configurator dimensions,
 * a glass plane in front of it, and limited orbit controls. Real GLTF
 * models from Roman's workshop photos land in Phase 1.5.
 *
 * Mobile detection turns shadows off and clamps dpr to keep iPhone 12-class
 * devices at 60fps per .claude/skills/3d-scene-design.
 */
export function ConfiguratorScene() {
  const { t } = useTranslation();
  const material = useConfiguratorStore((s) => s.material);
  const dimensions = useConfiguratorStore((s) => s.dimensions);
  const panes = useConfiguratorStore((s) => s.panes);
  const color = useConfiguratorStore((s) => s.color);
  const accessories = useConfiguratorStore((s) => s.accessories);
  const windowOpen = useConfiguratorStore((s) => s.windowOpen);
  const setWindowOpen = useConfiguratorStore((s) => s.setWindowOpen);

  // Respect prefers-reduced-motion — instant swap instead of spring lerp.
  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  // Same cache keys as StepGlass / StepColor — TanStack dedupes.
  const glassQuery = useGlassTypesByMaterial(material?.id);
  const colorsQuery = useColorsByMaterial(material?.id);
  const glassById = useMemo(
    () => new Map((glassQuery.data ?? []).map((g) => [g.id!, g])),
    [glassQuery.data],
  );
  const colorsById = useMemo(
    () => new Map((colorsQuery.data ?? []).map((c) => [c.id!, c])),
    [colorsQuery.data],
  );

  // Resolve outer + inner hex.
  // - When the user has picked a swatch, look up by id from the catalog.
  // - When ral-custom is active, the hex arrives directly on the store color.
  // - Otherwise fall back to the family-keyed neutral so the scene still
  //   renders sensibly before the colors query resolves.
  const fallbackHex = material?.family === 'aluminum' ? '#A8B3C4' : '#F4F2EE';
  const outerHex = (() => {
    if (color?.customRalHex) return color.customRalHex;
    if (color?.outerColorOptionId) {
      const c = colorsById.get(color.outerColorOptionId);
      if (c?.hexCode) return c.hexCode;
    }
    return fallbackHex;
  })();
  const innerHex = (() => {
    if (!color?.innerColorOptionId || color.innerColorOptionId === color.outerColorOptionId) {
      return outerHex;
    }
    const c = colorsById.get(color.innerColorOptionId);
    return c?.hexCode ?? outerHex;
  })();
  const hasDualColor = innerHex !== outerHex;

  const isMobile = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 768px)').matches,
    [],
  );

  // Pane layout used by both the 3D Window and the HTML overlay labels above
  // the canvas — kept here so both stay in sync as panes change.
  const w = (dimensions.widthCm / 100) * 1.0;
  const h = (dimensions.heightCm / 100) * 1.0;
  const frameThickness = 0.06;
  const innerW = w - frameThickness * 2;
  const paneRects = useMemo(() => {
    let cursor = -innerW / 2;
    return panes.map((p) => {
      const pw = innerW * p.widthRatio;
      const cx = cursor + pw / 2;
      cursor += pw;
      return { pane: p, cx, pw };
    });
  }, [panes, innerW]);

  return (
    <div className="relative aspect-square overflow-hidden rounded-sm border border-hairline bg-bg-elevated">
      <Canvas
        dpr={isMobile ? [1, 1.5] : [1, 2]}
        shadows={!isMobile}
        performance={{ min: 0.5 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        aria-hidden
      >
        <color attach="background" args={['#0A0E14']} />

        {/* Auto-fit camera to the window bounding box so the frame fills ~65%
            of viewport height regardless of dimensions. Updates whenever the
            user changes Step 3 measurements. */}
        <CameraRig widthM={w} heightM={h} />

        {/* §9.7 three-point setup, raised intensity floor + hemisphere fill
            so the aluminium frame's metalness reflections still read against
            the dark-navy background. Previous setup left the frame face
            in dim specular only — fix per audit 🔴. */}
        <hemisphereLight args={['#FFE4B5', '#1B2030', 0.5]} />
        <ambientLight intensity={0.35} />
        <directionalLight
          position={[5, 8, 4]}
          intensity={1.7}
          color="#FFEFC8"
          castShadow={!isMobile}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        {!isMobile ? (
          <>
            <directionalLight position={[-4, 4, 2]} intensity={0.55} color="#A8C8FF" />
            <directionalLight position={[0, 2, -5]} intensity={0.4} color="#FFFFFF" />
            <directionalLight position={[0, 0, 6]} intensity={0.45} color="#FFE4B5" />
          </>
        ) : null}

        <Suspense fallback={null}>
          <Wall widthCm={dimensions.widthCm} heightCm={dimensions.heightCm} />
          <Window
            family={material?.family ?? 'aluminum'}
            widthCm={dimensions.widthCm}
            heightCm={dimensions.heightCm}
            panes={panes}
            glassById={glassById}
            outerHex={outerHex}
            innerHex={innerHex}
            hasDualColor={hasDualColor}
            accessories={accessories}
            open={windowOpen}
            reducedMotion={reducedMotion}
            mobile={isMobile}
          />
          <Ground />
        </Suspense>

        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={Math.max(1.5, Math.max(w, h) * 1.4)}
          maxDistance={Math.max(6, Math.max(w, h) * 4)}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI * 0.62}
          autoRotate={!material}
          autoRotateSpeed={0.6}
        />
      </Canvas>

      {/* HTML overlay labels — one per openable pane. Mono caption, positioned
          horizontally per pane's relative x within the frame so the label
          aligns with the breathing-animated pane underneath. Pointer-events
          off so they don't block orbit drag. */}
      <PaneOverlayLabels paneRects={paneRects} widthM={w} t={t} />

      <div className="pointer-events-none absolute bottom-3 left-4 font-mono text-caption uppercase tracking-wider text-fg-tertiary">
        {dimensions.widthCm}×{dimensions.heightCm} {t('common.units.cm')}
        {material ? <span className="ml-3">· {material.slug?.toUpperCase()}</span> : null}
      </div>

      {/* Open/close toggle — only when at least one pane can move. Click
          flips the store flag; the per-pane animation runs in useFrame
          inside each AnimatedPane wrapper. */}
      {panes.some((p) => p.openingType !== 'Fixed') && (
        <button
          type="button"
          onClick={() => setWindowOpen(!windowOpen)}
          aria-pressed={windowOpen}
          aria-label={windowOpen
            ? t('configurator.steps.review.scene.closeAria')
            : t('configurator.steps.review.scene.openAria')}
          className="absolute bottom-3 right-3 inline-flex h-10 items-center gap-2 rounded-sm border border-accent-amber bg-bg-base/85 px-3 font-mono text-mono-spec uppercase tracking-wider text-accent-amber backdrop-blur transition-colors hover:bg-accent-amber hover:text-bg-base"
        >
          {windowOpen
            ? t('configurator.steps.review.scene.close')
            : t('configurator.steps.review.scene.open')}
        </button>
      )}

      <span aria-live="polite" className="sr-only">
        {windowOpen
          ? t('configurator.steps.review.scene.announceOpen')
          : t('configurator.steps.review.scene.announceClose')}
      </span>
    </div>
  );
}

function Window({
  family,
  widthCm,
  heightCm,
  panes,
  glassById,
  outerHex,
  innerHex,
  hasDualColor,
  accessories,
  open,
  reducedMotion,
  mobile,
}: {
  family: 'aluminum' | 'pvc';
  widthCm: number;
  heightCm: number;
  panes: ConfigurationPaneInput[];
  glassById: Map<string, GlassType>;
  outerHex: string;
  innerHex: string;
  hasDualColor: boolean;
  accessories: AccessorySelectionInput | null;
  open: boolean;
  reducedMotion: boolean;
  mobile: boolean;
}) {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    void delta;
  });

  // metres per cm = 0.01
  const w = (widthCm / 100) * 1.0;
  const h = (heightCm / 100) * 1.0;
  const frameThickness = 0.06;
  const mullionThickness = 0.04;
  const glassInset = 0.08;

  // Outer color drives the front-facing frame material; inner drives the
  // back-facing pieces in dual-color mode. Family controls metalness +
  // roughness (PVC matte, aluminum brushed-metal) regardless of the chosen
  // hex — paint sits on the surface, profile material stays the same.
  const frameColor = outerHex;
  const metalness = family === 'aluminum' ? 1.0 : 0.05;
  const roughness = family === 'aluminum' ? 0.25 : 0.55;

  // Build cumulative pane x-offsets (in metres, centred around 0).
  const innerW = w - frameThickness * 2;
  let cursor = -innerW / 2;
  const paneRects = panes.map((p) => {
    const pw = innerW * p.widthRatio;
    const cx = cursor + pw / 2;
    cursor += pw;
    return { pane: p, cx, pw };
  });

  // For dual-color (PVC only — guard enforced in the validator), we offset
  // the back-facing inner skin a hair behind the outer one. Visible only
  // when the camera orbits past the front-facing pose.
  const innerOffsetZ = -frameThickness * 0.55;

  return (
    <group ref={ref} position={[0, h / 2, 0]}>
      {/* Outer frame: top + bottom + left + right slabs */}
      <mesh position={[0, h / 2 - frameThickness / 2, 0]} castShadow={!mobile}>
        <boxGeometry args={[w, frameThickness, frameThickness * 1.4]} />
        <meshPhysicalMaterial color={frameColor} metalness={metalness} roughness={roughness} />
      </mesh>
      <mesh position={[0, -(h / 2) + frameThickness / 2, 0]} castShadow={!mobile}>
        <boxGeometry args={[w, frameThickness, frameThickness * 1.4]} />
        <meshPhysicalMaterial color={frameColor} metalness={metalness} roughness={roughness} />
      </mesh>
      <mesh position={[-w / 2 + frameThickness / 2, 0, 0]} castShadow={!mobile}>
        <boxGeometry args={[frameThickness, h, frameThickness * 1.4]} />
        <meshPhysicalMaterial color={frameColor} metalness={metalness} roughness={roughness} />
      </mesh>
      <mesh position={[w / 2 - frameThickness / 2, 0, 0]} castShadow={!mobile}>
        <boxGeometry args={[frameThickness, h, frameThickness * 1.4]} />
        <meshPhysicalMaterial color={frameColor} metalness={metalness} roughness={roughness} />
      </mesh>

      {/* Dual-color inner skin — thin slabs sitting just behind the outer
          frame on the inside-of-the-room side. Renders only when the user
          has picked an inner color different from the outer. */}
      {hasDualColor && (
        <group position={[0, 0, innerOffsetZ]}>
          <mesh position={[0, h / 2 - frameThickness / 2, 0]} castShadow={!mobile}>
            <boxGeometry args={[w, frameThickness, frameThickness * 0.6]} />
            <meshPhysicalMaterial color={innerHex} metalness={metalness} roughness={roughness} />
          </mesh>
          <mesh position={[0, -(h / 2) + frameThickness / 2, 0]} castShadow={!mobile}>
            <boxGeometry args={[w, frameThickness, frameThickness * 0.6]} />
            <meshPhysicalMaterial color={innerHex} metalness={metalness} roughness={roughness} />
          </mesh>
          <mesh position={[-w / 2 + frameThickness / 2, 0, 0]} castShadow={!mobile}>
            <boxGeometry args={[frameThickness, h, frameThickness * 0.6]} />
            <meshPhysicalMaterial color={innerHex} metalness={metalness} roughness={roughness} />
          </mesh>
          <mesh position={[w / 2 - frameThickness / 2, 0, 0]} castShadow={!mobile}>
            <boxGeometry args={[frameThickness, h, frameThickness * 0.6]} />
            <meshPhysicalMaterial color={innerHex} metalness={metalness} roughness={roughness} />
          </mesh>
        </group>
      )}

      {/* Step-7 accessories — sill, handles, blinds. These primitives are
          rendered as part of the same group so they translate with the
          frame on resize. Sill at bottom, handle per openable pane on the
          hinge-opposite edge, blind at top of frame (external) or just
          behind the top rail (internal). */}
      <Sill widthM={w} thicknessM={frameThickness} accessories={accessories} mobile={mobile} />
      <BlindAssembly widthM={w} heightM={h} thicknessM={frameThickness} accessories={accessories} mobile={mobile} />

      {/* Per-pane glass + opening accent tint, plus a mullion to the right of
          every pane except the last (the outer frame closes that side).
          Glass material reacts to:
            - pane.glassExtras (Frosted → roughness↑ + transmission↓;
              Tinted → amber shift + slight transmission↓; Low-E → faint
              warm shimmer; Tempered → no visual change)
            - glass.paneCount (more layers → marginally lower transmission +
              cool blue undertone for 3+ layers) */}
      {paneRects.map(({ pane, cx, pw }, i) => {
        const opening = paneTint(pane.openingType);
        const glass = pane.glassTypeId ? glassById.get(pane.glassTypeId) ?? null : null;
        const visual = glassVisualFor(opening, pane.glassExtras ?? [], glass?.paneCount ?? 2, mobile);
        // Handle: rendered on openable panes only. Per-product compat is
        // enforced by the validator; here we just need the geometry.
        const hasHandle = accessories?.handleStyleId != null
          && pane.openingType !== 'Fixed';
        return (
          <group key={pane.position} position={[cx, 0, 0]}>
            {/* Mullion sits at the frame-fixed boundary, so it's outside
                the AnimatedPane wrapper — it shouldn't swing with the
                glass. */}
            {i < paneRects.length - 1 && (
              <mesh
                position={[pw / 2, 0, 0]}
                castShadow={!mobile}
              >
                <boxGeometry args={[mullionThickness, h - frameThickness * 2, frameThickness * 1.4]} />
                <meshPhysicalMaterial color={frameColor} metalness={metalness} roughness={roughness} />
              </mesh>
            )}
            {/* Hinges live on the frame (static axis) — outside AnimatedPane
                so they don't swing with the glass. Sits forward of the frame
                so it reads against the dark window opening. */}
            <Hinges
              paneWidthM={pw}
              paneHeightM={h - frameThickness * 2}
              opening={pane.openingType}
              hingeSide={pane.hingeSide}
              mobile={mobile}
            />
            <AnimatedPane
              paneWidthM={pw}
              paneHeightM={h - frameThickness * 2}
              opening={pane.openingType}
              hingeSide={pane.hingeSide}
              open={open}
              reducedMotion={reducedMotion}
              glassInset={glassInset}
              outerFrameHeightM={h}
            >
              <mesh receiveShadow={!mobile}>
                <planeGeometry args={[Math.max(0, pw - glassInset), h - glassInset]} />
                <meshPhysicalMaterial
                  color={visual.color}
                  transparent
                  opacity={visual.opacity}
                  transmission={visual.transmission}
                  ior={1.52}
                  thickness={0.01}
                  roughness={visual.roughness}
                />
              </mesh>
              {hasHandle && (
                <Handle
                  paneWidthM={pw}
                  paneHeightM={h - frameThickness * 2}
                  hingeSide={pane.hingeSide}
                  opening={pane.openingType}
                  mobile={mobile}
                />
              )}
            </AnimatedPane>
          </group>
        );
      })}
    </group>
  );
}

/**
 * Wraps a pane's mesh in a transform group whose pivot + rotation/translation
 * targets match the pane's opening type. Default state runs a constant
 * "breathing" loop (12° amplitude, 3-second period) so the user sees at a
 * glance which panes open and in which direction. Clicking the open toggle
 * scales the target to ~75°/full-slide for the marketing read.
 *
 * Reduced-motion users get a static partial-open pose (8° offset) — enough
 * to convey directionality, no animation.
 */
function AnimatedPane({
  paneWidthM,
  paneHeightM,
  opening,
  hingeSide,
  open,
  reducedMotion,
  glassInset,
  outerFrameHeightM,
  children,
}: {
  paneWidthM: number;
  paneHeightM: number;
  opening: PaneOpeningType;
  hingeSide: HingeSide | null | undefined;
  open: boolean;
  reducedMotion: boolean;
  glassInset: number;
  outerFrameHeightM: number;
  children: React.ReactNode;
}) {
  const pivotRef = useRef<Group>(null);

  // Direction signs per opening type. Stored once so the per-frame loop stays
  // allocation-free.
  const rig = useMemo(() => {
    if (opening === 'Casement' || opening === 'TiltAndTurn') {
      const swingSign = hingeSide === 'Left' ? 1 : -1;
      const pivotSign = hingeSide === 'Left' ? -1 : 1;
      return {
        type: 'rotY' as const,
        swingSign,
        pivot: { x: (pivotSign * paneWidthM) / 2, y: 0 },
      };
    }
    if (opening === 'Tilt') {
      return {
        type: 'rotX' as const,
        swingSign: -1,
        pivot: { x: 0, y: -paneHeightM / 2 },
      };
    }
    if (opening === 'Sliding') {
      return {
        type: 'slide' as const,
        swingSign: -1,
        pivot: { x: 0, y: 0 },
      };
    }
    return { type: 'fixed' as const, swingSign: 1, pivot: { x: 0, y: 0 } };
  }, [opening, hingeSide, paneWidthM, paneHeightM]);

  // Compute the current target each frame. Two regimes:
  //   - open=false   →   constant breathing at ±12° (or 8% slide-out),
  //                      |sin(πt/3)| envelope so the pane returns through 0.
  //   - open=true    →   full pose: 75° swing, 15° tilt, 70% slide.
  useFrame((state) => {
    const g = pivotRef.current;
    if (!g || rig.type === 'fixed') return;

    const time = state.clock.elapsedTime;
    // |sin| over a half-period of 3s gives 0 → 1 → 0 every 3 seconds.
    const breath = Math.abs(Math.sin((time * Math.PI) / 3));

    let targetRotY = 0;
    let targetRotX = 0;
    let targetTx = 0;

    if (rig.type === 'rotY') {
      const breathAngle = (Math.PI / 180) * 12 * breath * rig.swingSign;
      const openAngle = (Math.PI / 180) * 75 * rig.swingSign;
      targetRotY = open ? openAngle : breathAngle;
    } else if (rig.type === 'rotX') {
      const breathAngle = (Math.PI / 180) * 12 * breath * rig.swingSign;
      const openAngle = (Math.PI / 180) * 15 * rig.swingSign;
      targetRotX = open ? openAngle : breathAngle;
    } else {
      // slide
      const breathTx = 0.08 * paneWidthM * breath * rig.swingSign;
      const openTx = 0.7 * paneWidthM * rig.swingSign;
      targetTx = open ? openTx : breathTx;
    }

    if (reducedMotion) {
      // Static partial-open pose — no animation, but still conveys direction.
      const staticPose = open ? 1.0 : 0.25;
      g.rotation.y = targetRotY * staticPose;
      g.rotation.x = targetRotX * staticPose;
      g.position.x = rig.pivot.x + targetTx * staticPose;
      return;
    }

    const t = 0.14;
    g.rotation.y += (targetRotY - g.rotation.y) * t;
    g.rotation.x += (targetRotX - g.rotation.x) * t;
    g.position.x += (rig.pivot.x + targetTx - g.position.x) * t;
  });

  void glassInset;
  void outerFrameHeightM;

  return (
    <group position={[rig.pivot.x, rig.pivot.y, 0]}>
      <group ref={pivotRef} position={[-rig.pivot.x, -rig.pivot.y, 0]}>
        {children}
      </group>
    </group>
  );
}

/**
 * Two/three cylindrical hinges per openable pane, mounted on the hinge edge
 * at the swing axis. Casement/TiltAndTurn get two (top + bottom of the hinge
 * stile); Tilt gets two at the bottom edge; Sliding gets none. Geometry is
 * the same brushed-aluminium across all four hardware families — real GLTF
 * models land in Phase 1.5.
 */
function Hinges({
  paneWidthM,
  paneHeightM,
  opening,
  hingeSide,
  mobile,
}: {
  paneWidthM: number;
  paneHeightM: number;
  opening: PaneOpeningType;
  hingeSide: HingeSide | null | undefined;
  mobile: boolean;
}) {
  if (opening === 'Fixed' || opening === 'Sliding') return null;
  // Skip on extremely narrow panes — keeps mini schematic-style renders clean.
  if (paneWidthM < 0.18 || paneHeightM < 0.3) return null;

  const radiusM = 0.015; // 1.5cm
  const lengthM = 0.08; // 8cm
  const inset = 0.08; // pull hinges away from the very corner so they read as discrete pivots

  if (opening === 'Casement' || opening === 'TiltAndTurn') {
    const sign = hingeSide === 'Left' ? -1 : 1;
    const x = (sign * paneWidthM) / 2;
    const z = 0.025; // forward of the frame so it's visible against the glass
    // 2 hinges for Casement, 3 for TiltAndTurn (top, middle, bottom).
    const positions: Array<[number, number, number]> =
      opening === 'TiltAndTurn'
        ? [
            [x, paneHeightM / 2 - inset, z],
            [x, 0, z],
            [x, -paneHeightM / 2 + inset, z],
          ]
        : [
            [x, paneHeightM / 2 - inset, z],
            [x, -paneHeightM / 2 + inset, z],
          ];
    return (
      <>
        {positions.map((p, i) => (
          <mesh
            key={i}
            position={p}
            rotation={[0, 0, Math.PI / 2]}
            castShadow={!mobile}
          >
            <cylinderGeometry args={[radiusM, radiusM, lengthM, 16]} />
            <meshPhysicalMaterial color="#9A9A9A" metalness={1} roughness={0.2} />
          </mesh>
        ))}
      </>
    );
  }

  // Tilt — 2 hinges at the bottom edge, rotated to lie horizontally along x.
  const y = -paneHeightM / 2;
  const z = 0.025;
  return (
    <>
      <mesh position={[-paneWidthM / 2 + inset, y, z]} castShadow={!mobile}>
        <cylinderGeometry args={[radiusM, radiusM, lengthM, 16]} />
        <meshPhysicalMaterial color="#9A9A9A" metalness={1} roughness={0.2} />
      </mesh>
      <mesh position={[paneWidthM / 2 - inset, y, z]} castShadow={!mobile}>
        <cylinderGeometry args={[radiusM, radiusM, lengthM, 16]} />
        <meshPhysicalMaterial color="#9A9A9A" metalness={1} roughness={0.2} />
      </mesh>
    </>
  );
}

/**
 * Positions the camera so the window bounding box fills ~65% of viewport
 * height (or whichever axis demands the more conservative distance). With
 * Canvas in aspect-square, this lands the frame visually centred regardless
 * of the user's dimension choices in Step 3.
 *
 * Only sets initial position — OrbitControls handles user-initiated orbit
 * from there. When dimensions change (Step 3 slider), the rig re-fits with
 * a quick lerp instead of snapping.
 */
function CameraRig({ widthM, heightM }: { widthM: number; heightM: number }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;

  // Distance that makes the frame fill ~65% of viewport height. With a 1:1
  // canvas aspect this also satisfies the horizontal axis as long as width
  // <= height; for wider-than-tall windows we re-derive against the larger
  // axis (FOV is vertical on three.js, so horizontal fit uses width / aspect).
  const target = useMemo(() => {
    const fov = 35;
    const fovRad = (fov * Math.PI) / 180;
    const fillFactor = 0.65;
    const distForHeight = heightM / (2 * Math.tan(fovRad / 2) * fillFactor);
    // Canvas aspect is square → horizontal half-FOV equals vertical
    const distForWidth = widthM / (2 * Math.tan(fovRad / 2) * fillFactor);
    const dist = Math.max(distForHeight, distForWidth, 1.8);
    // Slight elevation + side angle so the frame reads as 3D, not orthographic.
    return {
      x: dist * 0.55,
      y: heightM / 2 + dist * 0.18,
      z: dist * 0.95,
    };
  }, [widthM, heightM]);

  // On dimension change, lerp the camera toward the new auto-fit pose.
  // First mount snaps for a clean entry; subsequent updates ease in.
  const settled = useRef(false);
  useEffect(() => {
    if (!settled.current) {
      camera.position.set(target.x, target.y, target.z);
      camera.lookAt(0, heightM / 2, 0);
      camera.updateProjectionMatrix();
      settled.current = true;
    }
  }, [camera, target, heightM]);

  useFrame(() => {
    if (!settled.current) return;
    const t = 0.06;
    camera.position.x += (target.x - camera.position.x) * t;
    camera.position.y += (target.y - camera.position.y) * t;
    camera.position.z += (target.z - camera.position.z) * t;
    camera.updateProjectionMatrix();
  });

  return null;
}

/**
 * HTML overlay positioned above the Canvas. Renders one mono caption per
 * openable pane describing direction (← / → / ↥ / ↔). Horizontal position
 * tracks each pane's cx within the frame — so the label sits over the pane
 * it describes, even after a Step-4 layout change.
 *
 * Pointer-events off so OrbitControls drag passes through.
 */
function PaneOverlayLabels({
  paneRects,
  widthM,
  t,
}: {
  paneRects: Array<{ pane: ConfigurationPaneInput; cx: number; pw: number }>;
  widthM: number;
  t: TFunction;
}) {
  if (widthM <= 0 || paneRects.length === 0) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-between px-3 md:top-4 md:px-4"
    >
      {paneRects.map(({ pane, cx, pw }, i) => {
        const text = labelTextFor(pane.openingType, pane.hingeSide, t);
        if (!text) return <span key={pane.position ?? i} className="flex-1" />;
        // Map the pane's centre x (in meters, range ~[-widthM/2, widthM/2]) to
        // a percentage across the canvas — the visible camera window matches
        // the frame at ~65% fill, so we re-scale into the visible 0-100% range.
        const visibleHalfWidth = (widthM / 0.65) / 2;
        const xPct = 50 + (cx / visibleHalfWidth) * 50;
        const widthPct = Math.max(18, (pw / visibleHalfWidth) * 50);
        return (
          <span
            key={pane.position ?? i}
            style={{
              position: 'absolute',
              left: `${xPct}%`,
              transform: 'translateX(-50%)',
              maxWidth: `${widthPct}%`,
            }}
            className="rounded-sm border border-hairline bg-bg-base/75 px-2 py-1 text-center font-mono text-[10px] uppercase leading-tight tracking-wider text-fg-secondary backdrop-blur-sm md:text-caption"
          >
            {text}
          </span>
        );
      })}
    </div>
  );
}

function labelTextFor(
  opening: PaneOpeningType,
  hingeSide: HingeSide | null | undefined,
  t: TFunction,
): string | null {
  switch (opening) {
    case 'Casement':
      return hingeSide === 'Left'
        ? t('configurator.scene.overlay.casementLeft')
        : t('configurator.scene.overlay.casementRight');
    case 'TiltAndTurn':
      return hingeSide === 'Left'
        ? t('configurator.scene.overlay.tiltAndTurnLeft')
        : t('configurator.scene.overlay.tiltAndTurnRight');
    case 'Tilt':
      return t('configurator.scene.overlay.tilt');
    case 'Sliding':
      return t('configurator.scene.overlay.sliding');
    case 'Fixed':
    default:
      return null;
  }
}

/**
 * Stub interior wall behind the window frame so the configurator preview
 * reads as "installed in a wall," not "floating in space." Sized generously
 * (8× the larger dimension, min 6m square) so it always fills the visible
 * background on any camera distance the auto-fit picks. Slightly cool-warm
 * neutral so it doesn't compete with the amber accents in the frame.
 *
 * Phase 1.5: real workshop / home backdrops per product type.
 */
function Wall({ widthCm, heightCm }: { widthCm: number; heightCm: number }) {
  const w = (widthCm / 100);
  const h = (heightCm / 100);
  const span = Math.max(w, h) * 8;
  return (
    <mesh position={[0, h / 2, -0.18]} receiveShadow>
      <planeGeometry args={[Math.max(span, 6), Math.max(span, 6)]} />
      {/* Light warm-neutral plaster — picks up the amber key light without
          competing with the amber accents in the frame edge. */}
      <meshPhysicalMaterial color="#C9C3B8" metalness={0} roughness={0.92} />
    </mesh>
  );
}

/**
 * Per-pane handle — a cylindrical primitive mounted on the hinge-opposite
 * edge of an openable pane, centred vertically. Geometry is the same
 * across all four handle families for Phase-1 (Roman supplies real photos
 * in Phase 1.5); colour reads as brushed aluminium regardless of frame
 * paint because handle hardware is uncoated.
 */
function Handle({
  paneWidthM,
  paneHeightM,
  hingeSide,
  opening,
  mobile,
}: {
  paneWidthM: number;
  paneHeightM: number;
  hingeSide: HingeSide | null | undefined;
  opening: PaneOpeningType;
  mobile: boolean;
}) {
  const lengthM = 0.12; // 12 cm
  const radiusM = 0.012;
  // Sliding panes have their handle near the centre; for casement/tilt-
  // and-turn it sits on the hinge-OPPOSITE side ~5cm in from the edge.
  const isSliding = opening === 'Sliding';
  const inset = 0.05;
  const offsetX = isSliding
    ? 0
    : hingeSide === 'Left'
      ? paneWidthM / 2 - inset
      : -(paneWidthM / 2 - inset);
  // Forward of the frame so it doesn't z-fight the glass plane.
  const offsetZ = 0.025;
  // Skip when the pane is too narrow to fit — keeps small fixed-sized
  // schematic test renders from looking visually broken.
  if (paneWidthM < 0.2 || paneHeightM < 0.3) return null;
  return (
    <mesh position={[offsetX, 0, offsetZ]} rotation={[0, 0, Math.PI / 2]} castShadow={!mobile}>
      <cylinderGeometry args={[radiusM, radiusM, lengthM, 12]} />
      <meshPhysicalMaterial color="#8B8B8B" metalness={1} roughness={0.15} />
    </mesh>
  );
}

/**
 * Sill — thin slab at the bottom of the frame. Position decides whether
 * we extend inward, outward, or both (rendered as two slabs). Rendered as
 * a stone-like composite (low metalness, high roughness).
 */
function Sill({
  widthM,
  thicknessM,
  accessories,
  mobile,
}: {
  widthM: number;
  thicknessM: number;
  accessories: AccessorySelectionInput | null;
  mobile: boolean;
}) {
  const sill = accessories?.sill;
  if (!sill?.position) return null;
  const sillThickness = 0.03; // 3 cm slab
  const innerDepth = 0.18;
  const outerDepth = 0.22;
  const yBase = -(thicknessM * 1.4) / 2 - sillThickness / 2;
  // BoxGeometry centres on origin; y-position drops it below the lower
  // rail. We mount one or two slabs depending on Position.
  return (
    <group position={[0, 0, 0]}>
      {(sill.position === 'Inner' || sill.position === 'Both') && (
        <mesh position={[0, yBase, -innerDepth / 2]} receiveShadow={!mobile} castShadow={!mobile}>
          <boxGeometry args={[widthM, sillThickness, innerDepth]} />
          <meshPhysicalMaterial color="#C8C2B4" metalness={0.05} roughness={0.7} />
        </mesh>
      )}
      {(sill.position === 'Outer' || sill.position === 'Both') && (
        <mesh position={[0, yBase, outerDepth / 2]} receiveShadow={!mobile} castShadow={!mobile}>
          <boxGeometry args={[widthM, sillThickness, outerDepth]} />
          <meshPhysicalMaterial color="#B5AFA1" metalness={0.05} roughness={0.7} />
        </mesh>
      )}
    </group>
  );
}

/**
 * Blind assembly — a box at the top of the frame for externals (façade-
 * mounted) or a rolled tube just behind the top rail for internals.
 * Always partly-rolled so it reads as "blind present" without covering
 * the glass and obscuring everything else in the configurator preview.
 */
function BlindAssembly({
  widthM,
  heightM,
  thicknessM,
  accessories,
  mobile,
}: {
  widthM: number;
  heightM: number;
  thicknessM: number;
  accessories: AccessorySelectionInput | null;
  mobile: boolean;
}) {
  const blind = accessories?.blind;
  if (!blind) return null;
  // Heuristic: blind slug isn't on the wire — we infer placement from
  // the visual hint in the colour (the BlindType.placement is in the
  // catalog dict, which Scene doesn't have here). For Phase 1 we draw
  // the external box by default and switch to internal-roll when the
  // user picks an internal-prefixed slug. The Step-7 UI labels the
  // chosen blind; the 3D simply needs to look reasonable in either case.
  // We keep both branches drawable for forward-compat.
  const isInternal = false; // TODO: thread BlindType.placement through props (Phase 1.5)
  const yTop = heightM / 2 + thicknessM / 2;
  if (isInternal) {
    // Rolled tube behind the top rail.
    return (
      <mesh position={[0, yTop * 0.85, -0.06]} rotation={[0, 0, Math.PI / 2]} castShadow={!mobile}>
        <cylinderGeometry args={[0.04, 0.04, widthM * 0.95, 16]} />
        <meshPhysicalMaterial color="#3B3530" metalness={0.05} roughness={0.6} />
      </mesh>
    );
  }
  // External box mounted forward of the façade. Slightly amber-tinted
  // shutter slats hinted via partial-deployment height.
  const blindBoxHeight = 0.18;
  const deployedFraction = 0.15;
  const deployedHeight = heightM * deployedFraction;
  return (
    <group>
      <mesh position={[0, yTop + blindBoxHeight / 2, 0.08]} castShadow={!mobile}>
        <boxGeometry args={[widthM, blindBoxHeight, 0.14]} />
        <meshPhysicalMaterial color="#A8B3C4" metalness={0.7} roughness={0.35} />
      </mesh>
      {deployedHeight > 0 && (
        <mesh position={[0, yTop - deployedHeight / 2, 0.075]} castShadow={!mobile}>
          <boxGeometry args={[widthM, deployedHeight, 0.02]} />
          <meshPhysicalMaterial color="#998C6F" metalness={0.4} roughness={0.5} />
        </mesh>
      )}
    </group>
  );
}

/**
 * Compose the per-pane glass material from opening tint + glass-type
 * paneCount + extras. Each extra is layered onto the base in priority order
 * (Frosted dominates if present — opaqueness wins over tint).
 */
function glassVisualFor(
  openingTint: string,
  extras: readonly string[],
  paneCount: number,
  mobile: boolean,
): { color: string; opacity: number; transmission: number; roughness: number } {
  let color = openingTint;
  let opacity = openingTint === '#F0F8FF' ? 0.16 : 0.22; // neutral vs opening-tinted
  let transmission = mobile ? 0.5 : 0.92;
  let roughness = 0.05;

  // Layer count: each extra pane reduces transmission a touch and shifts cool.
  if (paneCount >= 3) {
    transmission = Math.max(0, transmission - 0.05 * (paneCount - 2));
    // Subtle cool wash on 3+ layers — only when there's no other tint pulling.
    if (openingTint === '#F0F8FF') color = paneCount >= 4 ? '#E0EAF8' : '#E8F0F8';
  }

  if (extras.includes('Tinted')) {
    color = '#C8A878'; // bronze
    transmission = Math.max(0, transmission - 0.08);
  }
  if (extras.includes('LowECoating')) {
    // Faint warm shimmer — small color drift toward amber, no transmission hit.
    color = mixHexToward(color, '#FFE9B0', 0.18);
  }
  if (extras.includes('Frosted')) {
    // Frosted dominates: high roughness + opaqueness override any tint above.
    roughness = 0.6;
    transmission = mobile ? 0.2 : 0.35;
    opacity = 0.55;
    color = '#E4ECF4';
  }

  return { color, opacity, transmission, roughness };
}

/** Quick hex-to-hex linear blend for the Low-E shimmer. */
function mixHexToward(a: string, b: string, t: number): string {
  const ah = a.replace('#', '');
  const bh = b.replace('#', '');
  const ar = parseInt(ah.slice(0, 2), 16);
  const ag = parseInt(ah.slice(2, 4), 16);
  const ab = parseInt(ah.slice(4, 6), 16);
  const br = parseInt(bh.slice(0, 2), 16);
  const bg = parseInt(bh.slice(2, 4), 16);
  const bb = parseInt(bh.slice(4, 6), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
}

/**
 * A faint colour shift per opening type. Anchored to the project's accent
 * palette so the 3D viewport stays cohesive with the rest of the surface;
 * the tint is subtle enough that Fixed panes still read as clear glass.
 */
function paneTint(opening: PaneOpeningType): string {
  switch (opening) {
    case 'Fixed':
      return '#F0F8FF'; // neutral
    case 'Casement':
      return '#FFE9B0'; // warm amber wash
    case 'Tilt':
      return '#D0E4FF'; // cool blue
    case 'TiltAndTurn':
      return '#FFD8A8'; // deeper amber
    case 'Sliding':
      return '#B5E4D8'; // mint accent
    default:
      return '#F0F8FF';
  }
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <meshPhysicalMaterial color="#131925" roughness={0.6} metalness={0.05} />
    </mesh>
  );
}
