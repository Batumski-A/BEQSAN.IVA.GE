import { useQuery } from '@tanstack/react-query';

import { api, unwrap, type ApiResponse } from '@/shared/api/client';
import { SHOW_PUBLIC_PRICES } from '@/shared/config/features';
import type {
  AccessorySelectionInput,
  ColorSelectionInput,
  ConfigurationPaneInput,
  InstallationOptionInput,
} from '@beqsan/api-types';
import type { components } from '@beqsan/api-types/generated';

export type Material = components['schemas']['MaterialDto'];
export type PriceBreakdown = components['schemas']['PriceBreakdownDto'];
export type GlassType = components['schemas']['GlassTypeDto'];
export type ColorOption = components['schemas']['ColorOptionDto'];
export type HandleStyle = components['schemas']['HandleStyleDto'];
export type LockType = components['schemas']['LockTypeDto'];
export type BlindType = components['schemas']['BlindTypeDto'];
export type ReviewResponse = components['schemas']['ReviewResponseDto'];

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
  // Optional — when omitted no accessory lines are added. Step 7 sends
  // the full selection; door product types must populate
  // accessories.handleStyleId + lockTypeId or the BACK validator 422s.
  accessories?: AccessorySelectionInput;
  // Optional — when omitted the BACK skips the installation line
  // (canaries #1-#6 hold). Step 8 sends the picked region; Batumi adds
  // no surcharge and emits no line, Other emits a manual-quote zero-
  // amount line, all other zones emit a flat surcharge line.
  installation?: InstallationOptionInput;
};

export const configuratorKeys = {
  all: ['configurator'] as const,
  materials: (productTypeId: string | null | undefined) =>
    ['catalog', 'materials', productTypeId ?? null] as const,
  glassTypes: (materialId: string | null | undefined) =>
    ['catalog', 'glass-types', materialId ?? null] as const,
  colors: (materialId: string | null | undefined) =>
    ['catalog', 'colors', materialId ?? null] as const,
  handleStyles: (materialId: string | null | undefined) =>
    ['catalog', 'handle-styles', materialId ?? null] as const,
  lockTypes: (productTypeId: string | null | undefined) =>
    ['catalog', 'lock-types', productTypeId ?? null] as const,
  blindTypes: (productTypeId: string | null | undefined) =>
    ['catalog', 'blind-types', productTypeId ?? null] as const,
  price: (req: PriceRequest | null) => ['configurator', 'price', req] as const,
  review: (req: PriceRequest | null) => ['configurator', 'review', req] as const,
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

async function fetchHandleStyles(materialId: string): Promise<HandleStyle[]> {
  const response = await api.get<ApiResponse<HandleStyle[]>>(
    `/catalog/materials/${materialId}/handle-styles`,
  );
  return unwrap(response);
}

export function useHandleStylesByMaterial(materialId: string | null | undefined) {
  return useQuery({
    queryKey: configuratorKeys.handleStyles(materialId),
    queryFn: () => fetchHandleStyles(materialId!),
    enabled: Boolean(materialId),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}

async function fetchLockTypes(productTypeId: string): Promise<LockType[]> {
  const response = await api.get<ApiResponse<LockType[]>>(
    `/catalog/product-types/${productTypeId}/lock-types`,
  );
  return unwrap(response);
}

export function useLockTypesByProductType(productTypeId: string | null | undefined) {
  return useQuery({
    queryKey: configuratorKeys.lockTypes(productTypeId),
    queryFn: () => fetchLockTypes(productTypeId!),
    enabled: Boolean(productTypeId),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}

async function fetchBlindTypes(productTypeId: string): Promise<BlindType[]> {
  const response = await api.get<ApiResponse<BlindType[]>>(
    `/catalog/product-types/${productTypeId}/blind-types`,
  );
  return unwrap(response);
}

export function useBlindTypesByProductType(productTypeId: string | null | undefined) {
  return useQuery({
    queryKey: configuratorKeys.blindTypes(productTypeId),
    queryFn: () => fetchBlindTypes(productTypeId!),
    enabled: Boolean(productTypeId),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}

async function fetchReview(req: PriceRequest): Promise<ReviewResponse> {
  const response = await api.post<ApiResponse<ReviewResponse>>('/configurator/review', req);
  return unwrap(response);
}

export function useConfiguratorReview(req: PriceRequest | null) {
  return useQuery({
    queryKey: configuratorKeys.review(req),
    queryFn: () => fetchReview(req!),
    // With public prices off nothing should hit the pricing endpoints.
    enabled: SHOW_PUBLIC_PRICES && Boolean(req?.productTypeId && req?.materialId),
    staleTime: 30_000,
    gcTime: 60_000,
    retry: (failureCount, error) => {
      const status = (error as { status?: number })?.status ?? 0;
      if (status === 400 || status === 404 || status === 422) {
        return false;
      }
      return failureCount < 1;
    },
  });
}

export type SnapshotResponse = {
  /** Public URL of the stored drawing, e.g. /api/v1/files/2026/07/02/xx.png */
  url: string;
  /**
   * OpenGraph wrapper page for the same drawing — this is what goes into
   * the WhatsApp message so the chat renders a photo preview card.
   */
  shareUrl: string;
};

/**
 * Uploads the 3D drawing (PNG data-URL) so the WhatsApp message can link to
 * it — wa.me links can't attach images directly. Returns the public URL.
 */
export async function uploadSnapshot(imageDataUrl: string): Promise<SnapshotResponse> {
  const response = await api.post<ApiResponse<SnapshotResponse>>('/configurator/snapshot', {
    imageDataUrl,
  });
  return unwrap(response);
}

async function fetchPrice(req: PriceRequest): Promise<PriceBreakdown> {
  const response = await api.post<ApiResponse<PriceBreakdown>>('/configurator/price', req);
  return unwrap(response);
}

export function useConfiguratorPrice(req: PriceRequest | null) {
  return useQuery({
    queryKey: configuratorKeys.price(req),
    queryFn: () => fetchPrice(req!),
    enabled: SHOW_PUBLIC_PRICES && Boolean(req?.productTypeId && req?.materialId),
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
