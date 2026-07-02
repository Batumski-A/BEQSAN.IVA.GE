/**
 * Single source of truth for BEQSAN contact identity on the public site.
 *
 * TODO(roman): +995595000000 is still the placeholder from Contact.tsx —
 * swap for the workshop's real WhatsApp-enabled number before launch.
 * Tracked in docs/questions.md.
 */
export const PHONE_E164 = '+995595000000';

export const PHONE_DISPLAY = '+995 595 00 00 00';

export const PHONE_TEL_HREF = `tel:${PHONE_E164}`;

/** wa.me requires digits only, no plus sign. */
const WHATSAPP_DIGITS = PHONE_E164.replace(/\D/g, '');

/** Deep link into a WhatsApp chat with BEQSAN, message prefilled. */
export function whatsAppUrl(text?: string): string {
  const base = `https://wa.me/${WHATSAPP_DIGITS}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
