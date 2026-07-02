import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import type {
  ConfigurationPaneInput,
  HingeSide,
  PaneOpeningType,
} from '@beqsan/api-types';

import { useConfiguratorStore } from '../store';

/**
 * Blueprint 2D viewer — replaces the live 3D scene when the user toggles the
 * shell's View Mode chip to "2D". Pure SVG; reads geometry from the existing
 * Zustand store (no pricing math, no glass tinting) and renders an industrial
 * blueprint of the current frame:
 *
 *   - Outer frame outline in `studio-ink` (slate-900).
 *   - Vertical mullions between panes per `panes[i].widthRatio`.
 *   - Horizontal transom mullion across the pane when `hSplits[i]` is true.
 *     (`hSplits` is local UI state — the BEQSAN store does not yet model
 *     mid-rail transoms per pane, so the viewer accepts it as a prop with
 *     a sensible "all false" default.)
 *   - Dimension lines on the bottom (overall W) and left (overall H), and
 *     per-section widths on top — all stroked in `studio-brand`.
 *   - Opening indicator polylines per pane (Casement = corner-to-corner V
 *     pointing to hinge side; Tilt/T&T = corner-to-corner V pointing to
 *     the bottom rail; Sliding = arrow).
 *
 * Background is `studio-paper` with a 16-px dotted grid at 5 % opacity of
 * `studio-brand`, drawn via a re-usable <pattern> def.
 */
export type BlueprintHSplits = readonly boolean[];

type Props = {
  /**
   * Optional per-pane horizontal split (mid-rail transom) flag. When the
   * caller doesn't pass this, every pane renders without a transom. Length
   * mismatches are tolerated — the viewer reads `hSplits[i] ?? false`.
   */
  hSplits?: BlueprintHSplits;
};

export function Blueprint2DViewer({ hSplits }: Props) {
  const { t } = useTranslation();
  const widthCm = useConfiguratorStore((s) => s.dimensions.widthCm);
  const heightCm = useConfiguratorStore((s) => s.dimensions.heightCm);
  const panes = useConfiguratorStore((s) => s.panes);

  // Derive transom flags from the pane's `hasTransom` field. The legacy
  // `hSplits` prop still wins when supplied so the wizard / tests can
  // force a layout independent of the store.
  const effectiveHSplits: BlueprintHSplits = hSplits ?? panes.map((p) => p.hasTransom === true);

  return (
    <BlueprintCanvas
      widthCm={widthCm}
      heightCm={heightCm}
      panes={panes}
      hSplits={effectiveHSplits}
      t={t}
    />
  );
}

type CanvasProps = {
  widthCm: number;
  heightCm: number;
  panes: ConfigurationPaneInput[];
  hSplits: BlueprintHSplits;
  t: TFunction;
};

const FRAME_STROKE = '#0f172a';
const DIM_STROKE = '#2563eb';
const GRID_STROKE = '#2563eb';

