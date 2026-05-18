/**
 * Technical-drawing diagrams for the /materials page. Same hairline
 * vocabulary as WorkshopIllustrations, but these are *engineering*
 * diagrams — cross-sections with labels and tick marks — instead of
 * narrative scenes. viewBox 240×180 (4:3) so they sit comfortably
 * next to body copy.
 *
 * Style rules:
 *   - Single-weight 0.6 strokes (slightly finer than scenes — these
 *     have more lines per cm of canvas).
 *   - currentColor for structure; amber for the "feature" being
 *     called out (thermal break bridge, Low-E coating layer, etc).
 *   - Numeric labels in mono caption-size at the right edge so the
 *     diagram reads like a manufacturer datasheet.
 *   - Each diagram has descriptive <title>/<desc> for screen readers.
 */

import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement> & {
  title?: string;
};

const BASE = {
  viewBox: '0 0 240 180',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  preserveAspectRatio: 'xMidYMid meet',
  role: 'img',
} as const;

/** Aluminium thermal-break profile cross-section. */
export function ThermalBreakProfile({ title, ...rest }: Props) {
  return (
    <svg {...BASE} {...rest}>
      <title>{title ?? 'ალუმინის თერმო-ხიდიანი პროფილი'}</title>
      <desc>
        ალუმინის გარე და შიდა კონტური, შუა — პოლიამიდის თერმო-ხიდი 24-34 მმ
        სიგანის, რომელიც წყვეტს სითბოს გადასვლას.
      </desc>
      <g stroke="currentColor" strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round">
        {/* Outer aluminium shell */}
        <rect x="40" y="50" width="50" height="80" />
        <rect x="44" y="54" width="42" height="72" />
        {/* Inner aluminium shell */}
        <rect x="150" y="50" width="50" height="80" />
        <rect x="154" y="54" width="42" height="72" />
        {/* Air chambers — outer */}
        <line x1="50" y1="70" x2="80" y2="70" />
        <line x1="50" y1="90" x2="80" y2="90" />
        <line x1="50" y1="110" x2="80" y2="110" />
        {/* Air chambers — inner */}
        <line x1="160" y1="70" x2="190" y2="70" />
        <line x1="160" y1="90" x2="190" y2="90" />
        <line x1="160" y1="110" x2="190" y2="110" />
        {/* Gasket dots */}
        <circle cx="42" cy="62" r="1.2" />
        <circle cx="198" cy="62" r="1.2" />
        <circle cx="42" cy="118" r="1.2" />
        <circle cx="198" cy="118" r="1.2" />
      </g>

      {/* Polyamide thermal bridge — amber */}
      <g
        className="text-accent-amber"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="90" y="65" width="60" height="8" fill="currentColor" fillOpacity="0.15" />
        <rect x="90" y="107" width="60" height="8" fill="currentColor" fillOpacity="0.15" />
        {/* Cross-hatching — polyamide texture */}
        <line x1="94" y1="65" x2="98" y2="73" />
        <line x1="102" y1="65" x2="106" y2="73" />
        <line x1="110" y1="65" x2="114" y2="73" />
        <line x1="118" y1="65" x2="122" y2="73" />
        <line x1="126" y1="65" x2="130" y2="73" />
        <line x1="134" y1="65" x2="138" y2="73" />
        <line x1="142" y1="65" x2="146" y2="73" />
      </g>

      {/* Annotation labels */}
      <g
        fill="currentColor"
        fontSize="6.5"
        fontFamily="ui-monospace, monospace"
        letterSpacing="0.4"
      >
        <text x="40" y="44" className="uppercase">გარე</text>
        <text x="150" y="44" className="uppercase">შიდა</text>
        <text x="92" y="155" className="text-accent-amber uppercase" fill="currentColor">
          თერმო-ხიდი · 24 მმ
        </text>
        <text x="40" y="170" className="uppercase">U-მნ. 1,2 W/მ²K</text>
      </g>
      {/* Tick marks */}
      <g stroke="currentColor" strokeWidth="0.4">
        <line x1="40" y1="48" x2="40" y2="50" />
        <line x1="90" y1="48" x2="90" y2="50" />
        <line x1="150" y1="48" x2="150" y2="50" />
        <line x1="200" y1="48" x2="200" y2="50" />
      </g>
    </svg>
  );
}

