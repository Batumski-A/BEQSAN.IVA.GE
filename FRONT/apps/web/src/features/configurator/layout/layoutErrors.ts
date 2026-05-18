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
    // Step-6 color codes.
    case 'configurator.color.catalogMissing':
      return t('configurator.errors.color.catalogMissing');
    case 'configurator.color.notCompatibleWithMaterial': {
      const which = (meta.which as string) ?? '';
      if (which === 'outer') return t('configurator.errors.color.notCompatibleOuter');
      if (which === 'inner') return t('configurator.errors.color.notCompatibleInner');
      return t('configurator.errors.color.notCompatibleWithMaterial');
    }
    case 'configurator.color.dualOnlyOnPvc':
      return t('configurator.errors.color.dualOnlyOnPvc');
    case 'configurator.color.ralCustomMissing':
      return t('configurator.errors.color.ralCustomMissing');
    case 'configurator.color.ralCustomHexInvalid':
      return t('configurator.errors.color.ralCustomHexInvalid');
    case 'configurator.color.ralCustomCodeInvalid':
      return t('configurator.errors.color.ralCustomCodeInvalid');
    // Step 7 accessory codes.
    case 'configurator.accessory.handleRequired':
      return t('configurator.errors.accessory.handleRequired');
    case 'configurator.accessory.handleNoOpenablePane':
      return t('configurator.errors.accessory.handleNoOpenablePane');
    case 'configurator.accessory.handleNotCompatible':
      return t('configurator.errors.accessory.handleNotCompatible');
    case 'configurator.accessory.lockRequired':
      return t('configurator.errors.accessory.lockRequired');
    case 'configurator.accessory.lockNotCompatibleProduct':
      return t('configurator.errors.accessory.lockNotCompatibleProduct');
    case 'configurator.accessory.lockRequiresFullOpening':
      return t('configurator.errors.accessory.lockRequiresFullOpening');
    case 'configurator.accessory.sillLengthOutOfRange':
      return t('configurator.errors.accessory.sillLengthOutOfRange', {
        min: meta.min,
        max: meta.max,
      });
    case 'configurator.accessory.sillPositionInvalid':
      return t('configurator.errors.accessory.sillPositionInvalid');
    case 'configurator.accessory.blindNotCompatibleProduct':
      return t('configurator.errors.accessory.blindNotCompatibleProduct');
    case 'configurator.accessory.blindControlNotSupported':
      return t('configurator.errors.accessory.blindControlNotSupported');
    case 'configurator.accessory.blindControlInvalid':
      return t('configurator.errors.accessory.blindControlInvalid');
    case 'configurator.installation.regionInvalid':
      return t('configurator.errors.installation.regionInvalid');
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
        e.code.startsWith('configurator.glass.') ||
        e.code.startsWith('configurator.color.') ||
        e.code.startsWith('configurator.accessory.') ||
        e.code.startsWith('configurator.installation.'),
    ) ?? null
  );
}
