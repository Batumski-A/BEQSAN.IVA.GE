import type { TFunction } from 'i18next';

import { ApiResponseError, type ApiError } from '@/shared/api/client';

/**
 * Translates a server-side LayoutValidator error into a localised string for
 * display. The mapping is keyed by the BACK code (configurator.layout.*) so
 * the FRONT never has to parse Georgian text — it interpolates from the
 * error's `metadata` bag directly into the locale template (see
 * docs/api/result-envelope.md and ADR-0002 amendment 2026-05-17).
 *
 * Any unrecognised code falls back to the locale `errors.layout.fallback`,
 * which is a generic "this layout isn't valid" — better than rendering raw
 * Georgian on en/ru.
 */
export function translateLayoutError(error: ApiError, t: TFunction): string {
  const meta = error.metadata ?? {};
  switch (error.code) {
    case 'configurator.layout.panesRequired':
      return t('configurator.errors.layout.panesRequired');
    case 'configurator.layout.paneCount':
      return t('configurator.errors.layout.paneCount', {
        min: meta.min,
        max: meta.max,
      });
    case 'configurator.layout.widthRatioSum':
      return t('configurator.errors.layout.widthRatioSum');
    case 'configurator.layout.positions':
      return t('configurator.errors.layout.positions');
    case 'configurator.layout.door.tooManyFixed':
      return t('configurator.errors.layout.doorTooManyFixed');
    case 'configurator.layout.sliding.invalidOpening':
      return t('configurator.errors.layout.slidingInvalidOpening', {
        position: meta.position,
      });
    case 'configurator.layout.pane.hingeRequired':
      return t('configurator.errors.layout.hingeRequired', {
        position: meta.position,
      });
    case 'configurator.layout.pane.hingeForbidden':
      return t('configurator.errors.layout.hingeForbidden', {
        position: meta.position,
      });
    case 'configurator.layout.pane.openingTypeInvalid':
      return t('configurator.errors.layout.openingTypeInvalid', {
        position: meta.position,
      });
    case 'configurator.layout.pane.hingeSideInvalid':
      return t('configurator.errors.layout.hingeSideInvalid', {
        position: meta.position,
      });
    // Step-5 glass codes flow through the same renderer so a Step-4 page
    // hosting the PricePreview surfaces them too.
    case 'configurator.glass.required':
      return t('configurator.errors.glass.required', { position: meta.position });
    case 'configurator.glass.notCompatibleWithMaterial':
      return t('configurator.errors.glass.notCompatibleWithMaterial');
    case 'configurator.glass.frostedTintedConflict':
      return t('configurator.errors.glass.frostedTintedConflict');
    case 'configurator.glass.extraInvalid':
      return t('configurator.errors.glass.extraInvalid', { position: meta.position });
    default:
      return t('configurator.errors.layout.fallback');
  }
}

/**
 * Pull the first layout-or-glass error out of a query error, if any.
 * Returns null if the error wasn't an envelope failure or no relevant
 * code was present.
 */
export function firstLayoutError(unknownError: unknown): ApiError | null {
  if (!(unknownError instanceof ApiResponseError)) return null;
  return (
    unknownError.errors.find(
      (e) =>
        e.code.startsWith('configurator.layout.') ||
        e.code.startsWith('configurator.glass.'),
    ) ?? null
  );
}
