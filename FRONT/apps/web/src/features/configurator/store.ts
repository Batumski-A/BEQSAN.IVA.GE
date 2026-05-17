import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  ConfigurationPaneInput,
  HingeSide,
  PaneOpeningType,
} from '@beqsan/api-types';

export type ConfiguratorStep = 1 | 2 | 3 | 4;

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

/**
 * Choose a sensible default opening for the first pane of a freshly-sized
 * layout. Matches BACK rules: sliding-only for sliding, otherwise Fixed.
 */
function defaultOpeningFor(slug: string | null | undefined): PaneOpeningType {
  return slug === 'sliding' ? 'Sliding' : 'Fixed';
}

/**
 * Build N equal-width panes whose ratios sum to exactly 1.000 (last pane
 * absorbs rounding so Σ stays within validator tolerance). All panes start
 * with the slug-default opening so the user sees a legal layout immediately;
 * they can switch individual panes from there.
 */
function buildEqualPanes(count: number, slug: string | null | undefined): ConfigurationPaneInput[] {
  if (count < 1) return [];
  const opening = defaultOpeningFor(slug);
  const ratio = Number((1 / count).toFixed(4));
  return Array.from({ length: count }, (_, i) => ({
    position: i + 1,
    widthRatio: i === count - 1 ? Number((1 - ratio * (count - 1)).toFixed(4)) : ratio,
    openingType: opening,
    hingeSide: null,
    hasMosquitoNet: false,
  }));
}

const INITIAL: ConfiguratorState = {
  step: 1,
  productType: null,
  material: null,
  dimensions: { widthCm: 120, heightCm: 140 },
  panes: buildEqualPanes(1, 'window'),
};

function midpoint(constraints: DimensionConstraints): ConfiguratorDimensions {
  return {
    widthCm: Math.round((constraints.minWidthCm + constraints.maxWidthCm) / 2),
    heightCm: Math.round((constraints.minHeightCm + constraints.maxHeightCm) / 2),
  };
}

/**
 * Normalise an updated panes array so positions are 1..N in order and the
 * ratio sum stays at 1.000. Used by mutators that could otherwise leave
 * fractional drift after several edits.
 */
function normalize(panes: ConfigurationPaneInput[]): ConfigurationPaneInput[] {
  if (panes.length === 0) return panes;
  const sum = panes.reduce((s, p) => s + p.widthRatio, 0);
  // Within 0.001 of 1.000 — let the validator's tolerance accept it without
  // a forced redistribute that would visually jolt the schematic.
  if (Math.abs(sum - 1) <= 0.001) {
    return panes.map((p, i) => ({ ...p, position: i + 1 }));
  }
  // Out of tolerance — rescale proportionally, then absorb residue into the
  // last pane so Σ lands exactly at 1.000.
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
            dimensions: midpoint(productType.constraints),
            panes: buildEqualPanes(defaultCount, productType.slug),
          };
        }),

      setMaterial: (material) => set({ material }),

      setDimensions: (delta) =>
        set((prev) => ({ dimensions: { ...prev.dimensions, ...delta } })),

      setPaneCount: (n) =>
        set((prev) => {
          const range = paneRangeFor(prev.productType?.slug);
          const target = Math.max(range.min, Math.min(range.max, n));
          if (target === prev.panes.length) return prev;
          return { panes: buildEqualPanes(target, prev.productType?.slug) };
        }),

      setPaneOpening: (position, opening) =>
        set((prev) => ({
          panes: prev.panes.map((p) =>
            p.position === position
              ? {
                  ...p,
                  openingType: opening,
                  // Clear hinge when switching to an opening that forbids it;
                  // require the user to set it when switching to one that needs it.
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
      }),
      version: 3, // bumped — panes added
      migrate: (persisted, fromVersion) => {
        // v1 → v3: drop everything; productType constraints are missing.
        if (fromVersion < 2) {
          return INITIAL;
        }
        // v2 → v3: synthesize a single Fixed pane so the user picks up where
        // they left off without a forced step reset.
        if (fromVersion < 3) {
          const prior = persisted as Omit<ConfiguratorState, 'panes'>;
          return {
            ...prior,
            panes: buildEqualPanes(paneRangeFor(prior.productType?.slug).defaultCount, prior.productType?.slug),
          } as ConfiguratorState;
        }
        return persisted as ConfiguratorState;
      },
    },
  ),
);
