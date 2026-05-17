import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ConfiguratorStep = 1 | 2 | 3;

export type SelectedProductType = {
  id: string;
  slug: string;
  name: string;
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

export const useConfiguratorStore = create<ConfiguratorState & ConfiguratorActions>()(
  persist(
    (set) => ({
      ...INITIAL,

      // Changing product type invalidates the material (different product types
      // share material slugs but their material rows are distinct).
      setProductType: (productType) =>
        set((prev) =>
          prev.productType?.id === productType.id
            ? { productType }
            : { productType, material: null },
        ),

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
      version: 1,
    },
  ),
);
