import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  ColorSelectionInput,
  ConfigurationPaneInput,
  GlassExtra,
  HingeSide,
  PaneOpeningType,
} from '@beqsan/api-types';

export type ConfiguratorStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type DimensionConstraints = {
  minWidthCm: number;
  maxWidthCm: number;
  minHeightCm: number;
  maxHeightCm: number;
};

export type SelectedProductType = {
  id: string;
  slug: string;
  name: string;
  constraints: DimensionConstraints;
};

export type SelectedMaterial = {
  id: string;
  slug: string;
  name: string;
  family: 'aluminum' | 'pvc';
  thermalRating: 'none' | 'basic' | 'thermal' | 'highThermal';
  basePricePerSqmMinor: number;
  currency: string;
};

export type ConfiguratorDimensions = {
  widthCm: number;
  heightCm: number;
};

export type ConfiguratorState = {
  step: ConfiguratorStep;
  productType: SelectedProductType | null;
  material: SelectedMaterial | null;
  dimensions: ConfiguratorDimensions;
  panes: ConfigurationPaneInput[];
  /**
   * Default glass id resolved from the material's compat set. Used by Step 5
   * to auto-select on entry and by `setMaterial` to reset panes to a sensible
   * baseline when material changes. `null` means "not yet known" (Step 1/2
   * before the glass-types hook runs).
   */
  defaultGlassTypeId: string | null;
  /**
   * Step 6 — frame color. Outer required; inner optional (null = same as
   * outer, the typical case). Custom RAL fields populated only when the
   * outer slug is `ral-custom` (driven by the palette modal).
   */
  color: ColorSelectionInput | null;
  /** Default color id resolved from the material's compat set (IsDefault flag). */
  defaultColorOptionId: string | null;
};

export type ConfiguratorActions = {
  setProductType: (pt: SelectedProductType) => void;
  setMaterial: (m: SelectedMaterial) => void;
  setDimensions: (d: Partial<ConfiguratorDimensions>) => void;
  setPaneCount: (n: number) => void;
  setPaneOpening: (position: number, opening: PaneOpeningType) => void;
  setPaneHinge: (position: number, hinge: HingeSide | null) => void;
  setPaneRatios: (ratios: number[]) => void;
  togglePaneMosquito: (position: number) => void;
  setPaneGlass: (position: number, glassTypeId: string) => void;
  togglePaneGlassExtra: (position: number, extra: GlassExtra) => void;
  setAllPanesGlass: (glassTypeId: string) => void;
  setDefaultGlassTypeId: (glassTypeId: string | null) => void;
  setOuterColor: (colorOptionId: string) => void;
  setInnerColor: (colorOptionId: string | null) => void;
  setCustomRal: (hex: string, code: string, ralCustomId: string) => void;
  resetColor: () => void;
  setDefaultColorOptionId: (colorOptionId: string | null) => void;
  goToStep: (n: ConfiguratorStep) => void;
  reset: () => void;
};

/**
 * Slug-keyed pane-count band — must stay in lockstep with BACK's
 * `LayoutValidator.PaneCountRange`. When admin columns ship in Phase 2 this
 * table moves to the productType payload.
 */
export const PANE_COUNT_RANGE: Record<string, { min: number; max: number; defaultCount: number }> = {
  window: { min: 1, max: 4, defaultCount: 1 },
  door: { min: 1, max: 2, defaultCount: 1 },
  sliding: { min: 2, max: 4, defaultCount: 2 },
  panoramic: { min: 1, max: 6, defaultCount: 2 },
  balcony: { min: 1, max: 8, defaultCount: 3 },
};

export function paneRangeFor(slug: string | null | undefined): {
  min: number;
  max: number;
  defaultCount: number;
} {
  return PANE_COUNT_RANGE[slug ?? ''] ?? { min: 1, max: 4, defaultCount: 1 };
}

function defaultOpeningFor(slug: string | null | undefined): PaneOpeningType {
  return slug === 'sliding' ? 'Sliding' : 'Fixed';
}

/**
 * Build N equal-width panes. All panes start with the slug-default opening
 * + the material's default glass + no extras. The legacy 5-arg pane shape
 * is no longer constructed here — every pane carries explicit glass state
 * from Step 5 on. When `defaultGlassTypeId` is null (Step 1/2 before the
 * material query resolves), an empty string is written so the server falls
 * back to its own default-glass lookup.
 */
function buildEqualPanes(
  count: number,
  slug: string | null | undefined,
  defaultGlassTypeId: string | null,
): ConfigurationPaneInput[] {
  if (count < 1) return [];
  const opening = defaultOpeningFor(slug);
  const ratio = Number((1 / count).toFixed(4));
  return Array.from({ length: count }, (_, i) => ({
    position: i + 1,
    widthRatio: i === count - 1 ? Number((1 - ratio * (count - 1)).toFixed(4)) : ratio,
    openingType: opening,
    hingeSide: null,
    hasMosquitoNet: false,
    glassTypeId: defaultGlassTypeId,
    glassExtras: [],
  }));
}

