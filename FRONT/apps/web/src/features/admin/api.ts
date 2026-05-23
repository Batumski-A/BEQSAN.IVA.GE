import axios, { type AxiosInstance } from 'axios';

const TOKEN_KEY = 'beqsan.admin.token';
const USER_KEY = 'beqsan.admin.user';

// VITE_API_BASE is shared with the public client (which expects /api/v1 in it).
// Admin call sites use full /api/v1/* paths, so strip the suffix here to avoid
// doubling — `https://iva.ge:5299/api/v1` + `/api/v1/admin/...` would 404.
const RAW_BASE = (import.meta.env.VITE_API_BASE ?? 'http://localhost:5000').toString();
const API_BASE = RAW_BASE.replace(/\/api\/v\d+\/?$/, '');

export const getAdminToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setAdminToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);
export const clearAdminToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getAdminUser = (): string | null => localStorage.getItem(USER_KEY);
export const setAdminUser = (user: string): void => localStorage.setItem(USER_KEY, user);

/**
 * Dedicated axios instance for admin calls. Separate from the public web
 * client so the X-Admin-Token interceptor never accidentally leaks to a
 * public catalog request.
 */
export const adminApi: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

adminApi.interceptors.request.use((config) => {
  const token = getAdminToken();
  // Only attach the token to /admin/* routes (login is also under /admin/
  // but the server explicitly bypasses the middleware for it, so attaching
  // a stale token doesn't hurt).
  if (token && config.url?.includes('/admin/')) {
    config.headers['X-Admin-Token'] = token;
  }
  return config;
});

/**
 * Auto-logout helper — registered as a one-time response interceptor by
 * `<AdminGate>`. When the server returns 401 on a token'd request we
 * assume the token is stale and bounce the user back to /adminpanel/login.
 */
let onUnauthorized: (() => void) | null = null;

export const setOnUnauthorized = (cb: (() => void) | null): void => {
  onUnauthorized = cb;
};

adminApi.interceptors.response.use(
  (resp) => resp,
  (error) => {
    const status = error?.response?.status;
    const url = (error?.config?.url ?? '') as string;
    // Don't bounce on a failed LOGIN call — the form needs to surface the
    // "invalid credentials" message itself.
    const isLoginCall = url.includes('/admin/auth/login');
    if (status === 401 && !isLoginCall && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(error);
  },
);

export type ApiError = {
  code: string;
  message: string;
  field?: string;
  metadata?: Record<string, unknown>;
};

export type ApiResponse<T> = {
  isSuccess: boolean;
  value: T | null;
  errors: ApiError[];
};

export const unwrap = <T>(resp: ApiResponse<T>): T => {
  if (!resp.isSuccess || resp.value === null) {
    throw new Error(resp.errors[0]?.message ?? 'Unknown error');
  }
  return resp.value;
};

export type LoginResponse = {
  token: string;
  username: string;
  displayName: string;
  isOwner: boolean;
};

export type SetupStatus = {
  hasOwner: boolean;
};

export async function getSetupStatus(): Promise<SetupStatus> {
  const { data } = await adminApi.get<ApiResponse<SetupStatus>>(
    '/api/v1/admin/auth/setup-status',
  );
  return unwrap(data);
}

export async function setupOwner(
  username: string,
  password: string,
  displayName: string,
): Promise<LoginResponse> {
  const { data } = await adminApi.post<ApiResponse<LoginResponse>>(
    '/api/v1/admin/auth/setup',
    { username, password, displayName },
  );
  return unwrap(data);
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const { data } = await adminApi.post<ApiResponse<LoginResponse>>(
    '/api/v1/admin/auth/login',
    { username, password },
  );
  return unwrap(data);
}

// =============================================================================
// Orders
// =============================================================================

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'InProduction'
  | 'Ready'
  | 'Delivered'
  | 'Cancelled';

export type OrderListItem = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  totalPriceMinor: number;
  currency: string;
  status: OrderStatus;
  createdAtUtc: string;
};

