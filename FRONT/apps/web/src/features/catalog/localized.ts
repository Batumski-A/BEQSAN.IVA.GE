import type { components } from '@beqsan/api-types/generated';

type LocalizedText = components['schemas']['LocalizedText'];

/**
 * Reads the requested locale from a LocalizedText payload, falling back to Ka
 * (always required server-side) for unknown locales or missing translations.
 * Mirrors the server's LocalizedText.Resolve behaviour so consumers get
 * the same string regardless of which side resolves the locale.
 */
export function resolveLocalized(value: LocalizedText | undefined, locale: string): string {
  if (!value) return '';
  if (locale.startsWith('en') && value.en) return value.en;
  if (locale.startsWith('ru') && value.ru) return value.ru;
  return value.ka ?? '';
}
