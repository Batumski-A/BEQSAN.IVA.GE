/**
 * Sprint A — Room Context Presets type contract.
 * Spec: docs/superpowers/specs/2026-05-28-sprint-a-room-context-presets-design.md
 */

export type PresetKind = 'apartment' | 'exterior' | 'veranda';

export type PresetMetadata = {
  kind: PresetKind;
  /** i18next key for the segmented-control label. */
  labelKey: string;
  /** i18next key for the aria-label. */
  ariaLabelKey: string;
  /** Lucide icon name — must match an existing import in LiveStudio.tsx. */
  iconName: 'building-2' | 'home' | 'sunset';
  /** drei <Environment> preset for image-based lighting. */
  hdriPreset: 'city' | 'sunset' | 'dawn';
  /** Primary key-light colour temperature (used for material warm/cool tuning). */
  keyTemperatureK: 2700 | 3500 | 5500;
};

export const PRESETS: ReadonlyArray<PresetMetadata> = [
  {
    kind: 'apartment',
    labelKey: 'studio.roomPreset.apartment',
    ariaLabelKey: 'studio.roomPreset.apartmentAria',
    iconName: 'building-2',
    hdriPreset: 'city',
    keyTemperatureK: 2700,
  },
  {
    kind: 'exterior',
    labelKey: 'studio.roomPreset.exterior',
    ariaLabelKey: 'studio.roomPreset.exteriorAria',
    iconName: 'home',
    hdriPreset: 'sunset',
    keyTemperatureK: 3500,
  },
  {
    kind: 'veranda',
    labelKey: 'studio.roomPreset.veranda',
    ariaLabelKey: 'studio.roomPreset.verandaAria',
    iconName: 'sunset',
    hdriPreset: 'dawn',
    keyTemperatureK: 5500,
  },
];

/** Look up metadata by kind. Returns undefined for unknown kinds. */
export function presetByKind(kind: PresetKind): PresetMetadata | undefined {
  return PRESETS.find((p) => p.kind === kind);
}
