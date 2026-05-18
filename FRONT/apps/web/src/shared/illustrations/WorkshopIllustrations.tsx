/**
 * Hand-drawn workshop scene illustrations for the marketing pages
 * (/about, /process, /materials). One file because they share the same
 * stroke vocabulary — single-weight hairlines + selective amber accents
 * + neutral fill — and we want one mental model when extending the set
 * in Phase 1.5 once Roman supplies real photos.
 *
 * Style rules:
 *   - viewBox 200×140 (3:2 like a 35mm frame).
 *   - All strokes use currentColor inheriting from text-fg-tertiary so
 *     they read at ~62% lightness against the dark background.
 *   - Amber highlights via `className="text-accent-amber"` on the few
 *     elements that should pop (a single tool tip, a stub of glass, the
 *     trace of a measurement line).
 *   - Decorative — every component has descriptive <title>/<desc> so
 *     screen-reader users get the same context sighted users get.
 *   - No fills on people-figures: they're stylised silhouettes built
 *     from contour lines so they don't read as "AI-generated cartoon".
 */

import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement> & {
  /** Override the title that screen readers announce. Defaults exist
   *  per-illustration; pass when the surrounding caption already conveys
   *  the same information and you want to suppress duplication. */
  title?: string;
};

const COMMON_PROPS = {
  viewBox: '0 0 200 140',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  preserveAspectRatio: 'xMidYMid meet',
  role: 'img',
} as const;

/** 01 · Field measurement — ხელოსანი ლაზერით ზომავს ღიობს. */
export function MeasurementIllustration({ title, ...rest }: Props) {
  return (
    <svg {...COMMON_PROPS} {...rest}>
      <title>{title ?? 'მინდვრში გადახედვა და ზომების აღება'}</title>
      <desc>
        ხელოსანი ლაზერული საზომით ფანჯრის ღიობის სიგანე-სიმაღლე ამოწერს —
        0.5 მმ სიზუსტე
      </desc>
      <g stroke="currentColor" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round">
        {/* Wall frame — the opening to be measured */}
        <rect x="78" y="22" width="68" height="92" />
        {/* Inner reveal */}
        <rect x="82" y="26" width="60" height="84" strokeDasharray="2 2" />
        {/* Measurement extension lines (top, dim) */}
        <line x1="78" y1="16" x2="146" y2="16" />
        <line x1="78" y1="14" x2="78" y2="20" />
        <line x1="146" y1="14" x2="146" y2="20" />
        {/* Side extension lines */}
        <line x1="156" y1="22" x2="156" y2="114" />
        <line x1="154" y1="22" x2="158" y2="22" />
        <line x1="154" y1="114" x2="158" y2="114" />
      </g>
      {/* Worker silhouette — head + shoulders + arm holding laser */}
      <g stroke="currentColor" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="38" cy="56" r="6" />
        <path d="M 32 64 L 28 88 L 30 116 M 44 64 L 50 88 L 52 116" />
        <path d="M 44 70 L 62 72 L 70 60" />
      </g>
      {/* Laser beam — the amber pop */}
      <g
        className="text-accent-amber"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeLinecap="round"
      >
        <line x1="70" y1="60" x2="82" y2="56" strokeDasharray="0.5 2" />
        <circle cx="82" cy="56" r="1.4" fill="currentColor" />
      </g>
      {/* Tolerance callout */}
      <text
        x="166"
        y="70"
        fill="currentColor"
        className="font-mono text-fg-tertiary"
        fontSize="6"
        letterSpacing="0.3"
      >
        ±0.5 mm
      </text>
    </svg>
  );
}

/** 02 · Drafting / digital design — ციფრულ ფურცელზე გადასვლა. */
export function DraftingIllustration({ title, ...rest }: Props) {
  return (
    <svg {...COMMON_PROPS} {...rest}>
      <title>{title ?? 'დიზაინი ციფრულ ფურცელზე'}</title>
      <desc>კონფიგურაცია ციფრულად — ფერი, მინა, აქსესუარები არჩევა</desc>
      <g stroke="currentColor" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round">
        {/* Drafting board / monitor */}
        <rect x="30" y="22" width="140" height="92" />
        {/* Inner artboard */}
        <rect x="38" y="30" width="124" height="76" />
        {/* Grid */}
        {Array.from({ length: 7 }, (_, i) => (
          <line
            key={`v${i}`}
            x1={38 + ((i + 1) * 124) / 8}
            y1="30"
            x2={38 + ((i + 1) * 124) / 8}
            y2="106"
            strokeDasharray="0.5 2"
            opacity="0.5"
          />
        ))}
        {Array.from({ length: 4 }, (_, i) => (
          <line
            key={`h${i}`}
            x1="38"
            y1={30 + ((i + 1) * 76) / 5}
            x2="162"
            y2={30 + ((i + 1) * 76) / 5}
            strokeDasharray="0.5 2"
            opacity="0.5"
          />
        ))}
        {/* Frame elevation drawing */}
        <rect x="76" y="46" width="48" height="44" strokeWidth="1" />
        <line x1="100" y1="46" x2="100" y2="90" strokeWidth="1" />
        {/* Stand */}
        <line x1="100" y1="114" x2="100" y2="124" />
        <line x1="84" y1="124" x2="116" y2="124" />
      </g>
      {/* Selected color swatch — amber */}
      <g className="text-accent-amber" stroke="currentColor" strokeWidth="0.75">
        <rect x="48" y="40" width="6" height="6" fill="currentColor" />
      </g>
    </svg>
  );
}

