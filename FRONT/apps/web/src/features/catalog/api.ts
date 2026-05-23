import { useQuery } from '@tanstack/react-query';

import { api, unwrap, type ApiResponse } from '@/shared/api/client';
import type { components } from '@beqsan/api-types/generated';

export type ProductType = components['schemas']['ProductTypeDto'];
export type ProductTypeDetail = components['schemas']['ProductTypeDetailDto'];

export const catalogKeys = {
  all: ['catalog'] as const,
  productTypes: () => [...catalogKeys.all, 'product-types'] as const,
  productTypeDetail: (idOrSlug: string | null | undefined) =>
    [...catalogKeys.all, 'product-type', idOrSlug ?? null] as const,
};

async function fetchProductTypes(): Promise<ProductType[]> {
  const response = await api.get<ApiResponse<ProductType[]>>('/catalog/product-types');
  return unwrap(response);
}

export function useProductTypes() {
  return useQuery({
    queryKey: catalogKeys.productTypes(),
    queryFn: fetchProductTypes,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}

export async function fetchProductTypeDetail(idOrSlug: string): Promise<ProductTypeDetail> {
  const response = await api.get<ApiResponse<ProductTypeDetail>>(
    `/catalog/product-types/${encodeURIComponent(idOrSlug)}`,
  );
  return unwrap(response);
}

/**
 * Loads a single product type with its dimension constraints. Step 1 fires
 * this when the user picks a card so Step 2/3 have the bounds available
 * without an extra round-trip.
 */
export function useProductTypeDetail(idOrSlug: string | null | undefined) {
  return useQuery({
    queryKey: catalogKeys.productTypeDetail(idOrSlug),
    queryFn: () => fetchProductTypeDetail(idOrSlug!),
    enabled: Boolean(idOrSlug),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}
