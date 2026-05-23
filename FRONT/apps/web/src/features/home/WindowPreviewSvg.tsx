import { motion } from 'framer-motion';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

import { cn } from '@/shared/lib/cn';

// ─── Public types ─────────────────────────────────────────────────

export type PreviewOpening = 'Fixed' | 'Casement' | 'TiltAndTurn' | 'Sliding';

export type SectionSetup = {
  /** 0–1; all sections' widthRatios must sum to 1. */
  widthRatio: number;
  opening: PreviewOpening;
  hinge: 'Left' | 'Right';
  hasTransom: boolean;
  /** Height ratio of the TOP transom sash (0.15 – 0.5). Ignored if !hasTransom. */
  transomHeightRatio: number;
  transomOpening: PreviewOpening;
  transomHinge: 'Left' | 'Right';
};

/** Identifies a single renderable sub-pane inside a section. */
export type SectionSlot = 'main' | 'transom';

export type WindowPreviewProps = {
  widthCm: number;
  heightCm: number;
  /** Section list — order matters (left → right). */
  sections: SectionSetup[];
  frameHex: string;
  /** Pick a new opening for a specific section/slot. */
  onSectionChange?: (index: number, slot: SectionSlot, next: { opening: PreviewOpening; hinge: 'Left' | 'Right' }) => void;
  /** Toggle a section's horizontal transom split. */
  onToggleTransom?: (index: number) => void;
  /** User dragged the mullion between section `leftIndex` and `leftIndex + 1`. */
  onResizeMullion?: (leftIndex: number, newLeftRatio: number) => void;
  /** User dragged the transom divider inside a section. */
  onResizeTransom?: (index: number, newHeightRatio: number) => void;
  /** Delete a section (called from popover). */
  onDeleteSection?: (index: number) => void;
  /** Disabled when at min/max section count (controls popover delete button). */
  canDelete?: boolean;
  className?: string;
};

// ─── Constants ────────────────────────────────────────────────────

const easeOut = [0.16, 1, 0.3, 1] as const;
const CANVAS_W = 800;
const CANVAS_H = 520;
const MARGIN = 64;
const MIN_SECTION_RATIO = 0.08;
const MIN_TRANSOM_RATIO = 0.18;
const MAX_TRANSOM_RATIO = 0.5;

const LABEL_FONT =
  '"BPG Glaho Sans", "Noto Sans Georgian", system-ui, -apple-system, "Segoe UI", sans-serif';

/** Popover opening options — Georgian colloquial labels (ევრო = tilt+turn). */
const OPENING_OPTIONS: Array<{
  id: string;
  opening: PreviewOpening;
  hinge: 'Left' | 'Right';
  label: string;
}> = [
  { id: 'fixed', opening: 'Fixed', hinge: 'Right', label: 'გლუვი' },
  { id: 'cas-L', opening: 'Casement', hinge: 'Left', label: 'გვერდითა ←' },
  { id: 'cas-R', opening: 'Casement', hinge: 'Right', label: 'გვერდითა →' },
  { id: 'tt-L', opening: 'TiltAndTurn', hinge: 'Left', label: 'ევრო ←' },
  { id: 'tt-R', opening: 'TiltAndTurn', hinge: 'Right', label: 'ევრო →' },
  { id: 'slide', opening: 'Sliding', hinge: 'Right', label: 'მოძრავი' },
];

// ─── Layout types ─────────────────────────────────────────────────

type RenderPane = {
  sectionIndex: number;
  slot: SectionSlot;
  /** viewBox coords */
  x: number;
  y: number;
  w: number;
  h: number;
  opening: PreviewOpening;
  hinge: 'Left' | 'Right';
};

type WindowLayout = {
  winX: number;
  winY: number;
  winW: number;
  winH: number;
  innerX: number;
  innerY: number;
  innerW: number;
  innerH: number;
  frameTh: number;
  mullionTh: number;
  sectionXs: number[];
  sectionWs: number[];
  renderPanes: RenderPane[];
};

