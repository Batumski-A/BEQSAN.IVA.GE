import { useTranslation } from 'react-i18next';

import type { ConfigurationPaneInput, PaneOpeningType } from '@beqsan/api-types';

type Props = {
  panes: ConfigurationPaneInput[];
  widthCm: number;
  heightCm: number;
};

/**
 * Read-only 2D schematic of the current pane layout. SVG so it scales
 * cleanly and reads in screen-readers via the accessible group label.
 * Each pane gets a mullion separator and a small glyph in the centre
 * indicating its opening direction (arrow for Casement/Sliding, V for
 * Tilt, X for TiltAndTurn, plain frame for Fixed).
 */
export function PaneSchematic({ panes, widthCm, heightCm }: Props) {
  const { t } = useTranslation();

  // Frame uses the actual aspect ratio of the configured opening so the
  // viewport matches what the user sees in 3D — a tall door versus a
  // wide window reads correctly without extra layout math.
  const aspectRatio = widthCm > 0 && heightCm > 0 ? widthCm / heightCm : 1;
  const viewW = 400;
  const viewH = Math.round(viewW / aspectRatio);

  // Convert pane widthRatio → cumulative x offsets in viewBox units.
  const offsets: number[] = [0];
  let acc = 0;
  for (const p of panes) {
    acc += p.widthRatio;
    offsets.push(Number((acc * viewW).toFixed(2)));
  }

  return (
    <figure
      className="rounded-sm border border-hairline bg-bg-elevated p-4"
      aria-label={t('configurator.steps.layout.schematicAria', { count: panes.length })}
    >
      <figcaption className="mb-3 font-mono text-caption uppercase tracking-wider text-fg-tertiary">
        {t('configurator.steps.layout.schematicLabel')}
      </figcaption>
      <svg
        viewBox={`0 0 ${viewW} ${viewH}`}
        className="h-auto w-full"
        role="img"
        aria-hidden
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Outer frame */}
        <rect
          x={2}
          y={2}
          width={viewW - 4}
          height={viewH - 4}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          className="text-fg-tertiary"
        />
        {panes.map((p, i) => {
          const x0 = offsets[i]!;
          const x1 = offsets[i + 1]!;
          const w = x1 - x0;
          const cx = x0 + w / 2;
          const cy = viewH / 2;
          return (
            <g key={p.position}>
              {/* Glass tint */}
              <rect
                x={x0 + 4}
                y={4}
                width={Math.max(0, w - 8)}
                height={viewH - 8}
                fill="currentColor"
                opacity={0.06}
                className="text-accent-amber"
              />
              {/* Mullion (skip on last pane — frame closes it) */}
              {i < panes.length - 1 && (
                <line
                  x1={x1}
                  y1={2}
                  x2={x1}
                  y2={viewH - 2}
                  stroke="currentColor"
                  strokeWidth={2}
                  className="text-fg-tertiary"
                />
              )}
              <OpeningGlyph
                opening={p.openingType}
                hingeLeft={p.hingeSide === 'Left'}
                cx={cx}
                cy={cy}
                w={w - 16}
                h={viewH - 16}
              />
              {/* Position label, top-left of pane */}
              <text
                x={x0 + 10}
                y={20}
                className="fill-current font-mono text-fg-secondary"
                fontSize={12}
              >
                P{p.position}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

function OpeningGlyph({
  opening,
  hingeLeft,
  cx,
  cy,
  w,
  h,
}: {
  opening: PaneOpeningType;
  hingeLeft: boolean;
  cx: number;
  cy: number;
  w: number;
  h: number;
}) {
  const halfW = w / 2;
  const halfH = h / 2;
  const stroke = 'currentColor';
  const strokeWidth = 2;
  const cls = 'text-accent-amber';

  switch (opening) {
    case 'Casement': {
      // Triangle pointing to the hinge edge (apex at the hinge side)
      const apexX = hingeLeft ? cx - halfW : cx + halfW;
      const baseTopX = hingeLeft ? cx + halfW : cx - halfW;
      return (
        <polyline
          points={`${baseTopX},${cy - halfH} ${apexX},${cy} ${baseTopX},${cy + halfH}`}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          className={cls}
        />
      );
    }
    case 'Tilt': {
      // Chevron pointing downward (top edge tilts in)
      return (
        <polyline
          points={`${cx - halfW},${cy - halfH} ${cx},${cy + halfH * 0.6} ${cx + halfW},${cy - halfH}`}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          className={cls}
        />
      );
    }
    case 'TiltAndTurn': {
      // Combined: triangle (casement) + chevron (tilt)
      const apexX = hingeLeft ? cx - halfW : cx + halfW;
      const baseTopX = hingeLeft ? cx + halfW : cx - halfW;
      return (
        <g className={cls}>
          <polyline
            points={`${baseTopX},${cy - halfH} ${apexX},${cy} ${baseTopX},${cy + halfH}`}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          <polyline
            points={`${cx - halfW * 0.6},${cy - halfH * 0.5} ${cx},${cy + halfH * 0.2} ${cx + halfW * 0.6},${cy - halfH * 0.5}`}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
            opacity={0.5}
          />
        </g>
      );
    }
    case 'Sliding': {
      // Horizontal arrow indicating slide direction (right by default)
      return (
        <g className={cls}>
          <line
            x1={cx - halfW * 0.6}
            y1={cy}
            x2={cx + halfW * 0.6}
            y2={cy}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <polyline
            points={`${cx + halfW * 0.4},${cy - 6} ${cx + halfW * 0.6},${cy} ${cx + halfW * 0.4},${cy + 6}`}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </g>
      );
    }
    case 'Fixed':
    default:
      return null;
  }
}
