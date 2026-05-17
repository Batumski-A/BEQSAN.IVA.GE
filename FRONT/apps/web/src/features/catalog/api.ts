import { useQuery } from '@tanstack/react-query';

import { api, unwrap, type ApiResponse } from '@/shared/api/client';
import type { components } from '@beqsan/api-types/generated';

export type ProductType = components['schemas']['ProductTypeDto'];

export const catalogKeys = {
  all: ['catalog'] as const,
  productTypes: () => [...catalogKeys.all, 'product-types'] as const,
};

async function fetchProductTypes(): Promise<ProductType[]> {
  const response = await api.get<ApiResponse<ProductType[]>>('/catalog/product-types');
  return unwrap(response);
}

export function useProductTypes() {
  return useQuery({
    queryKey: catalogKeys.productTypes(),
    queryFn: fetchProductTypes,
    // Mirror the server cache TTL — 5 minutes — so the client doesn't refetch
    // before the server would even have anything new for it.
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}