function computeLayout(widthCm: number, heightCm: number, sections: SectionSetup[]): WindowLayout {
  const usableW = CANVAS_W - MARGIN * 2;
  const usableH = CANVAS_H - MARGIN * 2;
  const aspect = widthCm / heightCm;
  const usableAspect = usableW / usableH;

  let winW: number;
  let winH: number;
  if (aspect >= usableAspect) {
    winW = usableW;
    winH = usableW / aspect;
  } else {
    winH = usableH;
    winW = usableH * aspect;
  }
  const winX = (CANVAS_W - winW) / 2;
  const winY = (CANVAS_H - winH) / 2;

  const frameTh = Math.min(28, Math.max(12, Math.round(Math.min(winW, winH) * 0.04)));
  const mullionTh = Math.max(6, Math.round(frameTh * 0.55));
  const innerW = winW - frameTh * 2;
  const innerH = winH - frameTh * 2;
  const innerX = winX + frameTh;
  const innerY = winY + frameTh;

  const safeCount = Math.max(1, Math.min(sections.length, 8));
  const totalMullion = mullionTh * (safeCount - 1);
  const glazedW = innerW - totalMullion;

  // Normalize widthRatios then convert to pixel widths.
  const sumRatio = sections.reduce((s, sec) => s + sec.widthRatio, 0) || 1;
  const sectionWs = sections.map((sec) => (sec.widthRatio / sumRatio) * glazedW);
  const sectionXs: number[] = [];
  let cursor = innerX;
  for (let i = 0; i < safeCount; i++) {
    sectionXs.push(cursor);
    cursor += sectionWs[i]! + mullionTh;
  }

  const renderPanes: RenderPane[] = [];
  for (let i = 0; i < safeCount; i++) {
    const sec = sections[i]!;
    const x = sectionXs[i]!;
    const w = sectionWs[i]!;
    if (sec.hasTransom) {
      const topH = innerH * Math.max(MIN_TRANSOM_RATIO, Math.min(MAX_TRANSOM_RATIO, sec.transomHeightRatio));
      const bottomH = innerH - topH - mullionTh; // horizontal mullion same thickness
      renderPanes.push({
        sectionIndex: i,
        slot: 'transom',
        x,
        y: innerY,
        w,
        h: topH,
        opening: sec.transomOpening,
        hinge: sec.transomHinge,
      });
      renderPanes.push({
        sectionIndex: i,
        slot: 'main',
        x,
        y: innerY + topH + mullionTh,
        w,
        h: bottomH,
        opening: sec.opening,
        hinge: sec.hinge,
      });
    } else {
      renderPanes.push({
        sectionIndex: i,
        slot: 'main',
        x,
        y: innerY,
        w,
        h: innerH,
        opening: sec.opening,
        hinge: sec.hinge,
      });
    }
  }

  return {
    winX,
    winY,
    winW,
    winH,
    innerX,
    innerY,
    innerW,
    innerH,
    frameTh,
    mullionTh,
    sectionXs,
    sectionWs,
    renderPanes,
  };
}

// ─── Main component ──────────────────────────────────────────────

