import { useQuery } from '@tanstack/react-query';

import { api, unwrap, type ApiResponse } from '@/shared/api/client';
import type { ColorSelectionInput, ConfigurationPaneInput } from '@beqsan/api-types';
import type { components } from '@beqsan/api-types/generated';

export type Material = components['schemas']['MaterialDto'];
export type PriceBreakdown = components['schemas']['PriceBreakdownDto'];
export type GlassType = components['schemas']['GlassTypeDto'];
export type ColorOption = components['schemas']['ColorOptionDto'];

export type PriceRequest = {
  productTypeId: string;
  materialId: string;
  widthCm: number;
  heightCm: number;
  // Optional — when omitted the BACK synthesises a single full-width Fixed
  // pane, preserving the Step 1+2 canary (753.31 ₾). Step 4 sends the full
  // panes array from the store.
  panes?: ConfigurationPaneInput[];
  // Optional — when omitted the BACK resolves the material's default
  // color (white-ral9016, surcharge 0). Step 6 sends the full selection.
  color?: ColorSelectionInput;
};

export const configuratorKeys = {
  all: ['configurator'] as const,
  materials: (productTypeId: string | null | undefined) =>
    ['catalog', 'materials', productTypeId ?? null] as const,
  glassTypes: (materialId: string | null | undefined) =>
    ['catalog', 'glass-types', materialId ?? null] as const,
  colors: (materialId: string | null | undefined) =>
    ['catalog', 'colors', materialId ?? null] as const,
  price: (req: PriceRequest | null) => ['configurator', 'price', req] as const,
};

async function fetchMaterials(productTypeId: string): Promise<Material[]> {
  const response = await api.get<ApiResponse<Material[]>>(
    `/catalog/product-types/${productTypeId}/materials`,
  );
  return unwrap(response);
}

export function useMaterialsByProductType(productTypeId: string | null | undefined) {
  return useQuery({
    queryKey: configuratorKeys.materials(productTypeId),
    queryFn: () => fetchMaterials(productTypeId!),
    enabled: Boolean(productTypeId),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}

async function fetchGlassTypes(materialId: string): Promise<GlassType[]> {
  const response = await api.get<ApiResponse<GlassType[]>>(
    `/catalog/materials/${materialId}/glass-types`,
  );
  return unwrap(response);
}

export function useGlassTypesByMaterial(materialId: string | null | undefined) {
  return useQuery({
    queryKey: configuratorKeys.glassTypes(materialId),
    queryFn: () => fetchGlassTypes(materialId!),
    enabled: Boolean(materialId),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}

async function fetchColors(materialId: string): Promise<ColorOption[]> {
  const response = await api.get<ApiResponse<ColorOption[]>>(
    `/catalog/materials/${materialId}/colors`,
  );
  return unwrap(response);
}

export function useColorsByMaterial(materialId: string | null | undefined) {
  return useQuery({
    queryKey: configuratorKeys.colors(materialId),
    queryFn: () => fetchColors(materialId!),
    enabled: Boolean(materialId),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}

async function fetchPrice(req: PriceRequest): Promise<PriceBreakdown> {
  const response = await api.post<ApiResponse<PriceBreakdown>>('/configurator/price', req);
  return unwrap(response);
}

export function useConfiguratorPrice(req: PriceRequest | null) {
  return useQuery({
    queryKey: configuratorKeys.price(req),
    queryFn: () => fetchPrice(req!),
    enabled: Boolean(req?.productTypeId && req?.materialId),
    // Price isn't worth caching long client-side — it's debounced server-side
    // by the materials cache anyway. Refetch within the same step session.
    staleTime: 30_000,
    gcTime: 60_000,
    retry: (failureCount, error) => {
      // Validation/business-rule failures (400/422) shouldn't retry —
      // input change is the only way out. Network/500 can retry once.
      const status = (error as { status?: number })?.status ?? 0;
      if (status === 400 || status === 404 || status === 422) {
        return false;
      }
      return failureCount < 1;
    },
  });
}
