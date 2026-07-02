import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, Line, Environment, ContactShadows } from '@react-three/drei';
import { MathUtils } from 'three';
import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';

import { RoomContext } from './rooms/RoomContext';
import type { PresetKind } from './rooms/presets';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { Group, PerspectiveCamera } from 'three';
import { Check, GripHorizontal, GripVertical, Settings2 } from 'lucide-react';

import type {
  AccessorySelectionInput,
  ConfigurationPaneInput,
  HingeSide,
  PaneOpeningType,
} from '@beqsan/api-types';
import { useColorsByMaterial, useGlassTypesByMaterial, type GlassType } from '../api';
import { useConfiguratorStore } from '../store';

/**
 * LiveStudio-only interactivity hooks: in-scene W/H number inputs and the
 * per-pane opening-type dropdown that floats over each pane in 3D space.
 * The legacy 8-step wizard at `/configurator/wizard` keeps the read-only
 * caption labels — only LiveStudio passes this prop.
 */
export type SceneBackgroundPreset = 'dark' | 'studio' | 'warm';

export type SceneInteractiveControls = {
  panes: {
    options: ReadonlyArray<{ value: string; label: string }>;
    /** Read the current dropdown value from a pane. */
    valueFor: (pane: ConfigurationPaneInput) => string;
    /** Fires when the user picks a new opening type for a pane. */
    onChange: (paneIndex: number, value: string) => void;
    /**
     * Bulk-set every pane's widthRatio, e.g. while the user drags a
     * mullion. The array length must match the current pane count.
     */
    onRatiosChange?: (ratios: number[]) => void;
    /** Split a pane in two at the given 1-based position. */
    onSplit?: (paneIndex: number) => void;
    /** True when adding another pane would exceed the product's max. */
    canSplit?: boolean;
    /** Toggle the horizontal transom mullion on/off for a pane. */
    onSetTransom?: (paneIndex: number, hasTransom: boolean) => void;
    /** Drag-adjust the transom height ratio (0.1..0.5). */
    onTransomRatioChange?: (paneIndex: number, ratio: number) => void;
    /** Reading "is this pane's transom currently on" from outside. */
    isTransomOn?: (pane: ConfigurationPaneInput) => boolean;
  };
  dimensions: {
    widthCm: number;
    heightCm: number;
    minWidthCm: number;
    maxWidthCm: number;
    minHeightCm: number;
    maxHeightCm: number;
    onWidthChange: (cm: number) => void;
    onHeightChange: (cm: number) => void;
  };
  /** Optional canvas background preset. Defaults to 'dark'. */
  background?: SceneBackgroundPreset;
};

type ConfiguratorSceneProps = {
  interactive?: SceneInteractiveControls;
  isStudio?: boolean;
  background?: SceneBackgroundPreset;
  /**
   * LiveStudio room-context preset (Sprint A). `null` = bare studio
   * backdrop (the legacy "ფანჯარა მხოლოდ" state). Otherwise the named
   * preset wraps the window/door in apartment / exterior / veranda
   * scenery. Mobile path drives lowDetail per preset via the existing
   * isMobile check. Ignored by the legacy wizard.
   */
  roomPreset?: PresetKind | null;
  /**
   * When provided, the scene registers a capture function that renders one
   * frame and returns it as a PNG data-URL. Used by the WhatsApp handoff to
   * attach the drawing to the conversation. Rendering synchronously right
   * before toDataURL avoids needing preserveDrawingBuffer.
   */
  snapshotRef?: MutableRefObject<(() => string) | null>;
};

/** Lives inside <Canvas>; exposes a render-then-capture closure via ref. */
function SnapshotBridge({
  snapshotRef,
}: {
  snapshotRef: MutableRefObject<(() => string) | null>;
}) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    snapshotRef.current = () => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL('image/png');
    };
    return () => {
      snapshotRef.current = null;
    };
  }, [gl, scene, camera, snapshotRef]);
  return null;
}

/**
 * Phase 1 placeholder scene. A box scaled to the configurator dimensions,
 * a glass plane in front of it, and limited orbit controls. Real GLTF
 * models from Roman's workshop photos land in Phase 1.5.
 *
 * Mobile detection turns shadows off and clamps dpr to keep iPhone 12-class
 * devices at 60fps per .claude/skills/3d-scene-design.
 */