const INITIAL: ConfiguratorState = {
  step: 1,
  productType: null,
  material: null,
  dimensions: { widthCm: 120, heightCm: 140 },
  panes: buildEqualPanes(1, 'window', null),
  defaultGlassTypeId: null,
  color: null,
  defaultColorOptionId: null,
};

function midpoint(constraints: DimensionConstraints): ConfiguratorDimensions {
  return {
    widthCm: Math.round((constraints.minWidthCm + constraints.maxWidthCm) / 2),
    heightCm: Math.round((constraints.minHeightCm + constraints.maxHeightCm) / 2),
  };
}

function normalize(panes: ConfigurationPaneInput[]): ConfigurationPaneInput[] {
  if (panes.length === 0) return panes;
  const sum = panes.reduce((s, p) => s + p.widthRatio, 0);
  if (Math.abs(sum - 1) <= 0.001) {
    return panes.map((p, i) => ({ ...p, position: i + 1 }));
  }
  const scale = 1 / sum;
  const scaled = panes.map((p) => ({
    ...p,
    widthRatio: Number((p.widthRatio * scale).toFixed(4)),
  }));
  const residue = 1 - scaled.slice(0, -1).reduce((s, p) => s + p.widthRatio, 0);
  scaled[scaled.length - 1] = {
    ...scaled[scaled.length - 1],
    widthRatio: Number(residue.toFixed(4)),
  };
  return scaled.map((p, i) => ({ ...p, position: i + 1 }));
}