/** Triple-pane Low-E IGU cross-section. */
export function TriplePaneIGU({ title, ...rest }: Props) {
  return (
    <svg {...BASE} {...rest}>
      <title>{title ?? 'სამმაგი მინა-პაკეტი Low-E საფარით'}</title>
      <desc>
        სამი მინის ფურცელი, ორი არგონით სავსე სივრცე, Low-E საფარი მინის შიდა
        ზედაპირზე — U-მნიშვნელობა 0.6 W/მ²K.
      </desc>
      <g stroke="currentColor" strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round">
        {/* Outer frame */}
        <rect x="40" y="30" width="160" height="120" />
        {/* Three glass panes */}
        <rect x="50" y="36" width="6" height="108" />
        <rect x="117" y="36" width="6" height="108" />
        <rect x="184" y="36" width="6" height="108" />
        {/* Spacer top + bottom */}
        <rect x="50" y="36" width="140" height="4" />
        <rect x="50" y="140" width="140" height="4" />
      </g>

      {/* Argon fill dots — sparse pattern */}
      <g fill="currentColor" fillOpacity="0.35">
        {Array.from({ length: 24 }).map((_, i) => {
          const col = i % 6;
          const row = Math.floor(i / 6);
          return (
            <circle
              key={`a${i}`}
              cx={62 + col * 9}
              cy={50 + row * 22}
              r="0.7"
            />
          );
        })}
        {Array.from({ length: 24 }).map((_, i) => {
          const col = i % 6;
          const row = Math.floor(i / 6);
          return (
            <circle
              key={`b${i}`}
              cx={129 + col * 9}
              cy={50 + row * 22}
              r="0.7"
            />
          );
        })}
      </g>

      {/* Low-E coating — amber */}
      <g
        className="text-accent-amber"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      >
        <line x1="55.5" y1="40" x2="55.5" y2="140" />
      </g>

      <g
        fill="currentColor"
        fontSize="6.5"
        fontFamily="ui-monospace, monospace"
        letterSpacing="0.4"
      >
        <text x="44" y="22" className="uppercase">გარე</text>
        <text x="180" y="22" className="uppercase">შიდა</text>
        <text x="44" y="166" className="uppercase">4-16-4-16-4 მმ</text>
        <text x="44" y="174" className="text-accent-amber uppercase" fill="currentColor">
          Low-E · არგონი · U=0,6
        </text>
      </g>
    </svg>
  );
}

/** 5-chamber PVC profile cross-section. */
export function FiveChamberPvc({ title, ...rest }: Props) {
  return (
    <svg {...BASE} {...rest}>
      <title>{title ?? 'ხუთ-კამერიანი PVC პროფილი'}</title>
      <desc>
        PVC პროფილის შიდა აგებულება — ხუთი ჰაერის კამერა, ფოლადის სამაგრი
        ცენტრში, რეზინის ლენტი გარე და შიდა მხარეს.
      </desc>
      <g stroke="currentColor" strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round">
        {/* Outer envelope */}
        <rect x="50" y="40" width="140" height="100" />
        {/* Chamber walls */}
        <line x1="80" y1="40" x2="80" y2="140" />
        <line x1="106" y1="40" x2="106" y2="140" />
        <line x1="134" y1="40" x2="134" y2="140" />
        <line x1="160" y1="40" x2="160" y2="140" />
        {/* Top and bottom internal divisions */}
        <line x1="50" y1="80" x2="80" y2="80" />
        <line x1="160" y1="80" x2="190" y2="80" />
        <line x1="50" y1="110" x2="80" y2="110" />
        <line x1="160" y1="110" x2="190" y2="110" />
      </g>

      {/* Central steel reinforcement — amber */}
      <g
        className="text-accent-amber"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >
        <rect
          x="112"
          y="65"
          width="22"
          height="50"
          fill="currentColor"
          fillOpacity="0.18"
        />
        <line x1="112" y1="65" x2="134" y2="115" />
        <line x1="134" y1="65" x2="112" y2="115" />
      </g>

      {/* Gasket / seal — dotted lines outside */}
      <g stroke="currentColor" strokeWidth="0.6" strokeDasharray="1.5 1.5">
        <line x1="50" y1="38" x2="190" y2="38" />
        <line x1="50" y1="142" x2="190" y2="142" />
      </g>

      <g
        fill="currentColor"
        fontSize="6.5"
        fontFamily="ui-monospace, monospace"
        letterSpacing="0.4"
      >
        <text x="50" y="30" className="uppercase">გარე</text>
        <text x="155" y="30" className="uppercase">შიდა</text>
        <text x="50" y="158" className="uppercase">70 მმ · 5 კამერა</text>
        <text x="50" y="168" className="text-accent-amber uppercase" fill="currentColor">
          ფოლადის სამაგრი · 1,5 მმ
        </text>
      </g>
    </svg>
  );
}