/** 03 · Profile delivery — ALUPROF/ASAŞ stocks come in. */
export function ProfileStockIllustration({ title, ...rest }: Props) {
  return (
    <svg {...COMMON_PROPS} {...rest}>
      <title>{title ?? 'ალუმინის პროფილების მიწოდება'}</title>
      <desc>ALUPROF და ASAŞ-დან მოსული პროფილების შტაბი</desc>
      <g stroke="currentColor" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round">
        {/* Stacked profile bars — three rows */}
        {[60, 76, 92].map((y) => (
          <g key={y}>
            <line x1="20" y1={y} x2="180" y2={y} />
            <line x1="20" y1={y + 8} x2="180" y2={y + 8} />
            <line x1="20" y1={y} x2="20" y2={y + 8} />
            <line x1="180" y1={y} x2="180" y2={y + 8} />
            {/* Chamber dividers — thermal break cross-section hint */}
            {[60, 100, 140].map((x) => (
              <line key={`${y}-${x}`} x1={x} y1={y} x2={x} y2={y + 8} />
            ))}
          </g>
        ))}
        {/* End caps showing 3-chamber profile cross-section */}
        <rect x="14" y="60" width="6" height="48" />
        <line x1="14" y1="72" x2="20" y2="72" />
        <line x1="14" y1="84" x2="20" y2="84" />
        <line x1="14" y1="96" x2="20" y2="96" />
        {/* Label tag */}
        <rect x="40" y="36" width="48" height="14" strokeDasharray="2 2" />
      </g>
      <text
        x="64"
        y="46"
        fill="currentColor"
        textAnchor="middle"
        className="font-mono text-fg-tertiary"
        fontSize="6"
        letterSpacing="0.3"
      >
        ALUPROF MB-70
      </text>
    </svg>
  );
}

/** 04 · Mitre cut — cold saw cutting profile at 45°. */
export function CuttingIllustration({ title, ...rest }: Props) {
  return (
    <svg {...COMMON_PROPS} {...rest}>
      <title>{title ?? 'პროფილის ჭრა'}</title>
      <desc>ცხელი ხერხი 45° კუთხეში ჭრის ალუმინის პროფილს</desc>
      <g stroke="currentColor" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round">
        {/* Workbench */}
        <line x1="10" y1="100" x2="190" y2="100" />
        {/* Profile bar lying on bench */}
        <rect x="40" y="90" width="120" height="10" />
        <line x1="40" y1="93" x2="160" y2="93" />
        <line x1="40" y1="97" x2="160" y2="97" />
        {/* 45° mitre cut indicator */}
        <line x1="90" y1="90" x2="110" y2="100" strokeWidth="1" />
        {/* Saw arm + blade */}
        <line x1="100" y1="20" x2="100" y2="56" />
        <circle cx="100" cy="62" r="18" />
        <circle cx="100" cy="62" r="14" strokeDasharray="1 2" />
        <circle cx="100" cy="62" r="2" fill="currentColor" />
        {/* Saw teeth */}
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * Math.PI * 2;
          const x1 = 100 + Math.cos(a) * 18;
          const y1 = 62 + Math.sin(a) * 18;
          const x2 = 100 + Math.cos(a) * 19.5;
          const y2 = 62 + Math.sin(a) * 19.5;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
      </g>
      {/* 45° label — amber pop */}
      <g className="text-accent-amber">
        <text
          x="116"
          y="98"
          fill="currentColor"
          className="font-mono"
          fontSize="6"
          letterSpacing="0.3"
        >
          45°
        </text>
      </g>
    </svg>
  );
}

/** 05 · Hand assembly — frame pieces being joined. */
export function AssemblyIllustration({ title, ...rest }: Props) {
  return (
    <svg {...COMMON_PROPS} {...rest}>
      <title>{title ?? 'ხელით შეკრება'}</title>
      <desc>ფანჯრის ჩარჩოს ნაჭრები ხელით ერთდება — mullion, gasket, hardware</desc>
      <g stroke="currentColor" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round">
        {/* Frame in progress — three sides assembled, fourth approaching */}
        <line x1="60" y1="30" x2="140" y2="30" strokeWidth="1.4" />
        <line x1="60" y1="30" x2="60" y2="100" strokeWidth="1.4" />
        <line x1="140" y1="30" x2="140" y2="100" strokeWidth="1.4" />
        {/* Bottom piece being slotted in */}
        <line x1="62" y1="110" x2="138" y2="110" strokeWidth="1.4" />
        {/* Mitre joint markers */}
        <line x1="55" y1="25" x2="65" y2="35" strokeDasharray="1 1" />
        <line x1="145" y1="25" x2="135" y2="35" strokeDasharray="1 1" />
        {/* Hand silhouette holding bottom piece */}
        <path d="M 30 116 L 38 110 L 50 108 L 60 112" />
        <path d="M 26 124 L 34 118 L 46 116" />
      </g>
      {/* Gasket coil — amber */}
      <g className="text-accent-amber" stroke="currentColor" strokeWidth="0.75" fill="none">
        <circle cx="170" cy="62" r="8" />
        <circle cx="170" cy="62" r="5" />
      </g>
    </svg>
  );
}

