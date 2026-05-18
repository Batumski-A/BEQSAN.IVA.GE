import axios, { type AxiosInstance } from 'axios';

const TOKEN_KEY = 'beqsan.admin.token';
const API_BASE = (import.meta.env.VITE_API_BASE ?? 'http://localhost:5000') as string;

export const getAdminToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setAdminToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);
export const clearAdminToken = (): void => localStorage.removeItem(TOKEN_KEY);

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token && config.url?.includes('/admin/')) {
    config.headers['X-Admin-Token'] = token;
  }
  return config;
});

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

/** Unwrap an ApiResponse — throws first error.message on failure. */
export const unwrap = <T,>(resp: ApiResponse<T>): T => {
  if (!resp.isSuccess || resp.value === null) {
    throw new Error(resp.errors[0]?.message ?? 'Unknown error');
  }
  return resp.value;
};
