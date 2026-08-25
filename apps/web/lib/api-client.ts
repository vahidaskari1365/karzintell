'use client';

import { useAuthStore } from './auth-store';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiResult<T> {
  data: T;
  meta?: { page: number; limit: number; total: number } & Record<string, unknown>;
}

const BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

let refreshPromise: Promise<string | null> | null = null;

/** تازه‌سازی توکن با کوکی refresh — single-flight */
export function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) {
          useAuthStore.getState().clearAuth();
          return null;
        }
        const json = await res.json();
        const token: string = json?.data?.accessToken ?? null;
        if (token) useAuthStore.getState().setAuth(token, json.data.user);
        return token;
      })
      .catch(() => null)
      .finally(() => {
        setTimeout(() => (refreshPromise = null), 0);
      });
  }
  return refreshPromise;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean; // default true — اگر false توکن ارسال نمی‌شود (عمومی)
  idempotencyKey?: string;
  headers?: Record<string, string>;
  retryOn401?: boolean;
}

export async function api<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  const { method = 'GET', body, auth = true, idempotencyKey, headers = {}, retryOn401 = true } = options;

  const run = async (token?: string) => {
    const h: Record<string, string> = { ...headers };
    if (body !== undefined) h['Content-Type'] = 'application/json';
    if (token) h['Authorization'] = `Bearer ${token}`;
    if (idempotencyKey) h['Idempotency-Key'] = idempotencyKey;
    return fetch(`${BASE}${path}`, {
      method,
      headers: h,
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
      credentials: 'include',
    });
  };

  let token = auth ? useAuthStore.getState().accessToken : undefined;
  let res = await run(token ?? undefined);

  if (res.status === 401 && auth && retryOn401) {
    const newToken = await refreshAccessToken();
    if (newToken) res = await run(newToken);
  }

  const json = await res.json().catch(() => null);
  if (!res.ok || json?.success === false) {
    const err = json?.error || {};
    throw new ApiError(
      err.code || `HTTP_${res.status}`,
      err.message || 'خطا در ارتباط با سرور',
      res.status,
      err.details,
    );
  }
  return { data: json?.data as T, meta: json?.meta };
}

export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params))
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const newIdempotencyKey = () => crypto.randomUUID();