/** 06 · Glass install + QA — glazing the assembled frame. */
export function GlassInstallIllustration({ title, ...rest }: Props) {
  return (
    <svg {...COMMON_PROPS} {...rest}>
      <title>{title ?? 'მინის ჩასმა და ხარისხის შემოწმება'}</title>
      <desc>გერმანული მინა ჩარჩოში ეკრიფება, შემდეგ water test</desc>
      <g stroke="currentColor" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round">
        {/* Frame */}
        <rect x="40" y="24" width="120" height="92" strokeWidth="1" />
        {/* Glass sheet — slightly offset showing it's being slid in */}
        <rect x="48" y="32" width="104" height="76" strokeWidth="0.5" />
        {/* Reflection diagonal — single line, restrained */}
        <line x1="52" y1="104" x2="148" y2="36" strokeWidth="0.5" opacity="0.4" />
        {/* Glass thickness edge marks */}
        <line x1="44" y1="32" x2="44" y2="108" strokeDasharray="1 2" />
        <line x1="156" y1="32" x2="156" y2="108" strokeDasharray="1 2" />
      </g>
      {/* Suction cup tool — amber accent on the tool handle */}
      <g stroke="currentColor" strokeWidth="0.75" strokeLinecap="round">
        <circle cx="100" cy="70" r="6" />
        <circle cx="100" cy="70" r="3" strokeDasharray="1 1" />
        <line x1="100" y1="64" x2="100" y2="54" strokeWidth="1.2" className="text-accent-amber" />
        <rect
          x="96"
          y="46"
          width="8"
          height="10"
          className="text-accent-amber"
          stroke="currentColor"
        />
      </g>
    </svg>
  );
}

/** 07 · On-site installation — installer mounting the frame. */
export function InstallationIllustration({ title, ...rest }: Props) {
  return (
    <svg {...COMMON_PROPS} {...rest}>
      <title>{title ?? 'შენი ბინაში მონტაჟი'}</title>
      <desc>ხელოსანი მონტაჟის დროს — საბოლოო შემოწმება ადგილზე</desc>
      <g stroke="currentColor" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round">
        {/* Wall section */}
        <rect x="10" y="30" width="180" height="90" />
        {/* Mounted window frame */}
        <rect x="68" y="44" width="72" height="62" strokeWidth="1.2" />
        <line x1="104" y1="44" x2="104" y2="106" strokeWidth="1" />
        {/* Floor line */}
        <line x1="10" y1="120" x2="190" y2="120" strokeWidth="1" />
        {/* Installer silhouette */}
        <circle cx="160" cy="68" r="5" />
        <path d="M 156 74 L 152 96 L 154 120 M 164 74 L 168 96 L 166 120" />
        <path d="M 156 80 L 144 78" />
        {/* Level tool / spirit bubble — amber bubble */}
        <rect x="76" y="40" width="56" height="3" />
      </g>
      {/* Bubble dot — amber */}
      <g className="text-accent-amber">
        <circle cx="104" cy="41.5" r="1.4" fill="currentColor" />
      </g>
    </svg>
  );
}

/** Workshop hero — generic "scene" for /about hero illustration column. */
export function WorkshopHeroIllustration({ title, ...rest }: Props) {
  return (
    <svg {...COMMON_PROPS} {...rest}>
      <title>{title ?? 'BEQSAN სახელოსნო, სალიბაური'}</title>
      <desc>სალიბაურის სახელოსნოს გენერალური ხედი</desc>
      <g stroke="currentColor" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round">
        {/* Building outline */}
        <rect x="20" y="40" width="160" height="80" />
        {/* Pitched roof */}
        <path d="M 20 40 L 100 12 L 180 40" />
        {/* Bay door */}
        <rect x="78" y="74" width="44" height="46" />
        <line x1="100" y1="74" x2="100" y2="120" />
        {/* Side windows — 3 small panes */}
        {[34, 50, 66].map((x) => (
          <rect key={x} x={x} y="58" width="10" height="12" />
        ))}
        {[134, 150, 166].map((x) => (
          <rect key={x} x={x} y="58" width="10" height="12" />
        ))}
        {/* Workshop sign */}
        <rect x="86" y="50" width="28" height="8" />
      </g>
      {/* Sign content — amber accent */}
      <text
        x="100"
        y="56"
        fill="currentColor"
        textAnchor="middle"
        className="font-mono text-accent-amber"
        fontSize="5"
        letterSpacing="0.4"
      >
        BEQSAN
      </text>
      {/* Ground line */}
      <line
        x1="0"
        y1="120"
        x2="200"
        y2="120"
        stroke="currentColor"
        strokeWidth="0.75"
        opacity="0.6"
      />
    </svg>
  );
}
