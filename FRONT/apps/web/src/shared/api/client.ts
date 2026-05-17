import axios, { type AxiosError, type AxiosResponse } from 'axios';

export type ApiError = {
  code: string;
  message: string;
  field: string | null;
  // Structured context the server attaches alongside the message — used so
  // FRONT renders localized strings from these keys instead of parsing
  // Georgian text. See ADR-0002 amendment 2026-05-17.
  metadata?: Record<string, unknown> | null;
};

export type ApiResponseSuccess<T> = {
  isSuccess: true;
  value: T;
  errors: [];
};

export type ApiResponseFailure = {
  isSuccess: false;
  value: null;
  errors: ApiError[];
};

export type ApiResponse<T> = ApiResponseSuccess<T> | ApiResponseFailure;

const API_BASE = '/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  config.headers.set('X-Correlation-Id', crypto.randomUUID().replaceAll('-', ''));
  return config;
});

/**
 * Thrown when the server returns ApiResponse with isSuccess: false.
 * Carries the full error list so callers (RHF) can attach per-field messages.
 */
export class ApiResponseError extends Error {
  constructor(
    public readonly status: number,
    public readonly errors: ApiError[],
  ) {
    super(errors[0]?.message ?? 'API request failed');
    this.name = 'ApiResponseError';
  }
}

/**
 * Unwraps the canonical envelope: returns the inner `value` on success,
 * throws ApiResponseError on failure.
 */
export async function unwrap<T>(response: AxiosResponse<ApiResponse<T>>): Promise<T> {
  if (response.data.isSuccess) {
    return response.data.value;
  }
  throw new ApiResponseError(response.status, response.data.errors);
}

/**
 * For 4xx/5xx responses that still carry the envelope, axios throws — extract
 * the envelope errors here so callers get a consistent ApiResponseError.
 */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    if (error.response?.data && 'isSuccess' in error.response.data && !error.response.data.isSuccess) {
      return Promise.reject(
        new ApiResponseError(error.response.status, error.response.data.errors),
      );
    }
    return Promise.reject(error);
  },
);
