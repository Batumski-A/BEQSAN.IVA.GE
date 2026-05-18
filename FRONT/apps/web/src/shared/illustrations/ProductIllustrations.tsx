/**
 * Per-product schematic illustrations for catalog cards. Same hairline
 * vocabulary as WorkshopIllustrations (single-weight strokes via
 * currentColor, selective amber for the feature being called out), but
 * these are FRONT-elevation product diagrams instead of narrative scenes
 * — the kind of drawing you'd find in a manufacturer datasheet.
 *
 * One illustration per ProductType slug: window / door / sliding /
 * panoramic / balcony. ResolveProductIllustration(slug) picks the right
 * one with a graceful generic fallback for unknown slugs.
 *
 * viewBox 200×140 (3:2) so they share aspect ratio with the workshop
 * scenes — the catalog hero block sits at h-44 (~176px) with a 3:2 aspect
 * inside, giving the SVG ~16-18px of visual breathing room per side.
 */

import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement> & {
  title?: string;
};

const BASE = {
  viewBox: '0 0 200 140',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  preserveAspectRatio: 'xMidYMid meet',
  role: 'img',
} as const;

/** Standard tilt-and-turn / casement window — frame + cross mullion + hinge swing arc. */
export function WindowIllustration({ title, ...rest }: Props) {
  return (
    <svg {...BASE} {...rest}>
      <title>{title ?? 'ფანჯარა — სტანდარტული შემინვა'}</title>
      <desc>ორი ფრთიანი ფანჯრის ფრონტალური ხედი ცენტრალური მოლიონით და სახელურით.</desc>
      <g stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
        {/* Outer frame */}
        <rect x="40" y="20" width="120" height="100" />
        {/* Inner sash frame */}
        <rect x="46" y="26" width="108" height="88" />
        {/* Central mullion */}
        <line x1="100" y1="26" x2="100" y2="114" />
        {/* Glass cross hairlines (faint, decorative) */}
        <line x1="58" y1="30" x2="58" y2="110" opacity="0.35" />
        <line x1="142" y1="30" x2="142" y2="110" opacity="0.35" />
      </g>
      {/* Hinge swing arc + handle — amber, the "openable" feature */}
      <g className="text-accent-amber" stroke="currentColor" strokeWidth="0.9" fill="none" strokeLinecap="round">
        <path d="M 100 26 L 142 70" />
        <path d="M 100 114 L 142 70" />
        <line x1="142" y1="62" x2="142" y2="78" strokeWidth="2" />
      </g>
      <g fill="currentColor" fontSize="6.5" fontFamily="ui-monospace, monospace" letterSpacing="0.4">
        <text x="40" y="135" className="uppercase">FANJARA · 70mm</text>
      </g>
    </svg>
  );
}

/** Entry/balcony door — tall rectangle, threshold, handle. */
export function DoorIllustration({ title, ...rest }: Props) {
  return (
    <svg {...BASE} {...rest}>
      <title>{title ?? 'კარი — შემოსასვლელი ან აივანი'}</title>
      <desc>კარის ფრონტალური ხედი ცენტრალური სახელურით და ქვედა ზღურბლით.</desc>
      <g stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
        {/* Outer frame */}
        <rect x="65" y="12" width="70" height="118" />
        {/* Door slab */}
        <rect x="70" y="17" width="60" height="108" />
        {/* Upper glass insert */}
        <rect x="76" y="23" width="48" height="44" />
        {/* Lower panel divider */}
        <line x1="76" y1="76" x2="124" y2="76" opacity="0.6" />
        {/* Threshold */}
        <line x1="60" y1="132" x2="140" y2="132" />
      </g>
      {/* Handle — amber accent */}
      <g className="text-accent-amber">
        <rect x="120" y="86" width="3" height="14" fill="currentColor" />
        <circle cx="121.5" cy="93" r="2" fill="currentColor" />
      </g>
      {/* Hinge dots (left edge) */}
      <g fill="currentColor" className="text-fg-tertiary">
        <circle cx="71" cy="32" r="0.8" />
        <circle cx="71" cy="71" r="0.8" />
        <circle cx="71" cy="110" r="0.8" />
      </g>
      <g fill="currentColor" fontSize="6.5" fontFamily="ui-monospace, monospace" letterSpacing="0.4">
        <text x="56" y="138" className="uppercase">KARI · 90×210</text>
      </g>
    </svg>
  );
}