export const useConfiguratorStore = create<ConfiguratorState & ConfiguratorActions>()(
  persist(
    (set) => ({
      ...INITIAL,

      setProductType: (productType) =>
        set((prev) => {
          if (prev.productType?.id === productType.id) {
            return { productType };
          }
          const { defaultCount } = paneRangeFor(productType.slug);
          return {
            productType,
            material: null,
            defaultGlassTypeId: null,
            dimensions: midpoint(productType.constraints),
            panes: buildEqualPanes(defaultCount, productType.slug, null),
          };
        }),

      setMaterial: (material) =>
        set((prev) => {
          if (prev.material?.id === material.id) return { material };
          // Material change invalidates glass + color selections — defaults
          // reload via the hooks. Resetting per-pane glass + the
          // configuration-level color to null lets the server resolve the
          // new material's defaults next price request.
          return {
            material,
            defaultGlassTypeId: null,
            defaultColorOptionId: null,
            color: null,
            panes: prev.panes.map((p) => ({
              ...p,
              glassTypeId: null,
              glassExtras: [],
            })),
          };
        }),

      setDimensions: (delta) =>
        set((prev) => ({ dimensions: { ...prev.dimensions, ...delta } })),

      setPaneCount: (n) =>
        set((prev) => {
          const range = paneRangeFor(prev.productType?.slug);
          const target = Math.max(range.min, Math.min(range.max, n));
          if (target === prev.panes.length) return prev;
          return {
            panes: buildEqualPanes(target, prev.productType?.slug, prev.defaultGlassTypeId),
          };
        }),

      setPaneOpening: (position, opening) =>
        set((prev) => ({
          panes: prev.panes.map((p) =>
            p.position === position
              ? {
                  ...p,
                  openingType: opening,
                  hingeSide:
                    opening === 'Casement' || opening === 'TiltAndTurn'
                      ? p.hingeSide ?? 'Right'
                      : null,
                }
              : p,
          ),
        })),

      setPaneHinge: (position, hinge) =>
        set((prev) => ({
          panes: prev.panes.map((p) => (p.position === position ? { ...p, hingeSide: hinge } : p)),
        })),

      setPaneRatios: (ratios) =>
        set((prev) => {
          if (ratios.length !== prev.panes.length) return prev;
          const next = prev.panes.map((p, i) => ({
            ...p,
            widthRatio: Number(ratios[i]!.toFixed(4)),
          }));
          return { panes: normalize(next) };
        }),

      togglePaneMosquito: (position) =>
        set((prev) => ({
          panes: prev.panes.map((p) =>
            p.position === position ? { ...p, hasMosquitoNet: !p.hasMosquitoNet } : p,
          ),
        })),

      setPaneGlass: (position, glassTypeId) =>
        set((prev) => ({
          panes: prev.panes.map((p) =>
            p.position === position ? { ...p, glassTypeId } : p,
          ),
        })),

      togglePaneGlassExtra: (position, extra) =>
        set((prev) => ({
          panes: prev.panes.map((p) => {
            if (p.position !== position) return p;
            const present = (p.glassExtras ?? []).includes(extra);
            let next = present
              ? (p.glassExtras ?? []).filter((e) => e !== extra)
              : [...(p.glassExtras ?? []), extra];
            // Frosted + Tinted on the same pane is a server-side conflict;
            // mirror the rule client-side by removing the other when one is
            // turned on. Tested in StepGlass component spec.
            if (!present && extra === 'Frosted') {
              next = next.filter((e) => e !== 'Tinted');
            }
            if (!present && extra === 'Tinted') {
              next = next.filter((e) => e !== 'Frosted');
            }
            return { ...p, glassExtras: next };
          }),
        })),

      setAllPanesGlass: (glassTypeId) =>
        set((prev) => ({
          panes: prev.panes.map((p) => ({ ...p, glassTypeId })),
        })),

      setDefaultGlassTypeId: (defaultGlassTypeId) =>
        set((prev) => {
          // Adopting a default — apply it to any pane that hasn't picked
          // a glass yet (null id). User overrides stay intact.
          if (defaultGlassTypeId === null) return { defaultGlassTypeId };
          return {
            defaultGlassTypeId,
            panes: prev.panes.map((p) =>
              p.glassTypeId == null ? { ...p, glassTypeId: defaultGlassTypeId } : p,
            ),
          };
        }),

      setOuterColor: (colorOptionId) =>
        set((prev) => ({
          color: {
            outerColorOptionId: colorOptionId,
            innerColorOptionId: prev.color?.innerColorOptionId ?? null,
            customRalHex: null,
            customRalCode: null,
          },
        })),

      setInnerColor: (innerColorOptionId) =>
        set((prev) => {
          if (!prev.color) return prev;
          return {
            color: { ...prev.color, innerColorOptionId },
          };
        }),

      setCustomRal: (hex, code, ralCustomId) =>
        set(() => ({
          color: {
            outerColorOptionId: ralCustomId,
            innerColorOptionId: null,
            customRalHex: hex,
            customRalCode: code,
          },
        })),

      resetColor: () =>
        set((prev) => ({
          color: prev.defaultColorOptionId
            ? { outerColorOptionId: prev.defaultColorOptionId, innerColorOptionId: null, customRalHex: null, customRalCode: null }
            : null,
        })),

      setDefaultColorOptionId: (defaultColorOptionId) =>
        set((prev) => {
          if (defaultColorOptionId === null) return { defaultColorOptionId };
          // Adopt the default if the user hasn't picked anything yet.
          if (prev.color === null) {
            return {
              defaultColorOptionId,
              color: {
                outerColorOptionId: defaultColorOptionId,
                innerColorOptionId: null,
                customRalHex: null,
                customRalCode: null,
              },
            };
          }
          return { defaultColorOptionId };
        }),

      goToStep: (step) => set({ step }),

      reset: () => set(INITIAL),
    }),
    {
      name: 'beqsan-configurator-v1',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({
        step: s.step,
        productType: s.productType,
        material: s.material,
        dimensions: s.dimensions,
        panes: s.panes,
        defaultGlassTypeId: s.defaultGlassTypeId,
        color: s.color,
        defaultColorOptionId: s.defaultColorOptionId,
      }),
      version: 5, // bumped — color selection added
      migrate: (persisted, fromVersion) => {
        if (fromVersion < 2) {
          return INITIAL;
        }
        if (fromVersion < 3) {
          // v2 → v3: synthesise a single Fixed pane.
          const prior = persisted as Omit<ConfiguratorState, 'panes' | 'defaultGlassTypeId' | 'color' | 'defaultColorOptionId'>;
          return {
            ...prior,
            defaultGlassTypeId: null,
            color: null,
            defaultColorOptionId: null,
            panes: buildEqualPanes(
              paneRangeFor(prior.productType?.slug).defaultCount,
              prior.productType?.slug,
              null,
            ),
          } as ConfiguratorState;
        }
        if (fromVersion < 4) {
          // v3 → v4: existing panes don't carry glass fields.
          const prior = persisted as Omit<ConfiguratorState, 'color' | 'defaultColorOptionId'>;
          return {
            ...prior,
            defaultGlassTypeId: null,
            color: null,
            defaultColorOptionId: null,
            panes: prior.panes.map((p) => ({
              ...p,
              glassTypeId: null,
              glassExtras: [],
            })),
          } as ConfiguratorState;
        }
        if (fromVersion < 5) {
          // v4 → v5: color state added. Defaults reload via hook.
          const prior = persisted as Omit<ConfiguratorState, 'color' | 'defaultColorOptionId'>;
          return {
            ...prior,
            color: null,
            defaultColorOptionId: null,
          } as ConfiguratorState;
        }
        return persisted as ConfiguratorState;
      },
    },
  ),
);
