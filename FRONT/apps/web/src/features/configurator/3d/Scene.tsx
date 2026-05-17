import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Group } from 'three';

import type { ConfigurationPaneInput, PaneOpeningType } from '@beqsan/api-types';
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
          </group>
        );
      })}
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
