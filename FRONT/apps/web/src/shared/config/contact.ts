/**
 * Single source of truth for BEQSAN contact identity on the public site.
 * Real workshop number set by Lasha on 2026-07-02.
 */
export const PHONE_E164 = '+995593644673';

export const PHONE_DISPLAY = '+995 593 64 46 73';

export const PHONE_TEL_HREF = `tel:${PHONE_E164}`;

/** wa.me requires digits only, no plus sign. */
const WHATSAPP_DIGITS = PHONE_E164.replace(/\D/g, '');

/** Deep link into a WhatsApp chat with BEQSAN, message prefilled. */
export function whatsAppUrl(text?: string): string {
  const base = `https://wa.me/${WHATSAPP_DIGITS}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
