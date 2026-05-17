import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          base: 'oklch(15% 0.01 250)',
          elevated: 'oklch(19% 0.012 250)',
          raised: 'oklch(23% 0.014 250)',
          overlay: 'oklch(27% 0.016 250)',
        },
        fg: {
          primary: 'oklch(96% 0.005 95)',
          secondary: 'oklch(78% 0.008 95)',
          // 62% lifts captions above WCAG 4.5:1 contrast against bg-base
          // (was 56% which measured ~4.0:1 in Lighthouse on 2026-05-17).
          tertiary: 'oklch(62% 0.01 250)',
          disabled: 'oklch(38% 0.01 250)',
        },
        mat: {
          aluminum: 'oklch(72% 0.015 240)',
          'aluminum-h': 'oklch(82% 0.015 240)',
          'aluminum-d': 'oklch(55% 0.015 240)',
        },
        accent: {
          amber: 'oklch(74% 0.16 65)',
          'amber-h': 'oklch(82% 0.16 65)',
          'amber-glow': 'oklch(74% 0.16 65 / 0.35)',
        },
        system: {
          success: 'oklch(72% 0.16 145)',
          warning: 'oklch(78% 0.15 75)',
          danger: 'oklch(63% 0.22 25)',
          info: 'oklch(70% 0.13 230)',
        },
        hairline: {
          DEFAULT: 'oklch(96% 0 0 / 0.08)',
          strong: 'oklch(96% 0 0 / 0.14)',
        },
      },
      fontFamily: {
        display: ['"BPG Mrgvlovani Caps"', '"BPG Glaho Sans Caps"', 'system-ui', 'sans-serif'],
        headline: ['"BPG Glaho Sans"', 'system-ui', 'sans-serif'],
        sans: ['FiraGO', 'system-ui', 'sans-serif'],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      fontSize: {
        // [size, { lineHeight, letterSpacing, fontWeight }]
        'display-1': ['72px', { lineHeight: '80px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display-2': ['56px', { lineHeight: '64px', letterSpacing: '-0.02em', fontWeight: '600' }],
        h1: ['40px', { lineHeight: '48px', letterSpacing: '-0.01em', fontWeight: '600' }],
        h2: ['32px', { lineHeight: '40px', letterSpacing: '-0.01em', fontWeight: '600' }],
        h3: ['24px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '600' }],
        h4: ['20px', { lineHeight: '28px', fontWeight: '500' }],
        'body-lg': ['18px', { lineHeight: '28px' }],
        body: ['16px', { lineHeight: '24px' }],
        'body-sm': ['14px', { lineHeight: '20px' }],
        caption: ['12px', { lineHeight: '16px' }],
        'mono-spec': ['13px', { lineHeight: '18px', letterSpacing: '0.04em' }],
      },
      spacing: {
        4.5: '18px',
        18: '72px',
        22: '88px',
        30: '120px',
        46: '184px',
      },
      maxWidth: {
        content: '1440px',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.32, 0.72, 0, 1)',
        enter: 'cubic-bezier(0, 0, 0.2, 1)',
        exit: 'cubic-bezier(0.4, 0, 1, 1)',
        heavy: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        80: '80ms',
        120: '120ms',
        200: '200ms',
        240: '240ms',
        320: '320ms',
        480: '480ms',
      },
      animation: {
        'fade-in': 'fadeIn 320ms cubic-bezier(0, 0, 0.2, 1) both',
        'slide-up': 'slideUp 480ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'pulse-soft': 'pulseSoft 2400ms cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
      },
      backgroundImage: {
        grain: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.025 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
      },
    },
  },
  plugins: [],
};

export default config;