function BlueprintCanvas({ widthCm, heightCm, panes, hSplits, t }: CanvasProps) {
  // SVG viewBox — paper-size with margin to fit dimension lines. We size the
  // drawable area to a 1000-unit wide rectangle and scale H by aspect ratio.
  // Margins host left/bottom dimension labels + top section-width annotations.
  const drawWidth = 1000;
  const aspect = heightCm > 0 ? heightCm / Math.max(widthCm, 1) : 1;
  const drawHeight = Math.round(drawWidth * aspect);
  const marginLeft = 110;
  const marginRight = 60;
  const marginTop = 90;
  const marginBottom = 110;
  const viewW = drawWidth + marginLeft + marginRight;
  const viewH = drawHeight + marginTop + marginBottom;

  // Pane width fractions; if missing, default to even split.
  const ratios = useMemo<number[]>(() => {
    if (panes.length === 0) return [1];
    const sum = panes.reduce((s, p) => s + (p.widthRatio || 0), 0);
    if (sum <= 0) {
      const even = 1 / panes.length;
      return panes.map(() => even);
    }
    return panes.map((p) => (p.widthRatio || 0) / sum);
  }, [panes]);

  // Cumulative section x-positions in viewBox units (left edge of each pane).
  const sectionEdges = useMemo<number[]>(() => {
    const acc: number[] = [];
    let cursor = 0;
    for (const r of ratios) {
      acc.push(cursor);
      cursor += r;
    }
    acc.push(1); // right edge
    return acc.map((p) => marginLeft + p * drawWidth);
  }, [ratios]);

  const frameLeft = marginLeft;
  const frameRight = marginLeft + drawWidth;
  const frameTop = marginTop;
  const frameBottom = marginTop + drawHeight;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-studio-paper">
      <svg
        viewBox={`0 0 ${viewW} ${viewH}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={t('configurator.blueprint.aria', {
          width: widthCm,
          height: heightCm,
        })}
        className="h-full w-full"
      >
        <defs>
          <pattern
            id="blueprint-grid"
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r="1" fill={GRID_STROKE} fillOpacity="0.05" />
          </pattern>
        </defs>

        {/* Paper backdrop + dotted grid */}
        <rect x="0" y="0" width={viewW} height={viewH} fill="#f8fafc" />
        <rect x="0" y="0" width={viewW} height={viewH} fill="url(#blueprint-grid)" />

        {/* Outer frame outline */}
        <rect
          x={frameLeft}
          y={frameTop}
          width={drawWidth}
          height={drawHeight}
          fill="none"
          stroke={FRAME_STROKE}
          strokeWidth="6"
        />
        <rect
          x={frameLeft + 14}
          y={frameTop + 14}
          width={drawWidth - 28}
          height={drawHeight - 28}
          fill="none"
          stroke={FRAME_STROKE}
          strokeWidth="2"
        />

        {/* Vertical mullions between sections */}
        {sectionEdges.slice(1, -1).map((x, i) => (
          <line
            key={`mullion-v-${i}`}
            x1={x}
            x2={x}
            y1={frameTop + 14}
            y2={frameBottom - 14}
            stroke={FRAME_STROKE}
            strokeWidth="4"
          />
        ))}

        {/* Horizontal transom mullions — one per pane where hSplits[i] is
            true, drawn at the pane's REAL top-sash ratio (it used to sit at
            a fixed 50% and disagree with the 3D model). Each split also gets
            per-sash height labels so the workshop drawing carries the full
            cut list. */}
        {panes.map((pane, i) => {
          if (!hSplits[i]) return null;
          const x1 = sectionEdges[i]! + 4;
          const x2 = sectionEdges[i + 1]! - 4;
          const ratio = Math.min(0.9, Math.max(0.05, pane.transomHeightRatio ?? 0.3));
          const y = frameTop + drawHeight * ratio;
          const topCm = Math.round(heightCm * ratio);
          const bottomCm = heightCm - topCm;
          return (
            <g key={`mullion-h-${i}`}>
              <line
                x1={x1}
                x2={x2}
                y1={y}
                y2={y}
                stroke={FRAME_STROKE}
                strokeWidth="3"
              />
              <SashHeightTick x={x2 - 24} y1={frameTop + 14} y2={y - 2} label={`${topCm}`} />
              <SashHeightTick x={x2 - 24} y1={y + 2} y2={frameBottom - 14} label={`${bottomCm}`} />
            </g>
          );
        })}

        {/* Opening indicators per pane */}
        {panes.map((pane, i) => (
          <OpeningIndicator
            key={`opening-${pane.position}`}
            xLeft={sectionEdges[i]!}
            xRight={sectionEdges[i + 1]!}
            yTop={frameTop}
            yBottom={frameBottom}
            opening={pane.openingType}
            hingeSide={pane.hingeSide}
            hSplit={hSplits[i] ?? false}
            hSplitRatio={Math.min(0.9, Math.max(0.05, pane.transomHeightRatio ?? 0.3))}
          />
        ))}

        {/* Overall width dimension on the bottom */}
        <DimensionLineHorizontal
          x1={frameLeft}
          x2={frameRight}
          y={frameBottom + 56}
          label={`${widthCm} ${t('common.units.cm')}`}
          subLabel={t('configurator.blueprint.width')}
        />

        {/* Overall height dimension on the left */}
        <DimensionLineVertical
          x={frameLeft - 70}
          y1={frameTop}
          y2={frameBottom}
          label={`${heightCm} ${t('common.units.cm')}`}
          subLabel={t('configurator.blueprint.height')}
        />

        {/* Per-section widths on top */}
        {ratios.map((r, i) => {
          const x1 = sectionEdges[i]!;
          const x2 = sectionEdges[i + 1]!;
          const sectionWidthCm = Math.round(r * widthCm);
          return (
            <DimensionTick
              key={`tick-${i}`}
              x1={x1}
              x2={x2}
              y={frameTop - 36}
              label={`${sectionWidthCm}`}
            />
          );
        })}
      </svg>
    </div>
  );
}

function DimensionLineHorizontal({
  x1,
  x2,
  y,
  label,
  subLabel,
}: {
  x1: number;
  x2: number;
  y: number;
  label: string;
  subLabel: string;
}) {
  const tickHeight = 10;
  return (
    <g>
      <line x1={x1} x2={x2} y1={y} y2={y} stroke={DIM_STROKE} strokeWidth="1.5" />
      <line
        x1={x1}
        x2={x1}
        y1={y - tickHeight}
        y2={y + tickHeight}
        stroke={DIM_STROKE}
        strokeWidth="1.5"
      />
      <line
        x1={x2}
        x2={x2}
        y1={y - tickHeight}
        y2={y + tickHeight}
        stroke={DIM_STROKE}
        strokeWidth="1.5"
      />
      <text
        x={(x1 + x2) / 2}
        y={y + 32}
        fill={DIM_STROKE}
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="22"
        textAnchor="middle"
        fontWeight="700"
      >
        {label}
      </text>
      <text
        x={(x1 + x2) / 2}
        y={y - 16}
        fill={DIM_STROKE}
        fontFamily="'BPG Glaho Sans', system-ui, sans-serif"
        fontSize="14"
        textAnchor="middle"
        letterSpacing="2"
      >
        {subLabel.toUpperCase()}
      </text>
    </g>
  );
}

function DimensionLineVertical({
  x,
  y1,
  y2,
  label,
  subLabel,
}: {
  x: number;
  y1: number;
  y2: number;
  label: string;
  subLabel: string;
}) {
  const tickWidth = 10;
  const cy = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x} x2={x} y1={y1} y2={y2} stroke={DIM_STROKE} strokeWidth="1.5" />
      <line
        x1={x - tickWidth}
        x2={x + tickWidth}
        y1={y1}
        y2={y1}
        stroke={DIM_STROKE}
        strokeWidth="1.5"
      />
      <line
        x1={x - tickWidth}
        x2={x + tickWidth}
        y1={y2}
        y2={y2}
        stroke={DIM_STROKE}
        strokeWidth="1.5"
      />
      <text
        x={x - 18}
        y={cy + 8}
        fill={DIM_STROKE}
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="22"
        textAnchor="end"
        fontWeight="700"
        transform={`rotate(-90 ${x - 18} ${cy + 8})`}
      >
        {label}
      </text>
      <text
        x={x + 22}
        y={cy + 4}
        fill={DIM_STROKE}
        fontFamily="'BPG Glaho Sans', system-ui, sans-serif"
        fontSize="14"
        textAnchor="start"
        letterSpacing="2"
        transform={`rotate(-90 ${x + 22} ${cy + 4})`}
      >
        {subLabel.toUpperCase()}
      </text>
    </g>
  );
}

function DimensionTick({
  x1,
  x2,
  y,
  label,
}: {
  x1: number;
  x2: number;
  y: number;
  label: string;
}) {
  const tickHeight = 8;
  return (
    <g>
      <line x1={x1 + 6} x2={x2 - 6} y1={y} y2={y} stroke={DIM_STROKE} strokeWidth="1.2" />
      <line
        x1={x1}
        x2={x1}
        y1={y - tickHeight}
        y2={y + tickHeight}
        stroke={DIM_STROKE}
        strokeWidth="1.2"
      />
      <line
        x1={x2}
        x2={x2}
        y1={y - tickHeight}
        y2={y + tickHeight}
        stroke={DIM_STROKE}
        strokeWidth="1.2"
      />
      <text
        x={(x1 + x2) / 2}
        y={y - 12}
        fill={DIM_STROKE}
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="16"
        textAnchor="middle"
        fontWeight="700"
      >
        {label}
      </text>
    </g>
  );
}

/**
 * Compact vertical dimension for a transom sash — drawn just inside the
 * pane's right edge so multi-pane layouts can each carry their own pair.
 */
function SashHeightTick({
  x,
  y1,
  y2,
  label,
}: {
  x: number;
  y1: number;
  y2: number;
  label: string;
}) {
  const tickWidth = 8;
  const midY = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x} x2={x} y1={y1 + 6} y2={y2 - 6} stroke={DIM_STROKE} strokeWidth="1.2" />
      <line
        x1={x - tickWidth}
        x2={x + tickWidth}
        y1={y1}
        y2={y1}
        stroke={DIM_STROKE}
        strokeWidth="1.2"
      />
      <line
        x1={x - tickWidth}
        x2={x + tickWidth}
        y1={y2}
        y2={y2}
        stroke={DIM_STROKE}
        strokeWidth="1.2"
      />
      <text
        x={x - 12}
        y={midY}
        fill={DIM_STROKE}
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="16"
        textAnchor="middle"
        fontWeight="700"
        transform={`rotate(-90 ${x - 12} ${midY})`}
      >
        {label}
      </text>
    </g>
  );
}

function OpeningIndicator({
  xLeft,
  xRight,
  yTop,
  yBottom,
  opening,
  hingeSide,
  hSplit,
  hSplitRatio = 0.3,
}: {
  xLeft: number;
  xRight: number;
  yTop: number;
  yBottom: number;
  opening: PaneOpeningType;
  hingeSide: HingeSide | null | undefined;
  hSplit: boolean;
  /** Top-sash fraction of the transom split — mirrors the 3D model. */
  hSplitRatio?: number;
}) {
  // When the pane has a transom, draw the indicator on the bottom sash
  // only — the top sash reads as a fixed clerestory pane on most BEQSAN
  // layouts. Uses the pane's real split ratio so the glyph sits inside
  // the actual bottom sash.
  const yTopEff = hSplit ? yTop + (yBottom - yTop) * hSplitRatio : yTop;
  const inset = 18;
  const x1 = xLeft + inset;
  const x2 = xRight - inset;
  const y1 = yTopEff + inset;
  const y2 = yBottom - inset;

  switch (opening) {
    case 'Fixed':
      // Cross-out X — universal "no opening".
      return null;
    case 'Casement': {
      // Two diagonals meeting at the hinge edge mid-height. Hinge on left
      // → V opens to the right; hinge on right → V opens to the left.
      const hinge = hingeSide === 'Left' ? x1 : x2;
      const ymid = (y1 + y2) / 2;
      return (
        <g>
          <polyline
            points={`${x1},${y1} ${hinge},${ymid} ${x2},${y1}`}
            fill="none"
            stroke={FRAME_STROKE}
            strokeWidth="1.6"
          />
          <polyline
            points={`${x1},${y2} ${hinge},${ymid} ${x2},${y2}`}
            fill="none"
            stroke={FRAME_STROKE}
            strokeWidth="1.6"
          />
        </g>
      );
    }
    case 'Tilt': {
      // V pointing down — apex at the bottom-rail centre.
      const apex = (x1 + x2) / 2;
      return (
        <polyline
          points={`${x1},${y1} ${apex},${y2} ${x2},${y1}`}
          fill="none"
          stroke={FRAME_STROKE}
          strokeWidth="1.6"
        />
      );
    }
    case 'TiltAndTurn': {
      // Casement V + dashed tilt-down V overlay.
      const hinge = hingeSide === 'Left' ? x1 : x2;
      const ymid = (y1 + y2) / 2;
      const apex = (x1 + x2) / 2;
      return (
        <g>
          <polyline
            points={`${x1},${y1} ${hinge},${ymid} ${x2},${y1}`}
            fill="none"
            stroke={FRAME_STROKE}
            strokeWidth="1.6"
          />
          <polyline
            points={`${x1},${y2} ${hinge},${ymid} ${x2},${y2}`}
            fill="none"
            stroke={FRAME_STROKE}
            strokeWidth="1.6"
          />
          <polyline
            points={`${x1},${y1} ${apex},${y2} ${x2},${y1}`}
            fill="none"
            stroke={FRAME_STROKE}
            strokeWidth="1.2"
            strokeDasharray="6 4"
          />
        </g>
      );
    }
    case 'Sliding': {
      // Horizontal arrow centred — sliding sash direction is ambiguous
      // without a track partner, so we render a centred double-arrow.
      const ymid = (y1 + y2) / 2;
      const arrow = 14;
      return (
        <g>
          <line
            x1={x1 + 20}
            x2={x2 - 20}
            y1={ymid}
            y2={ymid}
            stroke={FRAME_STROKE}
            strokeWidth="1.6"
          />
          <polyline
            points={`${x1 + 20 + arrow},${ymid - arrow / 2} ${x1 + 20},${ymid} ${x1 + 20 + arrow},${ymid + arrow / 2}`}
            fill="none"
            stroke={FRAME_STROKE}
            strokeWidth="1.6"
          />
          <polyline
            points={`${x2 - 20 - arrow},${ymid - arrow / 2} ${x2 - 20},${ymid} ${x2 - 20 - arrow},${ymid + arrow / 2}`}
            fill="none"
            stroke={FRAME_STROKE}
            strokeWidth="1.6"
          />
        </g>
      );
    }
    default:
      return null;
  }
}
