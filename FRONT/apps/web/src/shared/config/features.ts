/**
 * Public feature flags.
 *
 * SHOW_PUBLIC_PRICES — Roman's call (2026-07-02): prices are OFF on the
 * public site. Instead of a live total the visitor sends their drawing
 * to WhatsApp and the conversation continues there. Flip back on by
 * setting VITE_SHOW_PUBLIC_PRICES=true at build time; no code changes
 * needed. Admin pricing surfaces are unaffected by this flag.
 */
export const SHOW_PUBLIC_PRICES: boolean =
  import.meta.env.VITE_SHOW_PUBLIC_PRICES === 'true';
