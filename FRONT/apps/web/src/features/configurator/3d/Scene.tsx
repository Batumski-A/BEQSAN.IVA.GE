import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Group } from 'three';

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

  return (
    <div className="relative aspect-square overflow-hidden rounded-sm border border-hairline bg-bg-elevated">
      <Canvas
        camera={{ position: [2.4, 1.6, 3.2], fov: 35, near: 0.1, far: 50 }}
        dpr={isMobile ? [1, 1.5] : [1, 2]}
        shadows={!isMobile}
        performance={{ min: 0.5 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        aria-hidden
      >
        <color attach="background" args={['#0A0E14']} />

        <ambientLight intensity={0.15} />
        <directionalLight
          position={[5, 8, 4]}
          intensity={1.2}
          color="#FFE4B0"
          castShadow={!isMobile}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        {!isMobile ? (
          <>
            <directionalLight position={[-3, 4, -2]} intensity={0.35} color="#9EC4FF" />
            <directionalLight position={[0, 2, -5]} intensity={0.5} color="#FFFFFF" />
          </>
        ) : null}

        <Suspense fallback={null}>
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
            mobile={isMobile}
          />
          <Ground />
        </Suspense>

        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={1.8}
          maxDistance={6}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI * 0.62}
          autoRotate={!material}
          autoRotateSpeed={0.6}
        />
      </Canvas>

      <div className="pointer-events-none absolute bottom-3 left-4 font-mono text-caption uppercase tracking-wider text-fg-tertiary">
        {dimensions.widthCm}×{dimensions.heightCm} {t('common.units.cm')}
        {material ? <span className="ml-3">· {material.slug?.toUpperCase()}</span> : null}
      </div>
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
            {i < paneRects.length - 1 && (
              <mesh
                position={[pw / 2, 0, 0]}
                castShadow={!mobile}
              >
                <boxGeometry args={[mullionThickness, h - frameThickness * 2, frameThickness * 1.4]} />
                <meshPhysicalMaterial color={frameColor} metalness={metalness} roughness={roughness} />
              </mesh>
            )}
            {hasHandle && (
              <Handle
                paneWidthM={pw}
                paneHeightM={h - frameThickness * 2}
                hingeSide={pane.hingeSide}
                opening={pane.openingType}
                mobile={mobile}
              />
            )}
          </group>
        );
      })}
    </group>
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