export type OrderListResponse = {
  items: OrderListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type OrderDetail = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerAddress: string | null;
  notes: string | null;
  configuration: Record<string, unknown>;
  totalPriceMinor: number;
  currency: string;
  status: OrderStatus;
  statusHistory: Array<{ status: OrderStatus; changedAtUtc: string; note: string | null }>;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export async function listOrders(opts: {
  status?: OrderStatus | null;
  page?: number;
  pageSize?: number;
}): Promise<OrderListResponse> {
  const params: Record<string, string> = {};
  if (opts.status) params.status = opts.status;
  if (opts.page) params.page = String(opts.page);
  if (opts.pageSize) params.pageSize = String(opts.pageSize);
  const { data } = await adminApi.get<ApiResponse<OrderListResponse>>(
    '/api/v1/admin/orders',
    { params },
  );
  return unwrap(data);
}

export async function getOrder(id: string): Promise<OrderDetail> {
  const { data } = await adminApi.get<ApiResponse<OrderDetail>>(
    `/api/v1/admin/orders/${id}`,
  );
  return unwrap(data);
}

export async function changeOrderStatus(
  id: string,
  status: OrderStatus,
  note?: string,
): Promise<{ status: OrderStatus; updatedAtUtc: string }> {
  const { data } = await adminApi.patch<ApiResponse<{ status: OrderStatus; updatedAtUtc: string }>>(
    `/api/v1/admin/orders/${id}/status`,
    { status, note },
  );
  return unwrap(data);
}

// =============================================================================
// Catalog (inline edit + activate toggle)
// =============================================================================

export async function updateMaterial(
  id: string,
  patch: { basePricePerSqmMinor?: number; isActive?: boolean },
): Promise<{ id: string; basePricePerSqmMinor: number; isActive: boolean }> {
  const { data } = await adminApi.patch<
    ApiResponse<{ id: string; basePricePerSqmMinor: number; isActive: boolean }>
  >(`/api/v1/admin/catalog/materials/${id}`, patch);
  return unwrap(data);
}

// =============================================================================
// Reports
// =============================================================================

export type ReportsOverview = {
  totalOrders: number;
  byStatus: Record<OrderStatus, number>;
  revenueDeliveredMinor: number;
  revenuePipelineMinor: number;
  last7Days: number;
  last30Days: number;
  conversionPercent: number;
  generatedAtUtc: string;
};

export async function getReportsOverview(): Promise<ReportsOverview> {
  const { data } = await adminApi.get<ApiResponse<ReportsOverview>>(
    '/api/v1/admin/reports/overview',
  );
  return unwrap(data);
}

// =============================================================================
// Warranties
// =============================================================================

export type WarrantyStatus = 'Active' | 'Expired' | 'Claimed' | 'Resolved';

export type WarrantyListItem = {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  durationMonths: number;
  startDateUtc: string;
  endDateUtc: string;
  status: WarrantyStatus;
};

export async function listWarranties(opts: { status?: WarrantyStatus | null } = {}): Promise<{
  items: WarrantyListItem[];
  total: number;
}> {
  const params: Record<string, string> = { page: '1', pageSize: '100' };
  if (opts.status) params.status = opts.status;
  const { data } = await adminApi.get<
    ApiResponse<{ items: WarrantyListItem[]; total: number; page: number; pageSize: number }>
  >('/api/v1/admin/warranties', { params });
  return unwrap(data);
}

export async function changeWarrantyStatus(
  id: string,
  status: WarrantyStatus,
  notes?: string,
): Promise<{ status: WarrantyStatus; notes: string | null }> {
  const { data } = await adminApi.patch<
    ApiResponse<{ status: WarrantyStatus; notes: string | null }>
  >(`/api/v1/admin/warranties/${id}/status`, { status, notes });
  return unwrap(data);
}

// =============================================================================
// Gallery
// =============================================================================

export type GalleryItem = {
  id: string;
  title: string;
  caption: string | null;
  imageUrl: string;
  category: string | null;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  createdAtUtc: string;
};

export async function listGallery(): Promise<GalleryItem[]> {
  const { data } = await adminApi.get<ApiResponse<GalleryItem[]>>('/api/v1/admin/gallery');
  return unwrap(data);
}

export async function updateGalleryItem(
  id: string,
  patch: Partial<Pick<GalleryItem, 'title' | 'caption' | 'category' | 'isActive' | 'isFeatured' | 'sortOrder'>>,
): Promise<{ id: string }> {
  const { data } = await adminApi.patch<ApiResponse<{ id: string }>>(
    `/api/v1/admin/gallery/${id}`,
    patch,
  );
  return unwrap(data);
}

// Legacy compatibility: the social/api.ts file expects `api` and `unwrap`
// re-exports under the same names. Keep aliases so the copied files build.
export { adminApi as api };
