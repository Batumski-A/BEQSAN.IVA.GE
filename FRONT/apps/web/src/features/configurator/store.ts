import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
};

export type ConfiguratorActions = {
  setProductType: (pt: SelectedProductType) => void;
  setMaterial: (m: SelectedMaterial) => void;
  setDimensions: (d: Partial<ConfiguratorDimensions>) => void;
  goToStep: (n: ConfiguratorStep) => void;
  reset: () => void;
};

const INITIAL: ConfiguratorState = {
  step: 1,
  productType: null,
  material: null,
  dimensions: { widthCm: 120, heightCm: 140 },
};

/**
 * Mid-point of a constraint range, clamped so dimensions land on whole cm and
 * stay strictly inside the bounds. Used when a product type is freshly selected
 * so Step 3 opens on sensible defaults (window → 165×140, door → 100×220, etc.)
 * instead of inheriting a value that's now out of range.
 */
function midpoint(constraints: DimensionConstraints): ConfiguratorDimensions {
  return {
    widthCm: Math.round((constraints.minWidthCm + constraints.maxWidthCm) / 2),
    heightCm: Math.round((constraints.minHeightCm + constraints.maxHeightCm) / 2),
  };
}

export const useConfiguratorStore = create<ConfiguratorState & ConfiguratorActions>()(
  persist(
    (set) => ({
      ...INITIAL,

      setProductType: (productType) =>
        set((prev) => {
          // Same product type re-selected — keep material + dimensions intact.
          if (prev.productType?.id === productType.id) {
            return { productType };
          }
          // Different product type — reset material (rows differ across types)
          // and initialise dimensions to the constraint midpoint so Step 3 opens
          // on legal values.
          return {
            productType,
            material: null,
            dimensions: midpoint(productType.constraints),
          };
        }),

      setMaterial: (material) => set({ material }),

      setDimensions: (delta) =>
        set((prev) => ({ dimensions: { ...prev.dimensions, ...delta } })),

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
      }),
      version: 2, // bumped — productType now carries constraints
      migrate: (persisted, fromVersion) => {
        // v1 → v2: productType is missing `constraints`. Safest move is to drop
        // the selection so the user re-picks; this only affects sessions opened
        // before the Step 3 slice landed.
        if (fromVersion < 2) {
          return INITIAL;
        }
        return persisted as ConfiguratorState;
      },
    },
  ),
);