export function ConfiguratorScene({
  interactive,
  isStudio,
  background,
  roomPreset = null,
  snapshotRef,
}: ConfiguratorSceneProps = {}) {
  const { t } = useTranslation();
  const productType = useConfiguratorStore((s) => s.productType);
  const material = useConfiguratorStore((s) => s.material);
  const dimensions = useConfiguratorStore((s) => s.dimensions);
  const panes = useConfiguratorStore((s) => s.panes);
  const color = useConfiguratorStore((s) => s.color);
  const accessories = useConfiguratorStore((s) => s.accessories);
  const windowOpen = useConfiguratorStore((s) => s.windowOpen);
  const setWindowOpen = useConfiguratorStore((s) => s.setWindowOpen);

  /**
   * Per-pane ephemeral click state — keyed by pane.position (1-based).
   * Lasha's mockup cycles tilt-and-turn through 3 states (closed/turn/tilt+turn);
   * everything else toggles 2 states (closed/open). When the opening type or
   * hinge side changes via the right panel, we reset the relevant entry so the
   * pane doesn't visually "carry over" an obsolete state.
   */
  const [paneClickStates, setPaneClickStates] = useState<Record<number, number>>({});

  // Track previous opening signature per pane and reset clickState on change.
  const prevOpeningSig = useRef<Map<number, string>>(new Map());
  useEffect(() => {
    const next: Record<number, number> = { ...paneClickStates };
    let mutated = false;
    panes.forEach((p) => {
      if (p.position == null) return;
      const sig = `${p.openingType}|${p.hingeSide ?? ''}`;
      const prev = prevOpeningSig.current.get(p.position);
      if (prev !== undefined && prev !== sig && next[p.position] !== 0) {
        next[p.position] = 0;
        mutated = true;
      }
      prevOpeningSig.current.set(p.position, sig);
    });
    if (mutated) setPaneClickStates(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panes]);

  /**
   * Shared cumulative pointer-move delta across the drag handler + pane
   * click handler. When the user drags more than 5px between pointer-down
   * and pointer-up, pane onClicks are suppressed so the model rotation
   * doesn't accidentally toggle a sash open.
   */
  const dragDeltaRef = useRef(0);

  /**
   * When non-zero, DragRotator skips its own pointerdown — used by
   * child drags (mullion repartition, dim-chip scrub) to suppress the
   * world-rotation gesture so the model stays still while the user is
   * editing it. Backstop for when stopImmediatePropagation alone can't
   * win the listener-ordering race.
   */
  const interactionLockRef = useRef(0);

  const onPaneClick = (paneIndex: number, opening: PaneOpeningType) => {
    if (opening === 'Fixed') return;
    if (dragDeltaRef.current > 5) return; // user was rotating the model
    const cycleLen = opening === 'TiltAndTurn' ? 3 : 2;
    setPaneClickStates((prev) => ({
      ...prev,
      [paneIndex]: ((prev[paneIndex] ?? 0) + 1) % cycleLen,
    }));
  };

  // Refs threaded into the Canvas — DragRotator (inside the Canvas) updates
  // the worldRef rotation each pointer-move event; the cumulative delta
  // shared with onPaneClick lives in dragDeltaRef.
  const worldRef = useRef<Group>(null);

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
  //
  // Defaults reflect what Roman actually installs most in Batumi:
  //   - aluminium → RAL 7016 anthracite (≈ #2D3438) — the dominant choice
  //     on hotel and apartment façades along the coast
  //   - PVC → RAL 9016 traffic white (≈ #F1F0EA) — the residential default
  const fallbackHex = material?.family === 'aluminum' ? '#2D3438' : '#F1F0EA';
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

  // LiveStudio mounts Scene inside `absolute inset-0` and expects a
  // full-fill canvas. The legacy wizard sized Scene inside a step body
  // and relied on `aspect-square` for the framing. Keep both happy by
  // dropping the aspect lock when `interactive` is supplied. The CSS
  // radial gradient gives the dark frame contrast without a separate
  // 3D backdrop plate (Lasha called the old plate "extra background").
  const isFullScreen = isStudio || interactive !== undefined;
  const bg = background ?? interactive?.background ?? 'dark';
  const containerStyle: React.CSSProperties = isFullScreen
    ? {
        // Lighter center so the dark anthracite frame reads against
        // the background. Outer ring stays dark for the premium-studio
        // feel Lasha wants.
        backgroundImage:
          bg === 'studio'
            ? 'radial-gradient(circle at 50% 45%, #FFFFFF 0%, #E8ECF2 55%, #BFC7D2 100%)'
            : bg === 'warm'
              ? 'radial-gradient(circle at 50% 45%, #5B4334 0%, #2A1F18 55%, #14100C 100%)'
              : 'radial-gradient(circle at 50% 45%, #2E4173 0%, #0F1B36 55%, #050810 100%)',
      }
    : {};
  const containerCls = isFullScreen
    ? 'relative h-full w-full overflow-hidden'
    : 'relative aspect-square overflow-hidden rounded-sm border border-hairline bg-bg-elevated';

  // R3F's initial setSize() races with the parent's flex/absolute layout
  // when Scene mounts before the parent's height resolves. Result: the
  // canvas stays at the default 300x150 until a window resize hits.
  // Dispatch a resize on first paint as a safe nudge so the canvas
  // matches its container from the very first frame.
  useEffect(() => {
    if (!isFullScreen) return;
    const id = requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    return () => cancelAnimationFrame(id);
  }, [isFullScreen]);

  return (
    <div className={containerCls} style={containerStyle}>
      <Canvas
        dpr={isMobile ? [1, 1.5] : [1, 2]}
        shadows={!isMobile}
        performance={{ min: 0.5 }}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: isFullScreen }}
        aria-hidden
      >
        {/* In interactive mode the canvas is transparent so the CSS
            radial gradient on the parent div shows through. Legacy
            wizard fills the canvas with a solid dark background. */}
        {isFullScreen ? null : <color attach="background" args={['#0A0E14']} />}

        {snapshotRef ? <SnapshotBridge snapshotRef={snapshotRef} /> : null}

        {/* Auto-fit camera to the window bounding box so the frame fills ~65%
            of viewport height regardless of dimensions. Updates whenever the
            user changes Step 3 measurements. */}
        <CameraRig widthM={w} heightM={h} interactive={isFullScreen} />

        {/* §9.7 lighting — extra bright in interactive mode so the dark
            anthracite frame's metallic edges catch strong specular
            highlights even against the dark studio background. */}
        <hemisphereLight args={['#FFE4B5', '#1B2030', isFullScreen ? 0.7 : 0.5]} />
        <ambientLight intensity={isFullScreen ? 0.55 : 0.35} />
        <directionalLight
          position={[5, 8, 4]}
          intensity={isFullScreen ? 2.2 : 1.7}
          color="#FFEFC8"
          castShadow={!isMobile}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        {!isMobile ? (
          <>
            <directionalLight position={[-4, 4, 2]} intensity={isFullScreen ? 0.85 : 0.55} color="#A8C8FF" />
            <directionalLight position={[0, 2, -5]} intensity={isFullScreen ? 0.6 : 0.4} color="#FFFFFF" />
            <directionalLight position={[0, 0, 6]} intensity={isFullScreen ? 0.7 : 0.45} color="#FFE4B5" />
            {/* Interactive-only top-back rim light — catches the
                frame's top-front edge with a bright specular streak so
                the dark aluminium reads against the dark background. */}
            {isFullScreen ? (
              <directionalLight position={[2, 6, -3]} intensity={1.4} color="#FFFFFF" />
            ) : null}
          </>
        ) : null}

        <Suspense fallback={null}>
          {roomPreset === null ? <Environment preset="city" /> : null}
          {/* World group — rotated by DragRotator on pointer-move. Everything
              inside spins together while the camera stays still, matching
              Lasha's mockup interaction (model spins, not the camera). */}
          <group ref={worldRef}>
            {/* LiveStudio runs without a wall or backdrop plate — Lasha
                asked for a clean float against the canvas background.
                The aluminum frame relies on the brightened key light
                (boosted below) and a rim light to catch its metallic
                edges. The legacy wizard keeps the full studio Wall. */}
            {isStudio || interactive ? null : (
              <Wall widthCm={dimensions.widthCm} heightCm={dimensions.heightCm} />
            )}
            {roomPreset !== null ? (
              <RoomContext
                kind={roomPreset}
                widthCm={dimensions.widthCm}
                heightCm={dimensions.heightCm}
                isMobile={isMobile}
              />
            ) : null}
            <Window
              family={material?.family ?? 'aluminum'}
              productSlug={productType?.slug ?? 'window'}
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
              interactive={interactive}
              interactionLockRef={interactionLockRef}
              paneClickStates={paneClickStates}
              onPaneClick={onPaneClick}
            />
            {isStudio || interactive ? null : <Ground />}
          </group>

          {/* Apple-like soft ground shadow to anchor the floating model.
              Skipped when a room preset is active — the preset's own floor
              catches shadows, and a coplanar ContactShadows at y=0 z-fights
              the floor + the window's bottom rail (Lasha flagged 2026-05-28). */}
          {(isStudio || interactive) && roomPreset === null && (
            <ContactShadows
              position={[0, 0, 0]}
              opacity={0.55}
              scale={6}
              blur={1.6}
              far={3}
              resolution={512}
            />
          )}
        </Suspense>

        {/* Drag-to-rotate the world group (replaces OrbitControls). Listens
            on the canvas DOM element directly — Y-axis (yaw) from dx, X-axis
            (pitch) from dy, clamped to ±45°. Cumulative drag delta is shared
            with onPaneClick so a long drag doesn't fire pane open/close. */}
        <DragRotator targetRef={worldRef} dragDeltaRef={dragDeltaRef} interactionLockRef={interactionLockRef} />
      </Canvas>

      {/* HTML overlay labels (legacy wizard only — LiveStudio renders interactive
          dropdowns inside the Canvas via <Html> instead). */}
      {!interactive ? <PaneOverlayLabels paneRects={paneRects} widthM={w} t={t} /> : null}

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

function PaneDropdownBadge({
  paneIndex,
  options,
  currentValue,
  onChange,
  onSplit,
  canSplit,
  onSetTransom,
  hasTransom,
  bottomCenterY,
  frameDepth,
  isHovered,
  isMobile,
}: {
  paneIndex: number;
  options: ReadonlyArray<{ value: string; label: string }>;
  currentValue: string;
  onChange: (paneIndex: number, value: string) => void;
  /** Optional: split this pane in two. Hidden if undefined or canSplit=false. */
  onSplit?: () => void;
  canSplit?: boolean;
  /** Optional: toggle the horizontal transom on/off. */
  onSetTransom?: (hasTransom: boolean) => void;
  /** Current transom state — drives "add" vs "remove" label. */
  hasTransom?: boolean;
  bottomCenterY: number;
  frameDepth: number;
  /**
   * True when the parent pane mesh is hovered (mouse over the glass).
   * The chip is ALWAYS visible (Lasha 2026-07-02: hover-only was
   * undiscoverable on touch — phones have no hover and the target was
   * tiny). Hover now only brightens it; on mobile the hit area grows
   * to the 44px touch minimum.
   */
  isHovered: boolean;
  isMobile: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isChipHovered, setIsChipHovered] = useState(false);
  const currentOption = options.find((opt) => opt.value === currentValue) || options[0];

  useEffect(() => {
    if (!isOpen) return;
    const handleClose = () => setIsOpen(false);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [isOpen]);

  const emphasized = isHovered || isChipHovered || isOpen;

  return (
    <Html
      position={[0, bottomCenterY, frameDepth * 0.65]}
      center
      zIndexRange={[100, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div
        style={{ pointerEvents: 'auto' }}
        className="relative select-none font-studio"
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => setIsChipHovered(true)}
        onMouseLeave={() => setIsChipHovered(false)}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
          title={currentOption?.label || currentValue}
          aria-label={`გახსენი პარამეტრები: ${currentOption?.label || currentValue}`}
          className={`flex items-center justify-center rounded-full border backdrop-blur transition-all duration-200 active:scale-95 ${
            isMobile ? 'h-11 w-11' : 'h-8 w-8 hover:scale-110'
          } ${
            emphasized
              ? 'border-sky-300/75 bg-slate-900/95 text-white shadow-[0_0_18px_rgba(77,163,255,0.6)]'
              : 'border-sky-400/45 bg-slate-950/80 text-sky-200 shadow-[0_0_14px_rgba(77,163,255,0.45)]'
          }`}
        >
          <Settings2 className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'} transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
        </button>

        {isOpen && (
          <div className={`absolute left-1/2 mt-1.5 -translate-x-1/2 z-50 overflow-hidden rounded-xl border border-white/10 bg-slate-950/90 p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200 ${isMobile ? 'min-w-[180px]' : 'min-w-[140px]'}`}>
            {options.map((opt) => {
              const isSelected = opt.value === currentValue;
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    onChange(paneIndex, opt.value);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg text-left font-semibold transition-all ${
                    isMobile ? 'px-3 py-2.5 text-xs' : 'px-2.5 py-1.5 text-[10px]'
                  } ${
                    isSelected
                      ? 'bg-studio-brand text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)]'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="h-3 w-3" />}
                </button>
              );
            })}
            {(onSplit && canSplit) || onSetTransom ? (
              <div className="my-1 h-px bg-white/10" />
            ) : null}
            {onSplit && canSplit ? (
              <button
                onClick={() => {
                  onSplit();
                  setIsOpen(false);
                }}
                className={`flex w-full items-center gap-1.5 rounded-lg text-left font-semibold text-sky-300 transition-all hover:bg-sky-500/15 hover:text-sky-100 ${
                  isMobile ? 'px-3 py-2.5 text-xs' : 'px-2.5 py-1.5 text-[10px]'
                }`}
              >
                <span aria-hidden className="text-base leading-none">+</span>
                <span>ვერტიკალური ტიხარი</span>
              </button>
            ) : null}
            {onSetTransom ? (
              <button
                onClick={() => {
                  onSetTransom(!hasTransom);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center gap-1.5 rounded-lg text-left font-semibold text-sky-300 transition-all hover:bg-sky-500/15 hover:text-sky-100 ${
                  isMobile ? 'px-3 py-2.5 text-xs' : 'px-2.5 py-1.5 text-[10px]'
                }`}
              >
                <span aria-hidden className="text-base leading-none">{hasTransom ? '−' : '+'}</span>
                <span>{hasTransom ? 'მოაშორე ჰორიზონტალური' : 'ჰორიზონტალური ტიხარი'}</span>
              </button>
            ) : null}
          </div>
        )}
      </div>
    </Html>
  );
}

function Window({
  family,
  productSlug,
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
  interactive,
  interactionLockRef,
  paneClickStates,
  onPaneClick,
}: {
  family: 'aluminum' | 'pvc';
  productSlug: string;
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
  interactive?: SceneInteractiveControls;
  /** Reference-counted lock shared with DragRotator. Mullion + dim-chip
      drag handlers increment on start and decrement on end so the model
      doesn't rotate while the user is editing dimensions. */
  interactionLockRef: React.MutableRefObject<number>;
  paneClickStates: Record<number, number>;
  onPaneClick: (paneIndex: number, opening: PaneOpeningType) => void;
}) {
  // 1-based pane position currently under the cursor. Null when nothing is
  // hovered. Drives the hover-only PaneDropdownBadge visibility per Lasha's
  // 2026-05-28 feedback — chips no longer stack for every pane.
  const [hoveredPane, setHoveredPane] = useState<number | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);
  /**
   * Setter for hoveredPane that delays clearing by 220 ms. The chip's
   * `<Html>` overlay floats above the glass mesh, so the mouse briefly
   * exits the mesh's bounds while transitioning onto the chip — without
   * the grace window, the chip flickered open/closed on every cross.
   */
  const setHoverPane = (idx: number | null) => {
    if (hoverTimeoutRef.current !== null) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (idx === null) {
      hoverTimeoutRef.current = window.setTimeout(() => {
        setHoveredPane(null);
        hoverTimeoutRef.current = null;
      }, 220);
    } else {
      setHoveredPane(idx);
    }
  };
  useEffect(() => () => {
    if (hoverTimeoutRef.current !== null) {
      window.clearTimeout(hoverTimeoutRef.current);
    }
  }, []);
  // Drag-to-resize state for the W/H dimension chips. Drives both the
  // value change (via interactive.dimensions.onWidthChange/onHeightChange)
  // and the wireframe ring overlay that pulses around the model bounds.
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{ axis: 'w' | 'h'; startPx: number; startCm: number } | null>(null);
  /**
   * Index of the mullion currently under the cursor (0..panesCount-2),
   * or null when none. Drives the hover glow and the col-resize cursor.
   */
  const [hoveredMullion, setHoveredMullion] = useState<number | null>(null);
  /**
   * True while the user is mid-drag on a mullion. The active mullion
   * gets a stronger glow + the rest of the scene dims slightly.
   */
  const [draggingMullion, setDraggingMullion] = useState<number | null>(null);
  const mullionDragRef = useRef<{
    mullionIdx: number;
    startPx: number;
    startRatios: number[];
  } | null>(null);
  /**
   * Same hover/drag pair as the vertical mullion, but for the
   * horizontal transom bar. Keyed by the pane's 1-based position.
   */
  const [hoveredTransom, setHoveredTransom] = useState<number | null>(null);
  const [draggingTransom, setDraggingTransom] = useState<number | null>(null);
  const transomDragRef = useRef<{
    paneIdx: number;
    startPxY: number;
    startRatio: number;
    innerPaneHCm: number;
  } | null>(null);
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    void delta;
  });

  // metres per cm = 0.01
  const w = (widthCm / 100) * 1.0;
  const h = (heightCm / 100) * 1.0;
  // Profile geometry differs by material family — Lasha asked for the
  // PVC vs aluminum identity to be visible at a glance.
  //   Aluminum (Alumil S-77 reference): slim 5cm outer frame, 4cm sash,
  //     sharp corners, brushed anthracite reads cold.
  //   PVC (Rehau Synego reference): chunky 7cm outer frame, 5.5cm sash,
  //     slight chamfer, matte white reads warm.
  const isAluminum = family === 'aluminum';
  const frameThickness = isAluminum ? 0.05 : 0.07;
  const sashThickness = isAluminum ? 0.04 : 0.055;
  const mullionThickness = isAluminum ? 0.035 : 0.05;
  // Frame depth (Z-axis) — PVC chambers are visibly deeper than alu.
  const frameDepth = isAluminum ? 0.065 : 0.085;
  // Glass sits inside the sash frame, inset on all 4 sides.
  const glassInset = isAluminum ? 0.085 : 0.12;

  // Outer color drives the front-facing frame material; inner drives the
  // back-facing pieces in dual-color mode. Family controls metalness +
  // roughness (PVC matte, aluminum brushed-metal) regardless of the chosen
  // hex — paint sits on the surface, profile material stays the same.
  const frameColor = outerHex;
  // PBR values calibrated to Alumil S-77 anodised (aluminum) and Rehau Synego
  // (PVC) reference photos. Aluminum reads as brushed-finish powder coat —
  // metalness pulled back from 1.0 → 0.95 with slightly higher roughness 0.22 so the surface scatters.
  // PVC stays matte-plaster with a touch of clearcoat (clearcoatRoughness 0.4) to evoke the factory-finish sheen.
  const metalness = family === 'aluminum' ? 0.98 : 0.01;
  const roughness = family === 'aluminum' ? 0.18 : 0.45;
  const clearcoat = family === 'aluminum' ? 0.1 : 0.6;
  const clearcoatRoughness = family === 'aluminum' ? 0.1 : 0.12;
  const envIntensity = mobile ? 0.6 : 1.2;

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
        <boxGeometry args={[w, frameThickness, frameDepth]} />
        <meshPhysicalMaterial color={frameColor} metalness={metalness} roughness={roughness} clearcoat={clearcoat} clearcoatRoughness={clearcoatRoughness} envMapIntensity={envIntensity} />
      </mesh>
      <mesh position={[0, -(h / 2) + frameThickness / 2, 0]} castShadow={!mobile}>
        <boxGeometry args={[w, frameThickness, frameDepth]} />
        <meshPhysicalMaterial color={frameColor} metalness={metalness} roughness={roughness} clearcoat={clearcoat} clearcoatRoughness={clearcoatRoughness} envMapIntensity={envIntensity} />
      </mesh>
      <mesh position={[-w / 2 + frameThickness / 2, 0, 0]} castShadow={!mobile}>
        <boxGeometry args={[frameThickness, h, frameDepth]} />
        <meshPhysicalMaterial color={frameColor} metalness={metalness} roughness={roughness} clearcoat={clearcoat} clearcoatRoughness={clearcoatRoughness} envMapIntensity={envIntensity} />
      </mesh>
      <mesh position={[w / 2 - frameThickness / 2, 0, 0]} castShadow={!mobile}>
        <boxGeometry args={[frameThickness, h, frameDepth]} />
        <meshPhysicalMaterial color={frameColor} metalness={metalness} roughness={roughness} clearcoat={clearcoat} clearcoatRoughness={clearcoatRoughness} envMapIntensity={envIntensity} />
      </mesh>

      {/* Frame stop (inner lip/rebate) — gives the frame architectural depth when sashes open.
          Positioned on the exterior side (z = frameDepth / 2 - 0.005) because sashes open inward.
          Only rendered for hinged configurations. */}
      {!(productSlug === 'sliding' || panes.some((p) => p.openingType === 'Sliding')) && (
        <group position={[0, 0, frameDepth / 2 - 0.005]}>
          {/* Top stop */}
          <mesh position={[0, h / 2 - frameThickness - 0.0075, 0]} castShadow={!mobile} receiveShadow={!mobile}>
            <boxGeometry args={[w - frameThickness * 2, 0.015, 0.01]} />
            <meshPhysicalMaterial color={frameColor} metalness={metalness} roughness={roughness} clearcoat={clearcoat} clearcoatRoughness={clearcoatRoughness} envMapIntensity={envIntensity} />
          </mesh>
          {/* Bottom stop */}
          <mesh position={[0, -(h / 2 - frameThickness - 0.0075), 0]} castShadow={!mobile} receiveShadow={!mobile}>
            <boxGeometry args={[w - frameThickness * 2, 0.015, 0.01]} />
            <meshPhysicalMaterial color={frameColor} metalness={metalness} roughness={roughness} clearcoat={clearcoat} clearcoatRoughness={clearcoatRoughness} envMapIntensity={envIntensity} />
          </mesh>
          {/* Left stop */}
          <mesh position={[-(w / 2 - frameThickness - 0.0075), 0, 0]} castShadow={!mobile} receiveShadow={!mobile}>
            <boxGeometry args={[0.015, Math.max(0, h - frameThickness * 2 - 0.03), 0.01]} />
            <meshPhysicalMaterial color={frameColor} metalness={metalness} roughness={roughness} clearcoat={clearcoat} clearcoatRoughness={clearcoatRoughness} envMapIntensity={envIntensity} />
          </mesh>
          {/* Right stop */}
          <mesh position={[w / 2 - frameThickness - 0.0075, 0, 0]} castShadow={!mobile} receiveShadow={!mobile}>
            <boxGeometry args={[0.015, Math.max(0, h - frameThickness * 2 - 0.03), 0.01]} />
            <meshPhysicalMaterial color={frameColor} metalness={metalness} roughness={roughness} clearcoat={clearcoat} clearcoatRoughness={clearcoatRoughness} envMapIntensity={envIntensity} />
          </mesh>
        </group>
      )}

      {/* Sliding guide tracks (სალასკები) - rendered for sliding pane configurations */}
      {panes.some((p) => p.openingType === 'Sliding') && (
        <group>
          {/* Bottom Track 1 */}
          <mesh position={[0, -h / 2 + frameThickness + 0.0025, frameDepth * 0.28]} castShadow={!mobile}>
            <boxGeometry args={[w - frameThickness * 2, 0.005, 0.008]} />
            <meshPhysicalMaterial color="#BCBCBC" metalness={1.0} roughness={0.08} />
          </mesh>
          {/* Bottom Track 2 */}
          <mesh position={[0, -h / 2 + frameThickness + 0.0025, -frameDepth * 0.28]} castShadow={!mobile}>
            <boxGeometry args={[w - frameThickness * 2, 0.005, 0.008]} />
            <meshPhysicalMaterial color="#BCBCBC" metalness={1.0} roughness={0.08} />
          </mesh>
          {/* Top Track 1 */}
          <mesh position={[0, h / 2 - frameThickness - 0.0025, frameDepth * 0.28]} castShadow={!mobile}>
            <boxGeometry args={[w - frameThickness * 2, 0.005, 0.008]} />
            <meshPhysicalMaterial color="#BCBCBC" metalness={1.0} roughness={0.08} />
          </mesh>
          {/* Top Track 2 */}
          <mesh position={[0, h / 2 - frameThickness - 0.0025, -frameDepth * 0.28]} castShadow={!mobile}>
            <boxGeometry args={[w - frameThickness * 2, 0.005, 0.008]} />
            <meshPhysicalMaterial color="#BCBCBC" metalness={1.0} roughness={0.08} />
          </mesh>
        </group>
      )}

      {/* Dual-color inner skin — thin slabs sitting just behind the outer
          frame on the inside-of-the-room side. Renders only when the user
          has picked an inner color different from the outer. */}
      {hasDualColor && (
        <group position={[0, 0, innerOffsetZ]}>
          <mesh position={[0, h / 2 - frameThickness / 2, 0]} castShadow={!mobile}>
            <boxGeometry args={[w, frameThickness, frameDepth * 0.5]} />
            <meshPhysicalMaterial color={innerHex} metalness={metalness} roughness={roughness} clearcoat={clearcoat} clearcoatRoughness={clearcoatRoughness} envMapIntensity={envIntensity} />
          </mesh>
          <mesh position={[0, -(h / 2) + frameThickness / 2, 0]} castShadow={!mobile}>
            <boxGeometry args={[w, frameThickness, frameDepth * 0.5]} />
            <meshPhysicalMaterial color={innerHex} metalness={metalness} roughness={roughness} clearcoat={clearcoat} clearcoatRoughness={clearcoatRoughness} envMapIntensity={envIntensity} />
          </mesh>
          <mesh position={[-w / 2 + frameThickness / 2, 0, 0]} castShadow={!mobile}>
            <boxGeometry args={[frameThickness, h, frameDepth * 0.5]} />
            <meshPhysicalMaterial color={innerHex} metalness={metalness} roughness={roughness} clearcoat={clearcoat} clearcoatRoughness={clearcoatRoughness} envMapIntensity={envIntensity} />
          </mesh>
          <mesh position={[w / 2 - frameThickness / 2, 0, 0]} castShadow={!mobile}>
            <boxGeometry args={[frameThickness, h, frameDepth * 0.5]} />
            <meshPhysicalMaterial color={innerHex} metalness={metalness} roughness={roughness} clearcoat={clearcoat} clearcoatRoughness={clearcoatRoughness} envMapIntensity={envIntensity} />
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
        const hasHandle = pane.openingType !== 'Fixed';
        const paneIndex = pane.position ?? i + 1;
        const clickState = paneClickStates[paneIndex] ?? 0;
        const isOpenable = pane.openingType !== 'Fixed';
        const handleClick = () => onPaneClick(paneIndex, pane.openingType);
        const isPaneHovered = hoveredPane === paneIndex;

        // Transom (Step 9) — when present, the pane area is split by a
        // horizontal mullion. Bottom sash gets the existing AnimatedPane
        // (with reduced height + downward offset); top sash renders as a
        // static frame + glass to keep v1 scene logic simple.
        const innerPaneH = h - frameThickness * 2;
        const hasTransom = pane.hasTransom === true;
        const transomRatio = hasTransom ? (pane.transomHeightRatio ?? 0.3) : 0;
        const transomMullionThickness = hasTransom ? frameThickness * 0.7 : 0;

        // Balcony block geometry — slug 'balcony', panes with index > 0
        // render the window above an insulated panel (bottom 40%) so they
        // sit at sill-height above the door's threshold. Pane index 0 is
        // the door (full height).
        const isBalconyWindowPane = productSlug === 'balcony' && i > 0 && !hasTransom;
        const balconyWindowRatio = isBalconyWindowPane ? 0.6 : 1;
        const balconyPanelH = isBalconyWindowPane ? innerPaneH * (1 - balconyWindowRatio) : 0;

        const bottomSashH = hasTransom
          ? innerPaneH * (1 - transomRatio) - transomMullionThickness / 2
          : isBalconyWindowPane
            ? innerPaneH * balconyWindowRatio
            : innerPaneH;
        const topSashH = hasTransom
          ? innerPaneH * transomRatio - transomMullionThickness / 2
          : 0;
        const bottomCenterY = hasTransom
          ? -innerPaneH / 2 + bottomSashH / 2
          : isBalconyWindowPane
            ? innerPaneH / 2 - bottomSashH / 2
            : 0;
        const topCenterY = hasTransom
          ? innerPaneH / 2 - topSashH / 2
          : 0;
        const transomVisual = hasTransom
          ? glassVisualFor(
              paneTint((pane.transomOpeningType ?? 'Fixed') as PaneOpeningType),
              pane.glassExtras ?? [],
              glass?.paneCount ?? 2,
              mobile,
            )
          : null;

        return (
          <group key={pane.position} position={[cx, 0, 0]}>
            {/* Mullion sits at the frame-fixed boundary, so it's outside
                the AnimatedPane wrapper — it shouldn't swing with the
                glass. Interactive mode lets the user grab it and drag
                horizontally to repartition the adjacent panes. The
                invisible thicker pick mesh is a separate sibling so the
                visible mullion still casts a clean shadow at its slim
                geometric size. */}
            {i < paneRects.length - 1 && (() => {
              const isMullionHovered = hoveredMullion === i;
              const isMullionDragging = draggingMullion === i;
              const isActive = isMullionHovered || isMullionDragging;
              const startMullionDrag = (e: ThreeEvent<PointerEvent>) => {
                if (!interactive?.panes.onRatiosChange) return;
                e.stopPropagation();
                // Block DragRotator's canvas-level pointerdown listener.
                // R3F's e.stopPropagation only stops R3F-side propagation;
                // the underlying DOM event still bubbles to DragRotator
                // and the whole model spins in tandem with the mullion drag.
                e.nativeEvent.stopImmediatePropagation();
                e.nativeEvent.preventDefault();
                interactionLockRef.current += 1;
                const startPx = e.nativeEvent.clientX;
                const startRatios = panes.map((p) => p.widthRatio);
                mullionDragRef.current = { mullionIdx: i, startPx, startRatios };
                setDraggingMullion(i);
                document.body.style.cursor = 'col-resize';
                const onMove = (ev: PointerEvent) => {
                  const drag = mullionDragRef.current;
                  if (drag === null || !interactive?.panes.onRatiosChange) return;
                  // 1 px ≈ 1 cm direct correspondence with the dim chip
                  // scrubbing. Shift slows to 4 px/cm for precision.
                  const scale = ev.shiftKey ? 0.25 : 1;
                  const deltaCm = (ev.clientX - drag.startPx) * scale;
                  const deltaRatio = deltaCm / Math.max(1, widthCm);
                  const minRatio = 0.08;
                  const next = drag.startRatios.slice();
                  const left = drag.startRatios[drag.mullionIdx]!;
                  const right = drag.startRatios[drag.mullionIdx + 1]!;
                  const total = left + right;
                  const newLeft = Math.min(total - minRatio, Math.max(minRatio, left + deltaRatio));
                  const newRight = total - newLeft;
                  next[drag.mullionIdx] = newLeft;
                  next[drag.mullionIdx + 1] = newRight;
                  interactive.panes.onRatiosChange(next);
                };
                const onUp = () => {
                  mullionDragRef.current = null;
                  setDraggingMullion(null);
                  interactionLockRef.current = Math.max(0, interactionLockRef.current - 1);
                  document.body.style.cursor = 'auto';
                  window.removeEventListener('pointermove', onMove);
                  window.removeEventListener('pointerup', onUp);
                  window.removeEventListener('pointercancel', onUp);
                };
                window.addEventListener('pointermove', onMove);
                window.addEventListener('pointerup', onUp);
                window.addEventListener('pointercancel', onUp);
              };
              return (
                <group position={[pw / 2, 0, 0]}>
                  {/* Visible mullion — colour shifts to a sky accent when
                      grabbed/hovered so the user reads it as draggable. */}
                  <mesh castShadow={!mobile}>
                    <boxGeometry args={[mullionThickness, h - frameThickness * 2, frameDepth]} />
                    <meshPhysicalMaterial
                      color={isActive ? '#7DD3FC' : frameColor}
                      metalness={metalness}
                      roughness={roughness}
                      clearcoat={clearcoat}
                      clearcoatRoughness={clearcoatRoughness}
                      envMapIntensity={envIntensity}
                      emissive={isActive ? '#4DA3FF' : '#000000'}
                      emissiveIntensity={isMullionDragging ? 0.35 : isMullionHovered ? 0.2 : 0}
                    />
                  </mesh>
                  {/* Invisible pick volume — ~6 cm wide centred on the
                      mullion. Gives the user a generous grab zone without
                      bloating the rendered mullion. */}
                  {interactive?.panes.onRatiosChange ? (
                    <mesh
                      onPointerOver={(e) => {
                        e.stopPropagation();
                        setHoveredMullion(i);
                        document.body.style.cursor = 'col-resize';
                      }}
                      onPointerOut={(e) => {
                        e.stopPropagation();
                        setHoveredMullion((cur) => (cur === i ? null : cur));
                        if (draggingMullion === null) document.body.style.cursor = 'auto';
                      }}
                      onPointerDown={startMullionDrag}
                    >
                      <boxGeometry args={[0.06, h - frameThickness * 2, frameDepth * 1.2]} />
                      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                    </mesh>
                  ) : null}
                </group>
              );
            })()}
            {/* Hinges live on the frame (static axis) — outside AnimatedPane
                so they don't swing with the glass. Sits forward of the frame
                so it reads against the dark window opening. */}
            <Hinges
              paneWidthM={pw}
              paneHeightM={bottomSashH}
              opening={pane.openingType}
              hingeSide={pane.hingeSide}
              frameDepth={frameDepth}
              mobile={mobile}
            />
            {/* Horizontal transom mullion — draggable along Y to adjust
                the top-sash height ratio. Same hover-glow + pick volume
                pattern as the vertical mullion. */}
            {hasTransom && (() => {
              const transomY = bottomCenterY + bottomSashH / 2 + transomMullionThickness / 2;
              const isTransomHov = hoveredTransom === paneIndex;
              const isTransomDrag = draggingTransom === paneIndex;
              const isTransomActive = isTransomHov || isTransomDrag;
              const startTransomDrag = (e: ThreeEvent<PointerEvent>) => {
                if (!interactive?.panes.onTransomRatioChange) return;
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                e.nativeEvent.preventDefault();
                interactionLockRef.current += 1;
                const startRatio = pane.transomHeightRatio ?? 0.3;
                transomDragRef.current = {
                  paneIdx: paneIndex,
                  startPxY: e.nativeEvent.clientY,
                  startRatio,
                  innerPaneHCm: innerPaneH * 100,
                };
                setDraggingTransom(paneIndex);
                document.body.style.cursor = 'ns-resize';
                const onMove = (ev: PointerEvent) => {
                  const drag = transomDragRef.current;
                  if (drag === null || !interactive?.panes.onTransomRatioChange) return;
                  const scale = ev.shiftKey ? 0.25 : 1;
                  // Drag down = mouse-Y increases = top sash gets larger
                  // (ratio increases). Drag up = top sash shrinks.
                  const deltaY = (ev.clientY - drag.startPxY) * scale;
                  const deltaRatio = deltaY / Math.max(1, drag.innerPaneHCm);
                  const newRatio = Math.min(0.5, Math.max(0.1, drag.startRatio + deltaRatio));
                  interactive.panes.onTransomRatioChange(drag.paneIdx, newRatio);
                };
                const onUp = () => {
                  transomDragRef.current = null;
                  setDraggingTransom(null);
                  interactionLockRef.current = Math.max(0, interactionLockRef.current - 1);
                  document.body.style.cursor = 'auto';
                  window.removeEventListener('pointermove', onMove);
                  window.removeEventListener('pointerup', onUp);
                  window.removeEventListener('pointercancel', onUp);
                };
                window.addEventListener('pointermove', onMove);
                window.addEventListener('pointerup', onUp);
                window.addEventListener('pointercancel', onUp);
              };
              return (
                <group position={[0, transomY, 0]}>
                  <mesh castShadow={!mobile}>
                    <boxGeometry args={[pw, transomMullionThickness, frameDepth]} />
                    <meshPhysicalMaterial
                      color={isTransomActive ? '#7DD3FC' : frameColor}
                      metalness={metalness}
                      roughness={roughness}
                      clearcoat={clearcoat}
                      clearcoatRoughness={clearcoatRoughness}
                      envMapIntensity={envIntensity}
                      emissive={isTransomActive ? '#4DA3FF' : '#000000'}
                      emissiveIntensity={isTransomDrag ? 0.35 : isTransomHov ? 0.2 : 0}
                    />
                  </mesh>
                  {interactive?.panes.onTransomRatioChange ? (
                    <mesh
                      onPointerOver={(e) => {
                        e.stopPropagation();
                        setHoveredTransom(paneIndex);
                        document.body.style.cursor = 'ns-resize';
                      }}
                      onPointerOut={(e) => {
                        e.stopPropagation();
                        setHoveredTransom((cur) => (cur === paneIndex ? null : cur));
                        if (draggingTransom === null) document.body.style.cursor = 'auto';
                      }}
                      onPointerDown={startTransomDrag}
                    >
                      <boxGeometry args={[pw, 0.08, frameDepth * 1.2]} />
                      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                    </mesh>
                  ) : null}
                </group>
              );
            })()}
            {/* Balcony insulated bottom panel — sits below the window
                sash on the second pane of a balcony block. Renders as a
                solid frame-colored box with a horizontal divider rail
                separating it from the sash above. */}
            {isBalconyWindowPane && (
              <>
                <mesh
                  position={[0, -innerPaneH / 2 + balconyPanelH / 2, 0]}
                  castShadow={!mobile}
                  receiveShadow={!mobile}
                >
                  <boxGeometry args={[pw, balconyPanelH, frameDepth * 0.85]} />
                  <meshPhysicalMaterial color={frameColor} metalness={metalness} roughness={roughness} clearcoat={clearcoat} clearcoatRoughness={clearcoatRoughness} envMapIntensity={envIntensity} />
                </mesh>
                {/* Horizontal divider rail — separates the sash from the
                    insulated panel. Matches the mullion thickness so the
                    profile reads consistently. */}
                <mesh
                  position={[0, -innerPaneH / 2 + balconyPanelH + mullionThickness / 2, 0]}
                  castShadow={!mobile}
                >
                  <boxGeometry args={[pw, mullionThickness, frameDepth]} />
                  <meshPhysicalMaterial color={frameColor} metalness={metalness} roughness={roughness} clearcoat={clearcoat} clearcoatRoughness={clearcoatRoughness} envMapIntensity={envIntensity} />
                </mesh>
              </>
            )}
            {/* Static top transom sash — sash frame + glass pack. No
                click-to-open animation in v1; the bottom sash animates. */}
            {hasTransom && transomVisual && (
              <group position={[0, topCenterY, 0]}>
                <SashFrame
                  paneWidthM={pw}
                  paneHeightM={topSashH}
                  thickness={sashThickness}
                  depth={frameDepth * 0.9}
                  color={frameColor}
                  metalness={metalness}
                  roughness={roughness}
                  clearcoat={clearcoat}
                  clearcoatRoughness={clearcoatRoughness}
                  mobile={mobile}
                />
                {/* Transom glass gasket — 4 thin perimeter strips, not a solid panel. */}
                <GlassEdgeBezel
                  widthM={Math.max(0, pw - glassInset + (isAluminum ? 0.008 : 0.012))}
                  heightM={Math.max(0, topSashH - glassInset + (isAluminum ? 0.008 : 0.012))}
                />
                <mesh receiveShadow={!mobile}>
                  <boxGeometry
                    args={[
                      Math.max(0, pw - glassInset),
                      Math.max(0, topSashH - glassInset),
                      0.025,
                    ]}
                  />
                  <meshPhysicalMaterial
                    color={transomVisual.color}
                    transparent
                    opacity={transomVisual.opacity}
                    transmission={transomVisual.transmission}
                    ior={1.52}
                    thickness={0.05}
                    roughness={transomVisual.roughness}
                    metalness={0.0}
                    clearcoat={1.0}
                    clearcoatRoughness={0.05}
                    envMapIntensity={mobile ? 0.9 : 2.0}
                  />
                </mesh>
              </group>
            )}
            {/* Sliding sashes run on staggered Z tracks (lasaks) to prevent clipping.
                Track Z positions align with the guide tracks (frameDepth * 0.28). */}
            <group
              position={[
                0,
                bottomCenterY,
                pane.openingType === 'Sliding'
                  ? (i % 2 === 0 ? frameDepth * 0.28 : -frameDepth * 0.28)
                  : 0,
              ]}
            >
              <AnimatedPane
                paneWidthM={pw}
                paneHeightM={bottomSashH}
                opening={pane.openingType}
                hingeSide={pane.hingeSide}
                open={open}
                clickState={clickState}
                reducedMotion={reducedMotion}
                glassInset={glassInset}
                outerFrameHeightM={h}
                frameDepth={frameDepth}
                paneIndex={i}
                panesCount={paneRects.length}
              >
                {/* Sash frame — 4 inner slabs forming the swinging sash
                    profile around the glass. PVC chunkier (0.055m) vs
                    aluminum slim (0.04m); both extruded forward slightly
                    so the sash sits proud of the outer frame plane. */}
                <SashFrame
                  paneWidthM={pw}
                  paneHeightM={bottomSashH}
                  thickness={sashThickness}
                  depth={pane.openingType === 'Sliding' ? frameDepth * 0.45 : frameDepth * 0.9}
                  color={frameColor}
                  metalness={metalness}
                  roughness={roughness}
                  clearcoat={clearcoat}
                  clearcoatRoughness={clearcoatRoughness}
                  mobile={mobile}
                />
                {/* Glass gasket — 4 thin perimeter strips, not a solid panel. */}
                <GlassEdgeBezel
                  widthM={Math.max(0, pw - glassInset + (isAluminum ? 0.008 : 0.012))}
                  heightM={Math.max(0, bottomSashH - glassInset + (isAluminum ? 0.008 : 0.012))}
                />
                {/* Double-glazing pack — a slim box giving the glass
                    visible depth, plus a clickable mesh on the front
                    face for the open/close interaction. Pointer-over/out
                    also drives the per-pane hover state so the opening-
                    type chip appears only when the user is looking at
                    that pane (Sprint A polish, 2026-05-28). */}
                <mesh
                  receiveShadow={!mobile}
                  onClick={isOpenable ? (e) => { e.stopPropagation(); handleClick(); } : undefined}
                  onPointerOver={(e) => {
                    e.stopPropagation();
                    setHoverPane(paneIndex);
                    document.body.style.cursor = isOpenable ? 'pointer' : 'default';
                  }}
                  onPointerOut={(e) => {
                    e.stopPropagation();
                    setHoverPane(null);
                    document.body.style.cursor = 'auto';
                  }}
                >
                  <boxGeometry
                    args={[
                      Math.max(0, pw - glassInset),
                      Math.max(0, bottomSashH - glassInset),
                      0.025,
                    ]}
                  />
                  <meshPhysicalMaterial
                    color={visual.color}
                    transparent
                    opacity={visual.opacity}
                    transmission={visual.transmission}
                    ior={1.52}
                    thickness={0.05}
                    roughness={visual.roughness}
                    metalness={0.0}
                    clearcoat={1.0}
                    clearcoatRoughness={0.05}
                    envMapIntensity={mobile ? 0.9 : 2.0}
                    emissive={isPaneHovered && isOpenable ? '#4DA3FF' : '#000000'}
                    emissiveIntensity={isPaneHovered && isOpenable ? 0.18 : 0}
                  />
                </mesh>
                {hasHandle && (
                  <>
                    {/* Interior handle */}
                    <Handle
                      paneWidthM={pw}
                      paneHeightM={bottomSashH}
                      hingeSide={pane.hingeSide}
                      opening={pane.openingType}
                      clickState={clickState}
                      open={open}
                      frameDepth={frameDepth}
                      mobile={mobile}
                      isExterior={false}
                      sashThickness={sashThickness}
                      paneIndex={i}
                      panesCount={paneRects.length}
                    />
                    {/* Exterior handle — rendered only for doors (door slug or first section of balcony) */}
                    {(productSlug === 'door' || (productSlug === 'balcony' && i === 0)) && (
                      <Handle
                        paneWidthM={pw}
                        paneHeightM={bottomSashH}
                        hingeSide={pane.hingeSide}
                        opening={pane.openingType}
                        clickState={clickState}
                        open={open}
                        frameDepth={frameDepth}
                        mobile={mobile}
                        isExterior={true}
                        sashThickness={sashThickness}
                        paneIndex={i}
                        panesCount={paneRects.length}
                      />
                    )}
                  </>
                )}
              </AnimatedPane>
            </group>

            {/* Live per-pane width label — shown only while the user is
                actively dragging a mullion. Sits at the pane's vertical
                centre forward of the glass so it stays readable against
                whatever's behind. */}
            {draggingMullion !== null ? (
              <Html
                position={[0, 0, frameDepth * 0.7]}
                center
                zIndexRange={[120, 0]}
                style={{ pointerEvents: 'none' }}
              >
                <div className="select-none rounded-md border border-sky-300/60 bg-slate-950/85 px-1.5 py-0.5 font-mono text-[11px] font-bold text-sky-100 shadow-[0_0_18px_rgba(125,211,252,0.55)] backdrop-blur animate-in fade-in zoom-in-90 duration-150">
                  {Math.round(pw * 100)} სმ
                </div>
              </Html>
            ) : null}
            {/* Live top + bottom sash height labels — shown while the
                user is dragging this pane's transom. Anchored to each
                sash centre so the cm value follows the geometry. */}
            {hasTransom && draggingTransom === paneIndex ? (
              <>
                <Html
                  position={[0, topCenterY, frameDepth * 0.7]}
                  center
                  zIndexRange={[120, 0]}
                  style={{ pointerEvents: 'none' }}
                >
                  <div className="select-none rounded-md border border-sky-300/60 bg-slate-950/85 px-1.5 py-0.5 font-mono text-[11px] font-bold text-sky-100 shadow-[0_0_18px_rgba(125,211,252,0.55)] backdrop-blur animate-in fade-in zoom-in-90 duration-150">
                    {Math.round(topSashH * 100)} სმ
                  </div>
                </Html>
                <Html
                  position={[0, bottomCenterY, frameDepth * 0.7]}
                  center
                  zIndexRange={[120, 0]}
                  style={{ pointerEvents: 'none' }}
                >
                  <div className="select-none rounded-md border border-sky-300/60 bg-slate-950/85 px-1.5 py-0.5 font-mono text-[11px] font-bold text-sky-100 shadow-[0_0_18px_rgba(125,211,252,0.55)] backdrop-blur animate-in fade-in zoom-in-90 duration-150">
                    {Math.round(bottomSashH * 100)} სმ
                  </div>
                </Html>
              </>
            ) : null}
            {/* Per-pane opening chip — small glassmorphic capsule
                centered over the sash. Sits forward of the glass
                (slightly toward the camera) so it reads on rotation.
                Hidden when the section is too narrow to fit the chip
                without overlapping a neighbor — the right panel
                carries the same dropdown as a fallback. */}
            {interactive && (pw > 0.35 || mobile) ? (
              <PaneDropdownBadge
                paneIndex={paneIndex}
                options={interactive.panes.options}
                currentValue={interactive.panes.valueFor(pane)}
                onChange={interactive.panes.onChange}
                onSplit={
                  interactive.panes.onSplit
                    ? () => interactive.panes.onSplit!(paneIndex)
                    : undefined
                }
                canSplit={interactive.panes.canSplit}
                onSetTransom={
                  interactive.panes.onSetTransom
                    ? (v: boolean) => interactive.panes.onSetTransom!(paneIndex, v)
                    : undefined
                }
                hasTransom={hasTransom}
                bottomCenterY={bottomCenterY}
                frameDepth={frameDepth}
                isHovered={hoveredPane === paneIndex}
                isMobile={mobile}
              />
            ) : null}
          </group>
        );
      })}

      {/* In-scene W/H number inputs — anchored clearly OUTSIDE the
          frame so they never overlap the model. W chip sits above the
          top edge with an extension line down to the corners; H chip
          sits to the right of the frame and is rotated 90° so it reads
          vertically (architectural-blueprint convention). */}
      {interactive ? (() => {
        const offsetDistance = mobile ? 0.45 : 0.75;
        const dims = interactive.dimensions;
        // Pixels-per-centimetre for drag scrubbing. 1 px ≈ 1 cm gives the
        // user a direct sense of touch: a 100 px drag changes the
        // dimension by 1 m. Holding Shift slows to 4 px/cm for precision.
        const startDragWidth = (e: React.PointerEvent) => {
          e.preventDefault();
          e.stopPropagation();
          interactionLockRef.current += 1;
          resizeStartRef.current = { axis: 'w', startPx: e.clientX, startCm: dims.widthCm };
          setIsResizing(true);
          const onMove = (ev: PointerEvent) => {
            const s = resizeStartRef.current;
            if (s === null) return;
            const scale = ev.shiftKey ? 0.25 : 1;
            const delta = (ev.clientX - s.startPx) * scale;
            const v = Math.round(s.startCm + delta);
            dims.onWidthChange(Math.min(dims.maxWidthCm, Math.max(dims.minWidthCm, v)));
          };
          const onUp = () => {
            resizeStartRef.current = null;
            setIsResizing(false);
            interactionLockRef.current = Math.max(0, interactionLockRef.current - 1);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
          };
          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onUp);
          window.addEventListener('pointercancel', onUp);
        };
        const startDragHeight = (e: React.PointerEvent) => {
          e.preventDefault();
          e.stopPropagation();
          interactionLockRef.current += 1;
          resizeStartRef.current = { axis: 'h', startPx: e.clientY, startCm: dims.heightCm };
          setIsResizing(true);
          const onMove = (ev: PointerEvent) => {
            const s = resizeStartRef.current;
            if (s === null) return;
            const scale = ev.shiftKey ? 0.25 : 1;
            // Drag UP increases height (matches screen-space intuition).
            const delta = (s.startPx - ev.clientY) * scale;
            const v = Math.round(s.startCm + delta);
            dims.onHeightChange(Math.min(dims.maxHeightCm, Math.max(dims.minHeightCm, v)));
          };
          const onUp = () => {
            resizeStartRef.current = null;
            setIsResizing(false);
            interactionLockRef.current = Math.max(0, interactionLockRef.current - 1);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
          };
          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onUp);
          window.addEventListener('pointercancel', onUp);
        };
        const chipBaseClass = 'flex items-center gap-0.5 rounded-md border bg-studio-ink/85 shadow-md backdrop-blur transition-all duration-150';
        const chipActiveClass = isResizing
          ? 'border-sky-300 shadow-[0_0_22px_rgba(96,165,250,0.65)] scale-110 text-white'
          : 'border-studio-brand/50 text-studio-brand-soft';
        return (
          <>
            {/* Live wireframe ring around the model bounds — pulses only
                while the user is mid-resize, providing the architectural
                "ghost outline" cue. Drawn just behind the frame plane so
                it reads as a halo, not an obstruction. */}
            {isResizing ? (
              <Line
                points={[
                  [-w / 2, -h / 2, frameDepth / 2 + 0.05],
                  [w / 2, -h / 2, frameDepth / 2 + 0.05],
                  [w / 2, h / 2, frameDepth / 2 + 0.05],
                  [-w / 2, h / 2, frameDepth / 2 + 0.05],
                  [-w / 2, -h / 2, frameDepth / 2 + 0.05],
                ]}
                color="#7DD3FC"
                lineWidth={3}
                transparent
                opacity={0.9}
              />
            ) : null}
            {/* W dimension extension lines — two short verticals from the
                frame corners up to the chip's y, then a horizontal across.
                Rendered as a single polyline so they orbit with the model. */}
            <Line
              points={[
                [-w / 2, h / 2, 0],
                [-w / 2, h / 2 + offsetDistance, 0],
                [w / 2, h / 2 + offsetDistance, 0],
                [w / 2, h / 2, 0],
              ]}
              color={isResizing ? '#7DD3FC' : '#60A5FA'}
              lineWidth={isResizing ? 1.5 : 1}
              transparent
              opacity={isResizing ? 0.8 : 0.4}
            />
            <Html
              position={[0, h / 2 + offsetDistance, 0]}
              center
              zIndexRange={[100, 0]}
              style={{ pointerEvents: 'auto' }}
            >
              {/* W chip — drag the GripHorizontal handle on the left to
                  scrub width live. Click the input to type. */}
              <div className={`${chipBaseClass} ${chipActiveClass} px-1 py-0.5`}>
                <button
                  onPointerDown={startDragWidth}
                  style={{ cursor: 'ew-resize', touchAction: 'none' }}
                  className="flex items-center justify-center px-0.5 opacity-70 hover:opacity-100 hover:text-sky-200 transition-opacity"
                  title="ჩაიჭირე და გადაიყვანე ზომის შესაცვლელად (Shift = ნელი)"
                  aria-label="გადატანით სიგანის შეცვლა"
                >
                  <GripHorizontal className="h-2.5 w-3" />
                </button>
                <input
                  type="number"
                  value={dims.widthCm}
                  min={dims.minWidthCm}
                  max={dims.maxWidthCm}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!Number.isNaN(v)) {
                      dims.onWidthChange(
                        Math.min(dims.maxWidthCm, Math.max(dims.minWidthCm, v)),
                      );
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-10 bg-transparent text-center font-mono text-[11px] outline-none"
                  aria-label="სიგანე სმ"
                />
              </div>
            </Html>
            {/* H dimension extension lines — two horizontals from the right
                corners out to the chip's x, then a vertical between. */}
            <Line
              points={[
                [w / 2, h / 2, 0],
                [w / 2 + offsetDistance, h / 2, 0],
                [w / 2 + offsetDistance, -h / 2, 0],
                [w / 2, -h / 2, 0],
              ]}
              color={isResizing ? '#7DD3FC' : '#60A5FA'}
              lineWidth={isResizing ? 1.5 : 1}
              transparent
              opacity={isResizing ? 0.8 : 0.4}
            />
            <Html
              position={[w / 2 + offsetDistance, 0, 0]}
              center
              zIndexRange={[100, 0]}
              style={{ pointerEvents: 'auto' }}
            >
              {/* H chip — drag the GripVertical handle to scrub height
                  live (drag up = taller). Click input to type. */}
              <div className={`${chipBaseClass} ${chipActiveClass} px-1 py-0.5`}>
                <button
                  onPointerDown={startDragHeight}
                  style={{ cursor: 'ns-resize', touchAction: 'none' }}
                  className="flex items-center justify-center px-0.5 opacity-70 hover:opacity-100 hover:text-sky-200 transition-opacity"
                  title="ჩაიჭირე და გადაიყვანე ზომის შესაცვლელად (Shift = ნელი)"
                  aria-label="გადატანით სიმაღლის შეცვლა"
                >
                  <GripVertical className="h-3 w-2.5" />
                </button>
                <input
                  type="number"
                  value={dims.heightCm}
                  min={dims.minHeightCm}
                  max={dims.maxHeightCm}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!Number.isNaN(v)) {
                      dims.onHeightChange(
                        Math.min(dims.maxHeightCm, Math.max(dims.minHeightCm, v)),
                      );
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-10 bg-transparent text-center font-mono text-[11px] outline-none"
                  aria-label="სიმაღლე სმ"
                />
              </div>
            </Html>
          </>
        );
      })() : null}
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
  clickState,
  reducedMotion,
  glassInset,
  outerFrameHeightM,
  frameDepth,
  paneIndex,
  panesCount,
  children,
}: {
  paneWidthM: number;
  paneHeightM: number;
  opening: PaneOpeningType;
  hingeSide: HingeSide | null | undefined;
  open: boolean;
  /**
   * Per-pane click cycle index (Lasha's mockup interaction):
   *   - Casement/Door/Tilt/Sliding: 0 = closed, 1 = open
   *   - TiltAndTurn: 0 = closed, 1 = turn, 2 = tilt
   * Defaults to 0 in both legacy wizard and LiveStudio — but in LiveStudio
   * clicking a pane increments it. When > 0, this state takes precedence
   * over the global `open` toggle + the breathing animation.
   */
  clickState?: number;
  reducedMotion: boolean;
  glassInset: number;
  outerFrameHeightM: number;
  frameDepth: number;
  paneIndex: number;
  panesCount: number;
  children: React.ReactNode;
}) {
  const slideRef = useRef<Group>(null);
  const turnRef = useRef<Group>(null);
  const tiltRef = useRef<Group>(null);

  // Spring physics states (current values and velocities)
  const currentRotY = useRef(0);
  const velocityRotY = useRef(0);
  const currentRotX = useRef(0);
  const velocityRotX = useRef(0);
  const currentTx = useRef(0);
  const velocityTx = useRef(0);

  // Rotation pivot aligned exactly with the physical hinge axis (-frameDepth / 2)
  const pivotZ = -frameDepth / 2;

  // Direction signs per opening type. Stored once so the per-frame loop stays
  // allocation-free. swingSign convention:
  //   Camera at +Z (viewer is outside the building looking at the window).
  //   "Open" = sash swings inward TOWARD the camera (the off-hinge edge
  //   visibly comes forward, hinge edge stays planted on the frame).
  //   For LEFT hinge, the right edge swings to +Z → that's a CLOCKWISE Y
  //   rotation viewed from +Y → swingSign = -1.
  //   For RIGHT hinge, the left edge swings to +Z → counter-clockwise →
  //   swingSign = +1.
  const rig = useMemo(() => {
    const pivotX = hingeSide === 'Left' ? -paneWidthM / 2 : paneWidthM / 2;
    const pivotY = -paneHeightM / 2;

    if (opening === 'Casement' || opening === 'TiltAndTurn') {
      const swingSign = hingeSide === 'Left' ? -1 : 1;
      return {
        type: 'rotY' as const,
        swingSign,
        pivotX,
        pivotY,
        pivotZ,
      };
    }
    if (opening === 'Tilt') {
      return {
        type: 'rotX' as const,
        swingSign: -1,
        pivotX: 0,
        pivotY,
        pivotZ,
      };
    }
    if (opening === 'Sliding') {
      // Staggered opening direction inside the frame:
      // Left-most sashes slide right, right-most slide left, so they open inside the frame.
      // Explicit hingeSide overrides: 'Right' -> slide right (+1), 'Left' -> slide left (-1).
      const defaultSign = paneIndex < panesCount / 2 ? 1 : -1;
      const swingSign = hingeSide === 'Right' ? 1 : (hingeSide === 'Left' ? -1 : defaultSign);
      return {
        type: 'slide' as const,
        swingSign,
        pivotX: 0,
        pivotY: 0,
        pivotZ: 0,
      };
    }
    return {
      type: 'fixed' as const,
      swingSign: 1,
      pivotX: 0,
      pivotY: 0,
      pivotZ: 0,
    };
  }, [opening, hingeSide, paneWidthM, paneHeightM, pivotZ, paneIndex, panesCount]);

  // Reset refs rotation and position if opening changes to Fixed or type changes
  useEffect(() => {
    const slide = slideRef.current;
    const turn = turnRef.current;
    const tilt = tiltRef.current;
    if (slide) slide.position.set(0, 0, 0);
    if (turn) {
      turn.rotation.set(0, 0, 0);
      turn.position.set(rig.pivotX, 0, rig.pivotZ);
    }
    if (tilt) {
      tilt.rotation.set(0, 0, 0);
      tilt.position.set(0, rig.pivotY, rig.pivotZ);
    }
    currentRotY.current = 0;
    velocityRotY.current = 0;
    currentRotX.current = 0;
    velocityRotX.current = 0;
    currentTx.current = 0;
    velocityTx.current = 0;
  }, [rig]);

  // Compute the current target each frame. Three regimes:
  //   - clickState > 0  →  click-locked pose (LiveStudio only):
  //                        TiltAndTurn cycles 1=turn, 2=tilt; others 1=open.
  //                        No breathing while held open.
  //   - open=true       →  global "open all" toggle: full pose (75° / 15° / 70% slide).
  //   - open=false      →  breathing ±12° (or 8% slide-out) with |sin(πt/3)|.
  useFrame((state, delta) => {
    const slide = slideRef.current;
    const turn = turnRef.current;
    const tilt = tiltRef.current;
    if (!slide || !turn || !tilt || rig.type === 'fixed') return;

    const dt = Math.min(0.05, delta); // Clamp delta to avoid explosions during frames drops
    const time = state.clock.elapsedTime;
    // |sin| over a half-period of 3s gives 0 → 1 → 0 every 3 seconds.
    const breath = Math.abs(Math.sin((time * Math.PI) / 3));
    const clicked = (clickState ?? 0) > 0;

    let targetRotY = 0;
    let targetRotX = 0;
    let targetTx = 0;

    if (rig.type === 'rotY') {
      const breathAngle = (Math.PI / 180) * 5 * breath * rig.swingSign;
      const openAngle = (Math.PI / 180) * 80 * rig.swingSign;
      if (clicked) {
        if (opening === 'TiltAndTurn' && clickState === 2) {
          targetRotX = -(Math.PI / 180) * 15;
          targetRotY = 0;
        } else {
          targetRotY = openAngle;
        }
      } else {
        targetRotY = open ? openAngle : breathAngle;
      }
    } else if (rig.type === 'rotX') {
      const breathAngle = (Math.PI / 180) * 4 * breath * rig.swingSign;
      const openAngle = (Math.PI / 180) * 28 * rig.swingSign;
      if (clicked) targetRotX = openAngle;
      else targetRotX = open ? openAngle : breathAngle;
    } else {
      // slide
      const breathTx = 0.02 * paneWidthM * breath * rig.swingSign;
      const openTx = 0.7 * paneWidthM * rig.swingSign;
      if (clicked) targetTx = openTx;
      else targetTx = open ? openTx : breathTx;
    }

    if (reducedMotion) {
      const staticPose = clicked || open ? 1.0 : 0.25;
      currentRotY.current = targetRotY * staticPose;
      currentRotX.current = targetRotX * staticPose;
      currentTx.current = targetTx * staticPose;
      velocityRotY.current = 0;
      velocityRotX.current = 0;
      velocityTx.current = 0;
      turn.rotation.y = currentRotY.current;
      tilt.rotation.x = currentRotX.current;
      slide.position.x = currentTx.current;
      return;
    }

    // Solve Spring equations for smooth physical animations:
    // mass = 1.0
    const stiffness = 36.0; // Spring stiffness tension (stiff but heavy feel)
    const damping = 9.5;    // Spring damping resistance (slight elegant recoil bounce at targets)

    // Y Rotation Spring
    const fRotY = -stiffness * (currentRotY.current - targetRotY) - damping * velocityRotY.current;
    velocityRotY.current += fRotY * dt;
    currentRotY.current += velocityRotY.current * dt;
    turn.rotation.y = currentRotY.current;

    // X Rotation Spring
    const fRotX = -stiffness * (currentRotX.current - targetRotX) - damping * velocityRotX.current;
    velocityRotX.current += fRotX * dt;
    currentRotX.current += velocityRotX.current * dt;
    tilt.rotation.x = currentRotX.current;

    // Slide Translation Spring
    const fTx = -stiffness * (currentTx.current - targetTx) - damping * velocityTx.current;
    velocityTx.current += fTx * dt;
    currentTx.current += velocityTx.current * dt;
    slide.position.x = currentTx.current;
  });

  void glassInset;
  void outerFrameHeightM;

  return (
    <group ref={slideRef}>
      <group ref={turnRef} position={[rig.pivotX, 0, rig.pivotZ]}>
        <group position={[-rig.pivotX, 0, -rig.pivotZ]}>
          <group ref={tiltRef} position={[0, rig.pivotY, rig.pivotZ]}>
            <group position={[0, -rig.pivotY, -rig.pivotZ]}>
              {children}
            </group>
          </group>
        </group>
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
  frameDepth,
  mobile,
}: {
  paneWidthM: number;
  paneHeightM: number;
  opening: PaneOpeningType;
  hingeSide: HingeSide | null | undefined;
  frameDepth: number;
  mobile: boolean;
}) {
  if (opening === 'Fixed' || opening === 'Sliding') return null;
  // Skip on extremely narrow panes — keeps mini schematic-style renders clean.
  if (paneWidthM < 0.18 || paneHeightM < 0.3) return null;

  const radiusM = 0.015; // 1.5cm
  const lengthM = 0.08; // 8cm
  const inset = 0.08; // pull hinges away from the very corner so they read as discrete pivots
  const z = -frameDepth / 2; // on the interior room-side face

  if (opening === 'Casement' || opening === 'TiltAndTurn') {
    const sign = hingeSide === 'Left' ? -1 : 1;
    const x = (sign * paneWidthM) / 2;
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
            rotation={[0, 0, 0]}
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
  return (
    <>
      <mesh position={[-paneWidthM / 2 + inset, y, z]} rotation={[0, 0, Math.PI / 2]} castShadow={!mobile}>
        <cylinderGeometry args={[radiusM, radiusM, lengthM, 16]} />
        <meshPhysicalMaterial color="#9A9A9A" metalness={1} roughness={0.2} />
      </mesh>
      <mesh position={[paneWidthM / 2 - inset, y, z]} rotation={[0, 0, Math.PI / 2]} castShadow={!mobile}>
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
function CameraRig({
  widthM,
  heightM,
  interactive,
}: {
  widthM: number;
  heightM: number;
  interactive?: boolean;
}) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const { gl } = useThree();
  const aspect = useThree((s) => s.viewport.aspect);

  const zoomFactorRef = useRef(1.0);

  useEffect(() => {
    const canvas = gl.domElement;

    const getTouchDistance = (e: TouchEvent) => {
      if (e.touches.length < 2) return 0;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomFactorRef.current = Math.max(0.3, Math.min(zoomFactorRef.current + e.deltaY * 0.0015, 3.0));
    };

    let initialTouchDistance = 0;
    let initialZoomValue = 1.0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialTouchDistance = getTouchDistance(e);
        initialZoomValue = zoomFactorRef.current;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialTouchDistance > 0) {
        e.preventDefault();
        const currentDistance = getTouchDistance(e);
        if (currentDistance > 0) {
          const ratio = initialTouchDistance / currentDistance;
          zoomFactorRef.current = Math.max(0.3, Math.min(initialZoomValue * ratio, 3.0));
        }
      }
    };

    const handleTouchEnd = () => {
      initialTouchDistance = 0;
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: true });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [gl]);

  const target = useMemo(() => {
    const fov = 35;
    const fovRad = (fov * Math.PI) / 180;
    // LiveStudio panels eat ~340px on each side at desktop; aim for the
    // model to fill ~42% of the visible middle (closer/larger than the
    // earlier 55% — Lasha wanted the model to read large). The wizard's
    // tighter aspect-square layout keeps its 65% fill.
    // Zoom in closer on mobile portrait aspect ratios (aspect < 1) so the window reads large and inputs don't cover it
    const fillFactor = interactive ? (aspect < 1 ? 0.82 : 0.45) : 0.65;
    const distForHeight = heightM / (2 * Math.tan(fovRad / 2) * fillFactor);
    // Horizontal FOV = 2*atan(tan(vFov/2)*aspect); the per-axis distance
    // that just-fits widthM is widthM / (2*tan(vFov/2)*aspect*fillFactor).
    const distForWidth = widthM / (2 * Math.tan(fovRad / 2) * (aspect || 1) * fillFactor);
    const dist = Math.max(distForHeight, distForWidth, 1.8);
    // Interactive (LiveStudio) — center the model in the canvas, no
    // top-down look-down (which previously dragged the window to the
    // bottom edge). Legacy wizard keeps the slight 3/4 elevation.
    if (interactive) {
      const isPortrait = aspect < 1;
      if (isPortrait) {
        return {
          x: 0,
          y: heightM / 2,
          z: dist,
        };
      }
      return {
        x: dist * 0.25,
        y: heightM / 2 + dist * 0.04,
        z: dist * 0.97,
      };
    }
    return {
      x: dist * 0.55,
      y: heightM / 2 + dist * 0.18,
      z: dist * 0.95,
    };
  }, [widthM, heightM, aspect, interactive]);

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

  useFrame((_, delta) => {
    if (!settled.current) return;
    // Framerate-independent damping — 4*delta gives a slower ease than the
    // sash animation (10*delta) so the camera glides rather than snaps when
    // Step-3 dimensions change.
    const tau = Math.min(1, 4 * delta);
    const zoom = zoomFactorRef.current;

    const centerX = 0;
    const centerY = heightM / 2;
    const centerZ = 0;

    const targetX = centerX + (target.x - centerX) * zoom;
    const targetY = centerY + (target.y - centerY) * zoom;
    const targetZ = centerZ + (target.z - centerZ) * zoom;

    camera.position.x += (targetX - camera.position.x) * tau;
    camera.position.y += (targetY - camera.position.y) * tau;
    camera.position.z += (targetZ - camera.position.z) * tau;
    camera.lookAt(0, heightM / 2, 0);
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
/**
 * Sash frame — 4 box slabs forming the swinging sash profile around the
 * glass. Lives INSIDE AnimatedPane so it rotates/translates with the
 * glass on open/close (real sashes carry the glass; the outer frame
 * stays fixed). Thickness + depth come from the parent, which sizes
 * them differently per material family (PVC chunky, aluminum slim).
 */
function SashFrame({
  paneWidthM,
  paneHeightM,
  thickness,
  depth,
  color,
  metalness,
  roughness,
  clearcoat,
  clearcoatRoughness,
  mobile,
}: {
  paneWidthM: number;
  paneHeightM: number;
  thickness: number;
  depth: number;
  color: string;
  metalness: number;
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  mobile: boolean;
}) {
  if (paneWidthM <= 2 * thickness || paneHeightM <= 2 * thickness) return null;
  // Sash slab depth is slightly bigger than the outer frame depth on
  // the -Z side so the sash visibly sits forward of the outer frame
  // when closed (real sashes overlap the frame stop).
  const zOffset = -depth * 0.15;
  const envIntensity = mobile ? 0.6 : 1.2;
  return (
    <group position={[0, 0, zOffset]}>
      {/* Top slab */}
      <mesh position={[0, paneHeightM / 2 - thickness / 2, 0]} castShadow={!mobile}>
        <boxGeometry args={[paneWidthM, thickness, depth]} />
        <meshPhysicalMaterial color={color} metalness={metalness} roughness={roughness} clearcoat={clearcoat} clearcoatRoughness={clearcoatRoughness} envMapIntensity={envIntensity} />
      </mesh>
      {/* Bottom slab */}
      <mesh position={[0, -paneHeightM / 2 + thickness / 2, 0]} castShadow={!mobile}>
        <boxGeometry args={[paneWidthM, thickness, depth]} />
        <meshPhysicalMaterial color={color} metalness={metalness} roughness={roughness} clearcoat={clearcoat} clearcoatRoughness={clearcoatRoughness} envMapIntensity={envIntensity} />
      </mesh>
      {/* Left slab — runs between the top and bottom slabs */}
      <mesh
        position={[-paneWidthM / 2 + thickness / 2, 0, 0]}
        castShadow={!mobile}
      >
        <boxGeometry args={[thickness, Math.max(0, paneHeightM - thickness * 2), depth]} />
        <meshPhysicalMaterial color={color} metalness={metalness} roughness={roughness} clearcoat={clearcoat} clearcoatRoughness={clearcoatRoughness} envMapIntensity={envIntensity} />
      </mesh>
      {/* Right slab */}
      <mesh
        position={[paneWidthM / 2 - thickness / 2, 0, 0]}
        castShadow={!mobile}
      >
        <boxGeometry args={[thickness, Math.max(0, paneHeightM - thickness * 2), depth]} />
        <meshPhysicalMaterial color={color} metalness={metalness} roughness={roughness} clearcoat={clearcoat} clearcoatRoughness={clearcoatRoughness} envMapIntensity={envIntensity} />
      </mesh>
    </group>
  );
}

/**
 * Glass-edge bezel — four thin rubber-seal strips hugging the perimeter of
 * a glass pane. Replaces the previous "solid black panel behind the glass"
 * approach that bled darkness through high-transmission glass and made
 * every pane read as opaque. The 4-strip form is what a real EPDM/silicone
 * gasket looks like: a thin dark ring trimming the inner sash edge.
 */
function GlassEdgeBezel({
  widthM,
  heightM,
  zOffset = 0.013,
}: {
  widthM: number;
  heightM: number;
  zOffset?: number;
}) {
  if (widthM <= 0 || heightM <= 0) return null;
  const strip = 0.012;
  const depth = 0.006;
  const innerH = Math.max(0, heightM - strip * 2);
  return (
    <group position={[0, 0, zOffset]}>
      <mesh position={[0, heightM / 2 - strip / 2, 0]}>
        <boxGeometry args={[widthM, strip, depth]} />
        <meshStandardMaterial color="#0E0E0E" roughness={0.85} metalness={0} />
      </mesh>
      <mesh position={[0, -heightM / 2 + strip / 2, 0]}>
        <boxGeometry args={[widthM, strip, depth]} />
        <meshStandardMaterial color="#0E0E0E" roughness={0.85} metalness={0} />
      </mesh>
      <mesh position={[-widthM / 2 + strip / 2, 0, 0]}>
        <boxGeometry args={[strip, innerH, depth]} />
        <meshStandardMaterial color="#0E0E0E" roughness={0.85} metalness={0} />
      </mesh>
      <mesh position={[widthM / 2 - strip / 2, 0, 0]}>
        <boxGeometry args={[strip, innerH, depth]} />
        <meshStandardMaterial color="#0E0E0E" roughness={0.85} metalness={0} />
      </mesh>
    </group>
  );
}

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
 * Studio-mode backdrop — a small, window-tracked plate at z=-0.4 that
 * exists solely to give the dark aluminum frame contrast in LiveStudio.
 * Sized to window+margin so it reads as a stage backdrop, not a wall.
 * Slightly lighter than the canvas background (#0B1220) so the frame
 * outline + glass panes are clearly visible.
 */

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
  clickState = 0,
  open = false,
  frameDepth,
  mobile,
  isExterior = false,
  sashThickness = 0.04,
  paneIndex,
  panesCount,
}: {
  paneWidthM: number;
  paneHeightM: number;
  hingeSide: HingeSide | null | undefined;
  opening: PaneOpeningType;
  clickState?: number;
  open: boolean;
  frameDepth: number;
  mobile: boolean;
  isExterior?: boolean;
  sashThickness?: number;
  paneIndex?: number;
  panesCount?: number;
}) {
  const isSliding = opening === 'Sliding';
  const isTilt = opening === 'Tilt';

  // For sliding: place handle on the outer stile.
  // Left-sliding pane (index < count/2) -> left stile.
  // Right-sliding pane (index >= count/2) -> right stile.
  const idx = paneIndex ?? 0;
  const count = panesCount ?? 2;
  const isLeftSash = idx < count / 2;

  const offsetX = isSliding
    ? (isLeftSash ? -paneWidthM / 2 + sashThickness / 2 : paneWidthM / 2 - sashThickness / 2)
    : isTilt
      ? 0
      : hingeSide === 'Left'
        ? paneWidthM / 2 - sashThickness / 2
        : -(paneWidthM / 2 - sashThickness / 2);

  // Vertical position: top center for Tilt, centered vertically for Casement/Sliding
  const offsetY = isTilt
    ? paneHeightM / 2 - sashThickness / 2
    : 0;

  // Depth of sash depends on opening type
  const depth = frameDepth * (isSliding ? 0.45 : 0.9);
  const offsetZ = isExterior ? depth * 0.35 : -depth * 0.65;

  if (paneWidthM < 0.2 || paneHeightM < 0.3) return null;

  if (isSliding) {
    // Return a modern, sleek recessed flush pull plate (to avoid collision)
    return (
      <group
        position={[offsetX, offsetY, offsetZ]}
        rotation={isExterior ? [0, 0, 0] : [0, Math.PI, 0]}
        castShadow={!mobile}
      >
        {/* Outer metallic faceplate */}
        <mesh castShadow={!mobile} receiveShadow={!mobile}>
          <boxGeometry args={[0.02, 0.15, 0.003]} />
          <meshPhysicalMaterial color="#9E9E9E" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Inner recessed cup slot */}
        <mesh position={[0, 0, 0.001]} castShadow={!mobile}>
          <boxGeometry args={[0.008, 0.11, 0.002]} />
          <meshPhysicalMaterial color="#1A1A1A" metalness={0.0} roughness={0.9} />
        </mesh>
      </group>
    );
  }

  // Refined modern rectangular lever handle design for non-sliding configurations
  const stemLength = 0.02; // 2 cm out
  const stemRadius = 0.005; // 5 mm radius
  const baseWidth = 0.015; // base plate width
  const baseHeight = 0.035; // base plate height
  const baseThickness = 0.004; // base thickness
  const leverLength = 0.11; // 11 cm lever handle
  const leverWidth = 0.015; // 1.5 cm lever width
  const leverThickness = 0.008; // 8 mm lever thickness

  // Determine handle rotation angle based on state:
  // - Closed (open = false and clickState = 0): points straight down (rotZ = 0)
  // - Open/Turned (open = true or clickState = 1): points horizontally toward the hinge side.
  // - Tilted (clickState === 2): points straight up (rotZ = Math.PI)
  let rotZ = 0;
  const isCurrentlyOpen = open || clickState === 1;
  const isCurrentlyTilted = clickState === 2;

  if (isCurrentlyTilted) {
    rotZ = Math.PI; // Pointing up
  } else if (isCurrentlyOpen) {
    // Points toward the center (hinge side)
    if (isExterior) {
      rotZ = hingeSide === 'Left' ? -Math.PI / 2 : Math.PI / 2;
    } else {
      rotZ = hingeSide === 'Left' ? Math.PI / 2 : -Math.PI / 2;
    }
  }

  const leverGroupRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (leverGroupRef.current) {
      const tau = Math.min(1, 14 * delta); // Fast mechanical turn rate
      leverGroupRef.current.rotation.z += (rotZ - leverGroupRef.current.rotation.z) * tau;
    }
  });

  return (
    <group
      position={[offsetX, offsetY, offsetZ]}
      rotation={isExterior ? [0, 0, 0] : [0, Math.PI, 0]}
      castShadow={!mobile}
    >
      {/* 1. Base Plate (Escutcheon) */}
      <mesh castShadow={!mobile} receiveShadow={!mobile}>
        <boxGeometry args={[baseWidth, baseHeight, baseThickness]} />
        <meshPhysicalMaterial color="#9E9E9E" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* 2. Stem/Neck extending outwards */}
      <mesh
        position={[0, 0, baseThickness / 2 + stemLength / 2]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow={!mobile}
      >
        <cylinderGeometry args={[stemRadius, stemRadius, stemLength, 12]} />
        <meshPhysicalMaterial color="#A5A5A5" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* 3. Rotating Lever Group */}
      <group
        ref={leverGroupRef}
        position={[0, 0, baseThickness / 2 + stemLength]}
        rotation={[0, 0, rotZ]}
      >
        {/* Sleek rectangular modern lever - pivots from its top end */}
        <mesh position={[0, -leverLength / 2 + 0.01, leverThickness / 2]} castShadow={!mobile}>
          <boxGeometry args={[leverWidth, leverLength, leverThickness]} />
          <meshPhysicalMaterial color="#BCBCBC" metalness={0.9} roughness={0.15} />
        </mesh>
      </group>
    </group>
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

/**
 * Drag-to-rotate handler matching Lasha's mockup interaction: the user
 * grabs anywhere on the canvas and the world group spins under their
 * cursor. Yaw (Y-axis) is unbounded, pitch (X-axis) clamps to ±45° so
 * the user can't flip upside-down.
 *
 * Drag delta is accumulated into `dragDeltaRef` so the parent's pane
 * onClick handler can ignore taps where the user actually meant to
 * rotate — see ConfiguratorScene.onPaneClick.
 *
 * Wheel/pinch zoom is intentionally NOT implemented — CameraRig auto-fits
 * the frame to 65% of viewport, and zooming would conflict with that on
 * dimension change. If users ask for zoom later, attach onWheel here and
 * adjust camera.position.z directly.
 */
function DragRotator({
  targetRef,
  dragDeltaRef,
  interactionLockRef,
}: {
  targetRef: React.RefObject<Group>;
  dragDeltaRef: React.MutableRefObject<number>;
  /**
   * Reference-counted lock. While > 0, the user is actively dragging a
   * mullion or dim chip and the world rotation must stay suspended so
   * the model holds still under their edits. Each child drag increments
   * on start and decrements on end.
   */
  interactionLockRef: React.MutableRefObject<number>;
}) {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    const onDown = (e: PointerEvent) => {
      if (interactionLockRef.current > 0) return;
      isDragging = true;
      dragDeltaRef.current = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      // Capture so we still get pointermove when the cursor leaves the
      // canvas while held down (rare but the user CAN flick beyond the
      // edge on small mobile screens).
      try { canvas.setPointerCapture(e.pointerId); } catch { /* not supported */ }
    };
    const onMove = (e: PointerEvent) => {
      if (!isDragging) return;
      // Belt to the pointerdown lock's braces: a child drag may have
      // taken the lock AFTER we started (listener-ordering race on
      // touch). Bail out for the remaining moves so the model holds
      // still even if onDown got past us.
      if (interactionLockRef.current > 0) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      dragDeltaRef.current += Math.abs(dx) + Math.abs(dy);
      const g = targetRef.current;
      if (g) {
        g.rotation.y += dx * 0.01;
        // Pitch on X — gentler than yaw + clamped to ±π/4 (45°).
        g.rotation.x += dy * 0.006;
        g.rotation.x = MathUtils.clamp(g.rotation.x, -Math.PI / 4, Math.PI / 4);
      }
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      isDragging = false;
      try { canvas.releasePointerCapture(e.pointerId); } catch { /* not supported */ }
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.style.touchAction = 'none'; // disable native pan/zoom on touch
    canvas.style.cursor = 'grab';

    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.style.touchAction = '';
      canvas.style.cursor = '';
    };
  }, [gl, targetRef, dragDeltaRef, interactionLockRef]);
  return null;
}