/** Sliding system — two horizontally sliding sashes with arrows. */
export function SlidingIllustration({ title, ...rest }: Props) {
  return (
    <svg {...BASE} {...rest}>
      <title>{title ?? 'სლაიდინგი — გადასაცემი ფანჯარა'}</title>
      <desc>ორი ჰორიზონტალურად გადასაცემი ფრთის ფრონტალური ხედი ისრებით.</desc>
      <g stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
        {/* Outer frame */}
        <rect x="20" y="25" width="160" height="90" />
        {/* Left sash (set forward) */}
        <rect x="26" y="31" width="76" height="78" />
        {/* Right sash (set behind, slight z-offset via dashed) */}
        <rect x="98" y="31" width="76" height="78" />
        {/* Track top + bottom */}
        <line x1="20" y1="25" x2="180" y2="25" strokeWidth="1.4" />
        <line x1="20" y1="115" x2="180" y2="115" strokeWidth="1.4" />
        {/* Faint glass cross-line decoration */}
        <line x1="40" y1="35" x2="40" y2="105" opacity="0.3" />
        <line x1="160" y1="35" x2="160" y2="105" opacity="0.3" />
      </g>
      {/* Sliding direction arrows — amber */}
      <g className="text-accent-amber" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <line x1="60" y1="70" x2="44" y2="70" />
        <polyline points="50,66 44,70 50,74" />
        <line x1="140" y1="70" x2="156" y2="70" />
        <polyline points="150,66 156,70 150,74" />
      </g>
      <g fill="currentColor" fontSize="6.5" fontFamily="ui-monospace, monospace" letterSpacing="0.4">
        <text x="20" y="135" className="uppercase">SLIDINGI · 160-280cm</text>
      </g>
    </svg>
  );
}

/** Panoramic — wide flat glazing with 3 mullions, no opening. */
export function PanoramicIllustration({ title, ...rest }: Props) {
  return (
    <svg {...BASE} {...rest}>
      <title>{title ?? 'პანორამული — ფიქსირებული შემინვა'}</title>
      <desc>განიერი პანორამული შემინვის ფრონტალური ხედი ოთხ ფიქსირებულ პანელად.</desc>
      <g stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
        {/* Outer frame */}
        <rect x="10" y="30" width="180" height="80" />
        {/* Mullions — 3 verticals dividing into 4 panes */}
        <line x1="55" y1="30" x2="55" y2="110" />
        <line x1="100" y1="30" x2="100" y2="110" />
        <line x1="145" y1="30" x2="145" y2="110" />
        {/* Glass cross-hairs per pane (faint) */}
        <line x1="14" y1="35" x2="14" y2="105" opacity="0.25" />
        <line x1="186" y1="35" x2="186" y2="105" opacity="0.25" />
      </g>
      {/* Sky-reflection hint per pane — amber, very subtle */}
      <g className="text-accent-amber" fill="currentColor" fillOpacity="0.08">
        <rect x="13" y="33" width="40" height="20" />
        <rect x="58" y="33" width="40" height="20" />
        <rect x="103" y="33" width="40" height="20" />
        <rect x="148" y="33" width="40" height="20" />
      </g>
      <g fill="currentColor" fontSize="6.5" fontFamily="ui-monospace, monospace" letterSpacing="0.4">
        <text x="10" y="128" className="uppercase">PANORAMA · MAX 4M</text>
      </g>
    </svg>
  );
}

/** Balcony glazing — tall narrow panels with horizontal railing in front. */
export function BalconyIllustration({ title, ...rest }: Props) {
  return (
    <svg {...BASE} {...rest}>
      <title>{title ?? 'აივანი — შემოსაბრუნებელი შემინვა'}</title>
      <desc>აივნის შემინვის ფრონტალური ხედი ხუთ ვერტიკალურ პანელად და ჰორიზონტალური მოაჯირით.</desc>
      <g stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
        {/* Frame */}
        <rect x="14" y="14" width="172" height="106" />
        {/* 5 vertical panels (typical balcony slider) */}
        <line x1="48" y1="14" x2="48" y2="120" />
        <line x1="82" y1="14" x2="82" y2="120" />
        <line x1="118" y1="14" x2="118" y2="120" />
        <line x1="152" y1="14" x2="152" y2="120" />
        {/* Top + bottom track */}
        <line x1="14" y1="14" x2="186" y2="14" strokeWidth="1.4" />
        <line x1="14" y1="120" x2="186" y2="120" strokeWidth="1.4" />
      </g>
      {/* Railing — amber horizontal bar in front of the glass */}
      <g className="text-accent-amber" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <line x1="10" y1="92" x2="190" y2="92" />
        <line x1="18" y1="92" x2="18" y2="120" />
        <line x1="100" y1="92" x2="100" y2="120" />
        <line x1="182" y1="92" x2="182" y2="120" />
      </g>
      <g fill="currentColor" fontSize="6.5" fontFamily="ui-monospace, monospace" letterSpacing="0.4">
        <text x="14" y="135" className="uppercase">BALKONI · 5 PANELI</text>
      </g>
    </svg>
  );
}

/** Pick the matching illustration for a slug; falls back to WindowIllustration. */
export function ProductIllustrationFor(slug: string | null | undefined, props?: SVGProps<SVGSVGElement>) {
  const key = (slug ?? '').toLowerCase();
  switch (key) {
    case 'window':
      return <WindowIllustration {...props} />;
    case 'door':
      return <DoorIllustration {...props} />;
    case 'sliding':
      return <SlidingIllustration {...props} />;
    case 'panoramic':
      return <PanoramicIllustration {...props} />;
    case 'balcony':
      return <BalconyIllustration {...props} />;
    default:
      return <WindowIllustration {...props} />;
  }
}