export function WindowPreviewSvg({
  widthCm,
  heightCm,
  sections,
  frameHex,
  onSectionChange,
  onToggleTransom,
  onResizeMullion,
  onResizeTransom,
  onDeleteSection,
  canDelete = true,
  className,
}: WindowPreviewProps) {
  const uid = useId();
  const reflectionId = `glass-${uid}`;
  const frameId = `frame-${uid}`;
  const shadowId = `shadow-${uid}`;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activePane, setActivePane] = useState<{ section: number; slot: SectionSlot } | null>(null);
  const [draggingMullion, setDraggingMullion] = useState<number | null>(null);
  const [draggingTransom, setDraggingTransom] = useState<number | null>(null);

  // Close popover on outside click / Esc
  useEffect(() => {
    if (!activePane) return;
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setActivePane(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActivePane(null);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [activePane]);

  // Close popover if its section vanishes (deletion / count change)
  useEffect(() => {
    if (!activePane) return;
    if (activePane.section >= sections.length) {
      setActivePane(null);
      return;
    }
    const sec = sections[activePane.section];
    if (activePane.slot === 'transom' && !sec?.hasTransom) {
      setActivePane(null);
    }
  }, [sections, activePane]);

  const layout = useMemo(
    () => computeLayout(widthCm, heightCm, sections),
    [widthCm, heightCm, sections],
  );

  const { dark, light, outline } = useMemo(() => {
    const lum = relativeLuminance(frameHex);
    if (lum > 0.7) {
      const sh = shadeHex(frameHex, -40, +6);
      return { dark: sh.dark, light: sh.light, outline: shadeHex(frameHex, -55, 0).dark };
    }
    if (lum > 0.4) {
      const sh = shadeHex(frameHex, -32, +12);
      return { dark: sh.dark, light: sh.light, outline: shadeHex(frameHex, -45, 0).dark };
    }
    const sh = shadeHex(frameHex, -20, +28);
    return { dark: sh.dark, light: sh.light, outline: '#0f172a' };
  }, [frameHex]);

  // ── Mullion drag (resize section widths) ────────────────────────
  const startMullionDrag = useCallback(
    (leftIndex: number) => (e: React.PointerEvent) => {
      if (!onResizeMullion || !containerRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      setDraggingMullion(leftIndex);
      const rect = containerRef.current.getBoundingClientRect();
      // Convert container px to viewBox glazedW units
      const glazedWpx = (rect.width * (layout.innerW - layout.mullionTh * (sections.length - 1))) / CANVAS_W;
      const startLeftRatio = sections[leftIndex]!.widthRatio;
      const startRightRatio = sections[leftIndex + 1]!.widthRatio;
      const startX = e.clientX;

      const onMove = (ev: PointerEvent) => {
        const dxPx = ev.clientX - startX;
        const dxRatio = dxPx / glazedWpx;
        const sumLR = startLeftRatio + startRightRatio;
        const newLeft = Math.max(
          MIN_SECTION_RATIO,
          Math.min(sumLR - MIN_SECTION_RATIO, startLeftRatio + dxRatio),
        );
        onResizeMullion(leftIndex, newLeft);
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        setDraggingMullion(null);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    [onResizeMullion, layout.innerW, layout.mullionTh, sections],
  );

  // ── Transom drag (resize top vs bottom sash height) ─────────────
  const startTransomDrag = useCallback(
    (sectionIndex: number) => (e: React.PointerEvent) => {
      if (!onResizeTransom || !containerRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      setDraggingTransom(sectionIndex);
      const rect = containerRef.current.getBoundingClientRect();
      const innerHpx = (rect.height * layout.innerH) / CANVAS_H;
      const startRatio = sections[sectionIndex]!.transomHeightRatio;
      const startY = e.clientY;
      const onMove = (ev: PointerEvent) => {
        const dyPx = ev.clientY - startY;
        const dRatio = dyPx / innerHpx;
        const next = Math.max(MIN_TRANSOM_RATIO, Math.min(MAX_TRANSOM_RATIO, startRatio + dRatio));
        onResizeTransom(sectionIndex, next);
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        setDraggingTransom(null);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    [onResizeTransom, layout.innerH, sections],
  );

  return (
    <div ref={containerRef} className={cn('relative w-full select-none', className)}>
      <div className="relative mx-auto h-full max-h-inherit" style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}>
        <svg
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={`${widthCm}×${heightCm} სმ — ${sections.length} სექცია`}
        >
          <defs>
            <linearGradient id={reflectionId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dce5f0" stopOpacity="0.55" />
              <stop offset="42%" stopColor="#a9b8cc" stopOpacity="0.18" />
              <stop offset="78%" stopColor="#5b6c84" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#1c2536" stopOpacity="0.55" />
            </linearGradient>

            <linearGradient id={frameId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={light} />
              <stop offset="55%" stopColor={frameHex} />
              <stop offset="100%" stopColor={dark} />
            </linearGradient>

            <filter id={shadowId} x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="6" />
              <feOffset dy="6" result="off" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.35" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Drafting grid */}
          <g opacity="0.06">
            {Array.from({ length: 16 }, (_, i) => (
              <line
                key={`v-${i}`}
                x1={(i + 1) * (CANVAS_W / 17)}
                y1={0}
                x2={(i + 1) * (CANVAS_W / 17)}
                y2={CANVAS_H}
                stroke="#60a5fa"
                strokeWidth="0.5"
              />
            ))}
            {Array.from({ length: 10 }, (_, i) => (
              <line
                key={`h-${i}`}
                x1={0}
                y1={(i + 1) * (CANVAS_H / 11)}
                x2={CANVAS_W}
                y2={(i + 1) * (CANVAS_H / 11)}
                stroke="#60a5fa"
                strokeWidth="0.5"
              />
            ))}
          </g>

          <motion.g
            key={`${sections.length}-${(widthCm * heightCm).toFixed(0)}-${frameHex}`}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: easeOut }}
            filter={`url(#${shadowId})`}
          >
            {/* Outer frame */}
            <rect
              x={layout.winX}
              y={layout.winY}
              width={layout.winW}
              height={layout.winH}
              rx={4}
              fill={`url(#${frameId})`}
              stroke={outline}
              strokeWidth={1.5}
            />

            {/* Glass + opening glyphs per renderable sub-pane */}
            {layout.renderPanes.map((rp) => {
              const isActive =
                activePane?.section === rp.sectionIndex && activePane?.slot === rp.slot;
              const count = layout.renderPanes.filter((q) => q.slot === 'main' && !sections[q.sectionIndex]?.hasTransom).length || sections.length;
              return (
                <g key={`${rp.sectionIndex}-${rp.slot}`}>
                  <rect
                    x={rp.x}
                    y={rp.y}
                    width={rp.w}
                    height={rp.h}
                    fill={`url(#${reflectionId})`}
                  />
                  <rect
                    x={rp.x + 1}
                    y={rp.y + 1}
                    width={rp.w - 2}
                    height={rp.h - 2}
                    fill="none"
                    stroke="#ffffff"
                    strokeOpacity={0.22}
                    strokeWidth={1}
                  />
                  <PaneOpeningGlyph
                    x={rp.x}
                    y={rp.y}
                    w={rp.w}
                    h={rp.h}
                    opening={rp.opening}
                    hinge={rp.hinge}
                    sectionIndex={rp.sectionIndex}
                    count={count}
                  />
                  {isActive && (
                    <rect
                      x={rp.x + 2}
                      y={rp.y + 2}
                      width={rp.w - 4}
                      height={rp.h - 4}
                      fill="none"
                      stroke="#60a5fa"
                      strokeWidth={2.5}
                      strokeDasharray="6 4"
                    />
                  )}
                </g>
              );
            })}

            {/* Vertical mullions */}
            {layout.sectionXs.slice(0, -1).map((sx, i) => (
              <rect
                key={`m-v-${i}`}
                x={sx + layout.sectionWs[i]!}
                y={layout.innerY}
                width={layout.mullionTh}
                height={layout.innerH}
                fill={`url(#${frameId})`}
                stroke={outline}
                strokeWidth={0.75}
                strokeOpacity={0.6}
              />
            ))}

            {/* Horizontal transom mullions (per section with transom) */}
            {sections.map((sec, i) => {
              if (!sec.hasTransom) return null;
              const topH =
                layout.innerH *
                Math.max(MIN_TRANSOM_RATIO, Math.min(MAX_TRANSOM_RATIO, sec.transomHeightRatio));
              return (
                <rect
                  key={`m-h-${i}`}
                  x={layout.sectionXs[i]!}
                  y={layout.innerY + topH}
                  width={layout.sectionWs[i]!}
                  height={layout.mullionTh}
                  fill={`url(#${frameId})`}
                  stroke={outline}
                  strokeWidth={0.75}
                  strokeOpacity={0.6}
                />
              );
            })}

            {/* Inner shadow */}
            <rect
              x={layout.innerX}
              y={layout.innerY}
              width={layout.innerW}
              height={layout.innerH}
              fill="none"
              stroke={outline}
              strokeOpacity={0.55}
              strokeWidth={1}
            />
          </motion.g>

          {/* Dimension lines */}
          <DimensionLine
            orientation="horizontal"
            x1={layout.winX}
            x2={layout.winX + layout.winW}
            y={layout.winY + layout.winH + 28}
            label={`${widthCm} სმ`}
          />
          <DimensionLine
            orientation="vertical"
            y1={layout.winY}
            y2={layout.winY + layout.winH}
            x={layout.winX + layout.winW + 28}
            label={`${heightCm} სმ`}
          />
        </svg>

        {/* HTML overlay */}
        <div className="pointer-events-none absolute inset-0">
          {/* Per renderable sub-pane: hotspot */}
          {onSectionChange &&
            layout.renderPanes.map((rp) => {
              const isActive =
                activePane?.section === rp.sectionIndex && activePane?.slot === rp.slot;
              return (
                <PaneHotspot
                  key={`hot-${rp.sectionIndex}-${rp.slot}`}
                  sectionIndex={rp.sectionIndex}
                  slot={rp.slot}
                  leftPct={(rp.x / CANVAS_W) * 100}
                  topPct={(rp.y / CANVAS_H) * 100}
                  widthPct={(rp.w / CANVAS_W) * 100}
                  heightPct={(rp.h / CANVAS_H) * 100}
                  isActive={isActive}
                  onOpen={() => setActivePane({ section: rp.sectionIndex, slot: rp.slot })}
                  onClose={() => setActivePane(null)}
                />
              );
            })}

          {/* Shared responsive popover */}
          {activePane && (() => {
            const activeRenderPane = layout.renderPanes.find(
              (rp) => rp.sectionIndex === activePane.section && rp.slot === activePane.slot
            );
            if (!activeRenderPane) return null;

            // Make popover position dynamic based on the active pane.
            // If the pane's center is in the bottom half of the canvas, or if it is a tall pane (height > 60% of canvas),
            // render it ABOVE the pane to keep it clear of the bottom toolbar on mobile devices.
            const paneCenterY = activeRenderPane.y + activeRenderPane.h / 2;
            const popoverAbove = paneCenterY > CANVAS_H / 2 || activeRenderPane.h > CANVAS_H * 0.6;

            const cxPct = ((activeRenderPane.x + activeRenderPane.w / 2) / CANVAS_W) * 100;
            const leftStyle = `clamp(140px, ${cxPct}%, calc(100% - 140px))`;
            const verticalStyle = popoverAbove
              ? { bottom: `calc(${(100 - (activeRenderPane.y / CANVAS_H) * 100)}% + 8px)` }
              : { top: `calc(${((activeRenderPane.y + activeRenderPane.h) / CANVAS_H) * 100}% + 8px)` };

            return (
              <>
                {/* Desktop popover (absolute-positioned, hidden on mobile) */}
                <div
                  className="pointer-events-auto absolute z-20 hidden lg:block"
                  style={{
                    left: leftStyle,
                    transform: 'translateX(-50%)',
                    ...verticalStyle,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <motion.div
                    initial={{ opacity: 0, y: popoverAbove ? 6 : -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.18, ease: easeOut }}
                    className="flex w-[280px] flex-col gap-2 rounded-2xl border border-studio-ink-3 bg-studio-ink-2/95 p-3 shadow-2xl backdrop-blur-xl"
                  >
                    <div className="flex items-center justify-between px-1">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-studio-brand-soft">
                        სექცია №{activePane.section + 1}
                        {activePane.slot === 'transom' && ' · ზედა'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePane(null);
                        }}
                        className="text-slate-500 transition-colors hover:text-white"
                        aria-label="დახურვა"
                      >
                        <CloseIcon />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {OPENING_OPTIONS.map((opt) => {
                        const active =
                          activeRenderPane.opening === opt.opening &&
                          (opt.opening === 'Fixed' || opt.opening === 'Sliding'
                            ? true
                            : activeRenderPane.hinge === opt.hinge);
                        return (
                          <button
                            key={opt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSectionChange?.(activePane.section, activePane.slot, {
                                opening: opt.opening,
                                hinge: opt.hinge,
                              });
                              setActivePane(null);
                            }}
                            className={cn(
                              'group flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border p-1.5 transition-all duration-150',
                              active
                                ? 'border-studio-brand bg-studio-brand/15 shadow-[0_0_15px_rgba(37,99,235,0.25)]'
                                : 'border-studio-ink-3 bg-studio-ink/60 hover:border-studio-brand/40',
                            )}
                          >
                            <PopoverGlyph opening={opt.opening} hinge={opt.hinge} active={active} />
                            <span
                              className={cn(
                                'text-center text-[9px] font-bold leading-tight',
                                active ? 'text-white' : 'text-slate-400',
                              )}
                            >
                              {opt.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {((onToggleTransom && activePane.slot === 'main') ||
                      (onDeleteSection && canDelete && activePane.slot === 'main')) && (
                      <div className="flex gap-1.5 border-t border-studio-ink-3/60 pt-2">
                        {onToggleTransom && activePane.slot === 'main' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleTransom(activePane.section);
                              setActivePane(null);
                            }}
                            className={cn(
                              'flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[11px] font-bold transition-colors',
                              sections[activePane.section]?.hasTransom
                                ? 'border-studio-brand/40 bg-studio-brand/10 text-studio-brand-soft hover:bg-studio-brand/15'
                                : 'border-studio-ink-3 bg-studio-ink/60 text-slate-300 hover:border-studio-brand/40 hover:text-white',
                            )}
                          >
                            <SplitIcon />
                            <span>
                              {sections[activePane.section]?.hasTransom
                                ? 'ტიხრის მოშორება'
                                : 'ჰორიზონტ. ტიხარი'}
                            </span>
                          </button>
                        )}
                        {onDeleteSection && canDelete && activePane.slot === 'main' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSection(activePane.section);
                              setActivePane(null);
                            }}
                            className="flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[11px] font-bold text-rose-300 transition-colors hover:bg-rose-500/20"
                            title="სექციის წაშლა"
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* Mobile bottom sheet (fixed overlay, hidden on desktop) */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden pointer-events-auto"
                  onClick={() => setActivePane(null)}
                />
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                  className="fixed inset-x-0 bottom-0 z-50 flex flex-col gap-4 rounded-t-3xl border-t border-studio-ink-3 bg-studio-ink-2 px-6 py-6 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] shadow-2xl text-white font-studio lg:hidden pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-studio-ink-3/40">
                    <span className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-studio-brand-soft">
                      სექცია №{activePane.section + 1}
                      {activePane.slot === 'transom' && ' · ზედა'}
                    </span>
                    <button
                      onClick={() => setActivePane(null)}
                      className="text-slate-400 transition-colors hover:text-white p-1"
                      aria-label="დახურვა"
                    >
                      <CloseIcon />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {OPENING_OPTIONS.map((opt) => {
                      const active =
                        activeRenderPane.opening === opt.opening &&
                        (opt.opening === 'Fixed' || opt.opening === 'Sliding'
                          ? true
                          : activeRenderPane.hinge === opt.hinge);
                      return (
                        <button
                          key={opt.id}
                          onClick={() => {
                            onSectionChange?.(activePane.section, activePane.slot, {
                              opening: opt.opening,
                              hinge: opt.hinge,
                            });
                            setActivePane(null);
                          }}
                          className={cn(
                            'group flex flex-col items-center justify-center gap-2 rounded-xl border p-3 transition-all duration-150',
                            active
                              ? 'border-studio-brand bg-studio-brand/15 shadow-[0_0_15px_rgba(37,99,235,0.25)]'
                              : 'border-studio-ink-3 bg-studio-ink/60 active:border-studio-brand/40',
                          )}
                        >
                          <PopoverGlyph opening={opt.opening} hinge={opt.hinge} active={active} />
                          <span
                            className={cn(
                              'text-center text-[10px] font-bold leading-tight',
                              active ? 'text-white' : 'text-slate-400',
                            )}
                          >
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {((onToggleTransom && activePane.slot === 'main') ||
                    (onDeleteSection && canDelete && activePane.slot === 'main')) && (
                    <div className="flex gap-3 border-t border-studio-ink-3/60 pt-4 mt-2">
                      {onToggleTransom && activePane.slot === 'main' && (
                        <button
                          onClick={() => {
                            onToggleTransom(activePane.section);
                            setActivePane(null);
                          }}
                          className={cn(
                            'flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-bold transition-colors',
                            sections[activePane.section]?.hasTransom
                              ? 'border-studio-brand/40 bg-studio-brand/10 text-studio-brand-soft'
                              : 'border-studio-ink-3 bg-studio-ink/60 text-slate-300 active:border-studio-brand/40 active:text-white',
                          )}
                        >
                          <SplitIcon />
                          <span>
                            {sections[activePane.section]?.hasTransom
                              ? 'ტიხრის მოშორება'
                              : 'ჰორიზონტ. ტიხარი'}
                          </span>
                        </button>
                      )}
                      {onDeleteSection && canDelete && activePane.slot === 'main' && (
                        <button
                          onClick={() => {
                            onDeleteSection(activePane.section);
                            setActivePane(null);
                          }}
                          className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-5 py-3 text-xs font-bold text-rose-300 transition-colors active:bg-rose-500/20"
                          title="სექციის წაშლა"
                        >
                          <TrashIcon />
                          <span>წაშლა</span>
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              </>
            );
          })()}

          {/* Vertical mullion drag handles */}
          {onResizeMullion &&
            layout.sectionXs.slice(0, -1).map((sx, i) => {
              const handleX = sx + layout.sectionWs[i]! + layout.mullionTh / 2;
              return (
                <MullionHandle
                  key={`drag-v-${i}`}
                  orientation="vertical"
                  leftPct={(handleX / CANVAS_W) * 100}
                  topPct={(layout.innerY / CANVAS_H) * 100}
                  lengthPct={(layout.innerH / CANVAS_H) * 100}
                  active={draggingMullion === i}
                  onPointerDown={startMullionDrag(i)}
                />
              );
            })}

          {/* Horizontal transom drag handles */}
          {onResizeTransom &&
            sections.map((sec, i) => {
              if (!sec.hasTransom) return null;
              const topH =
                layout.innerH *
                Math.max(MIN_TRANSOM_RATIO, Math.min(MAX_TRANSOM_RATIO, sec.transomHeightRatio));
              const handleY = layout.innerY + topH + layout.mullionTh / 2;
              return (
                <MullionHandle
                  key={`drag-h-${i}`}
                  orientation="horizontal"
                  leftPct={(layout.sectionXs[i]! / CANVAS_W) * 100}
                  topPct={(handleY / CANVAS_H) * 100}
                  lengthPct={(layout.sectionWs[i]! / CANVAS_W) * 100}
                  active={draggingTransom === i}
                  onPointerDown={startTransomDrag(i)}
                />
              );
            })}
        </div>
      </div>
    </div>
  );
}

// ─── Mullion / transom drag handle ───────────────────────────────

function MullionHandle({
  orientation,
  leftPct,
  topPct,
  lengthPct,
  active,
  onPointerDown,
}: {
  orientation: 'vertical' | 'horizontal';
  leftPct: number;
  topPct: number;
  lengthPct: number;
  active: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const [hover, setHover] = useState(false);
  const lit = active || hover;
  const style: React.CSSProperties =
    orientation === 'vertical'
      ? {
          left: `calc(${leftPct}% - 6px)`,
          top: `${topPct}%`,
          height: `${lengthPct}%`,
          width: '12px',
        }
      : {
          left: `${leftPct}%`,
          top: `calc(${topPct}% - 6px)`,
          width: `${lengthPct}%`,
          height: '12px',
        };

  return (
    <div
      className={cn(
        'pointer-events-auto absolute z-10 transition-colors',
        orientation === 'vertical' ? 'cursor-col-resize' : 'cursor-row-resize',
      )}
      style={style}
      onPointerDown={onPointerDown}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={orientation === 'vertical' ? 'სექციის სიგანის შეცვლა' : 'ტიხრის სიმაღლის შეცვლა'}
    >
      <div
        className={cn(
          'absolute inset-0 m-auto transition-all',
          orientation === 'vertical' ? 'w-[3px]' : 'h-[3px]',
          lit ? 'bg-studio-brand' : 'bg-transparent',
        )}
      />
      {/* Grab pip — visible on hover */}
      <div
        className={cn(
          'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-studio-brand text-white shadow-lg transition-all',
          lit ? 'scale-100 opacity-100' : 'scale-75 opacity-0',
        )}
      >
        {orientation === 'vertical' ? (
          <svg viewBox="0 0 20 20" className="h-5 w-5 p-1" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="7,5 4,10 7,15" />
            <polyline points="13,5 16,10 13,15" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" className="h-5 w-5 p-1" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="5,7 10,4 15,7" />
            <polyline points="5,13 10,16 15,13" />
          </svg>
        )}
      </div>
    </div>
  );
}

// ─── Pane hotspot + popover ──────────────────────────────────────

type HotspotProps = {
  sectionIndex: number;
  slot: SectionSlot;
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
  isActive: boolean;
  onOpen: () => void;
  onClose: () => void;
};

function PaneHotspot({
  sectionIndex,
  slot,
  leftPct,
  topPct,
  widthPct,
  heightPct,
  isActive,
  onOpen,
  onClose,
}: HotspotProps) {
  const [hover, setHover] = useState(false);
  const open = isActive || hover;

  return (
    <div
      className="pointer-events-auto absolute"
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        width: `${widthPct}%`,
        height: `${heightPct}%`,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={(e) => {
        e.stopPropagation();
        if (isActive) onClose();
        else onOpen();
      }}
    >
      <div
        className={cn(
          'absolute inset-0 cursor-pointer rounded-sm transition-all duration-150',
          isActive
            ? 'bg-studio-brand/10 ring-2 ring-studio-brand/60'
            : hover
              ? 'bg-studio-brand/5 ring-1 ring-studio-brand/40'
              : 'bg-transparent',
        )}
      />

      <div
        className={cn(
          'pointer-events-none absolute right-1.5 top-1.5 flex items-center gap-1 rounded-md bg-studio-ink/90 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-studio-brand-soft shadow-md backdrop-blur transition-opacity duration-150',
          open ? 'opacity-100' : 'opacity-0',
        )}
      >
        <PencilIcon />
        <span>
          {sectionIndex + 1}
          {slot === 'transom' ? '·T' : ''}
        </span>
      </div>
    </div>
  );
}

// ─── Glyphs ──────────────────────────────────────────────────────

function PaneOpeningGlyph({
  x,
  y,
  w,
  h,
  opening,
  hinge,
  count,
  sectionIndex,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  opening: PreviewOpening;
  hinge: 'Left' | 'Right';
  count: number;
  sectionIndex: number;
}) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const stroke = '#1e293b';
  const strokeOpacity = 0.78;
  const sw = Math.max(2, Math.min(w, h) * 0.012);
  const hingeFill = '#2563eb';
  const hingeRadius = Math.max(3, Math.min(w, h) * 0.022);

  if (opening === 'Fixed') {
    const inset = Math.min(w, h) * 0.3;
    return (
      <g stroke={stroke} strokeOpacity={0.28} strokeWidth={sw * 0.9} fill="none" strokeLinecap="round">
        <line x1={cx - inset} y1={cy - inset} x2={cx + inset} y2={cy + inset} />
        <line x1={cx + inset} y1={cy - inset} x2={cx - inset} y2={cy + inset} />
      </g>
    );
  }

  if (opening === 'Sliding') {
    const arrowLen = w * 0.32;
    const arrowHead = Math.max(8, w * 0.04);
    return (
      <g
        stroke={stroke}
        strokeOpacity={strokeOpacity}
        strokeWidth={sw}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {sectionIndex < count - 1 && (
          <>
            <line x1={cx} y1={cy} x2={cx + arrowLen} y2={cy} />
            <polyline
              points={`${cx + arrowLen - arrowHead},${cy - arrowHead} ${cx + arrowLen},${cy} ${cx + arrowLen - arrowHead},${cy + arrowHead}`}
            />
          </>
        )}
        {sectionIndex > 0 && (
          <>
            <line x1={cx} y1={cy} x2={cx - arrowLen} y2={cy} />
            <polyline
              points={`${cx - arrowLen + arrowHead},${cy - arrowHead} ${cx - arrowLen},${cy} ${cx - arrowLen + arrowHead},${cy + arrowHead}`}
            />
          </>
        )}
      </g>
    );
  }

  const inset = sw * 1.5;
  const left = x + inset;
  const right = x + w - inset;
  const top = y + inset;
  const bot = y + h - inset;

  if (opening === 'Casement') {
    if (hinge === 'Right') {
      return (
        <g>
          <g stroke={stroke} strokeOpacity={strokeOpacity} strokeWidth={sw} fill="none" strokeLinejoin="round">
            <line x1={right} y1={top} x2={left} y2={cy} />
            <line x1={right} y1={bot} x2={left} y2={cy} />
          </g>
          <circle cx={left} cy={cy} r={hingeRadius} fill={hingeFill} />
        </g>
      );
    }
    return (
      <g>
        <g stroke={stroke} strokeOpacity={strokeOpacity} strokeWidth={sw} fill="none" strokeLinejoin="round">
          <line x1={left} y1={top} x2={right} y2={cy} />
          <line x1={left} y1={bot} x2={right} y2={cy} />
        </g>
        <circle cx={right} cy={cy} r={hingeRadius} fill={hingeFill} />
      </g>
    );
  }

  // TiltAndTurn — V shape pointing up + hinge dot at one bottom corner
  return (
    <g>
      <g stroke={stroke} strokeOpacity={strokeOpacity} strokeWidth={sw} fill="none" strokeLinejoin="round">
        <line x1={left} y1={bot} x2={cx} y2={top} />
        <line x1={right} y1={bot} x2={cx} y2={top} />
      </g>
      <circle cx={hinge === 'Right' ? right : left} cy={bot} r={hingeRadius} fill={hingeFill} />
    </g>
  );
}

function PopoverGlyph({
  opening,
  hinge,
  active,
}: {
  opening: PreviewOpening;
  hinge: 'Left' | 'Right';
  active: boolean;
}) {
  const stroke = active ? '#60a5fa' : '#94a3b8';
  const fill = active ? 'rgba(96,165,250,0.08)' : 'transparent';
  const sw = 1.4;

  return (
    <svg viewBox="0 0 28 28" className="h-7 w-7" aria-hidden>
      <rect x="3" y="3" width="22" height="22" rx="2" fill={fill} stroke={stroke} strokeWidth={sw} />
      {opening === 'Casement' && hinge === 'Right' && (
        <>
          <line x1="3" y1="3" x2="25" y2="14" stroke={stroke} strokeWidth={sw} />
          <line x1="3" y1="25" x2="25" y2="14" stroke={stroke} strokeWidth={sw} />
          <circle cx="3" cy="14" r="1.4" fill={stroke} />
        </>
      )}
      {opening === 'Casement' && hinge === 'Left' && (
        <>
          <line x1="25" y1="3" x2="3" y2="14" stroke={stroke} strokeWidth={sw} />
          <line x1="25" y1="25" x2="3" y2="14" stroke={stroke} strokeWidth={sw} />
          <circle cx="25" cy="14" r="1.4" fill={stroke} />
        </>
      )}
      {opening === 'TiltAndTurn' && (
        <>
          <line x1="3" y1="25" x2="14" y2="3" stroke={stroke} strokeWidth={sw} />
          <line x1="25" y1="25" x2="14" y2="3" stroke={stroke} strokeWidth={sw} />
          {hinge === 'Right' && <circle cx="25" cy="25" r="1.4" fill={stroke} />}
          {hinge === 'Left' && <circle cx="3" cy="25" r="1.4" fill={stroke} />}
        </>
      )}
      {opening === 'Sliding' && (
        <>
          <line x1="6" y1="14" x2="22" y2="14" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <polyline points="9,11 6,14 9,17" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <polyline points="19,11 22,14 19,17" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 10.5L3 9l5.5-5.5a1 1 0 011.4 0l1.1 1.1a1 1 0 010 1.4L5.5 11.5 4 11l-2.5-0.5z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="2" y1="2" x2="10" y2="10" />
      <line x1="10" y1="2" x2="2" y2="10" />
    </svg>
  );
}

function SplitIcon() {
  return (
    <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <rect x="2" y="2" width="10" height="10" rx="1" />
      <line x1="2" y1="7" x2="12" y2="7" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M3 4h8M5 4V2.5h4V4M5 4v8h4V4M6 6v4M8 6v4" />
    </svg>
  );
}

// ─── Dimension labels ────────────────────────────────────────────

type DimLineProps =
  | { orientation: 'horizontal'; x1: number; x2: number; y: number; label: string }
  | { orientation: 'vertical'; y1: number; y2: number; x: number; label: string };

function DimensionLine(p: DimLineProps) {
  const stroke = '#60a5fa';
  const sw = 1.5;

  if (p.orientation === 'horizontal') {
    const mid = (p.x1 + p.x2) / 2;
    return (
      <g stroke={stroke} strokeWidth={sw} fontFamily={LABEL_FONT}>
        <line x1={p.x1} y1={p.y} x2={p.x2} y2={p.y} strokeLinecap="round" />
        <line x1={p.x1} y1={p.y - 7} x2={p.x1} y2={p.y + 7} strokeLinecap="round" />
        <line x1={p.x2} y1={p.y - 7} x2={p.x2} y2={p.y + 7} strokeLinecap="round" />
        <rect
          x={mid - 46}
          y={p.y - 15}
          width={92}
          height={30}
          rx={6}
          fill="#0f172a"
          stroke="#60a5fa"
          strokeWidth={1}
          strokeOpacity={0.6}
        />
        <text
          x={mid}
          y={p.y + 5}
          fill="#f8fafc"
          fontSize={14}
          fontWeight={700}
          textAnchor="middle"
          stroke="none"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {p.label}
        </text>
      </g>
    );
  }

  const mid = (p.y1 + p.y2) / 2;
  return (
    <g stroke={stroke} strokeWidth={sw} fontFamily={LABEL_FONT}>
      <line x1={p.x} y1={p.y1} x2={p.x} y2={p.y2} strokeLinecap="round" />
      <line x1={p.x - 7} y1={p.y1} x2={p.x + 7} y2={p.y1} strokeLinecap="round" />
      <line x1={p.x - 7} y1={p.y2} x2={p.x + 7} y2={p.y2} strokeLinecap="round" />
      <rect
        x={p.x - 15}
        y={mid - 46}
        width={30}
        height={92}
        rx={6}
        fill="#0f172a"
        stroke="#60a5fa"
        strokeWidth={1}
        strokeOpacity={0.6}
      />
      <text
        x={p.x}
        y={mid}
        fill="#f8fafc"
        fontSize={14}
        fontWeight={700}
        textAnchor="middle"
        stroke="none"
        transform={`rotate(-90 ${p.x} ${mid})`}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {p.label}
      </text>
    </g>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function shadeHex(hex: string, darkPct: number, lightPct: number) {
  const { r, g, b } = parseHex(hex);
  const shift = (channel: number, pct: number) => {
    if (pct >= 0) return Math.round(channel + (255 - channel) * (pct / 100));
    return Math.round(channel * (1 + pct / 100));
  };
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  const mix = (pct: number) =>
    `#${toHex(shift(r, pct))}${toHex(shift(g, pct))}${toHex(shift(b, pct))}`;
  return { dark: mix(darkPct), light: mix(lightPct) };
}

function parseHex(hex: string) {
  const clean = hex.replace('#', '').trim();
  const value = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(value, 16);
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
