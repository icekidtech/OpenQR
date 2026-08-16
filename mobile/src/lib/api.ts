import { storage } from '@/lib/storage';
import type {
  AuthResponse,
  Batch,
  CreateBatchInput,
  CreateBatchResponse,
  CreateQRCodeInput,
  QRCode,
  UpdateQRCodeInput,
  User,
} from '@/lib/types';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  /** allow the request to attempt a token refresh once on 401 */
  retry?: boolean;
};

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Try to rotate the access token using the stored refresh token.
 * Deduplicates concurrent refresh attempts.
 */
export async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = await storage.getRefreshToken();
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as AuthResponse;
      await storage.setAccessToken(data.accessToken);
      await storage.setRefreshToken(data.refreshToken);
      await storage.setUser(data.user);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, retry = true } = options;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await storage.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && retry) {
    const ok = await refreshSession();
    if (ok) {
      return request<T>(path, { ...options, retry: false });
    }
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Exchange an OAuth identity token (Google or Apple) for an OpenQR session. */
export async function exchangeAuthToken(
  provider: 'google' | 'apple',
  payload: { idToken?: string; identityToken?: string; fullName?: { givenName?: string; familyName?: string } },
): Promise<AuthResponse> {
  const path = provider === 'google' ? '/v1/auth/google' : '/v1/auth/apple';
  const body =
    provider === 'google'
      ? { idToken: payload.idToken }
      : { identityToken: payload.identityToken, fullName: payload.fullName };
  return request<AuthResponse>(path, {
    method: 'POST',
    auth: false,
    retry: false,
    body,
  });
}

export const api = {
  me: () => request<User>('/v1/me'),
  listQRCodes: (batchId?: string) =>
    request<QRCode[]>(`/v1/qrcodes${batchId ? `?batchId=${encodeURIComponent(batchId)}` : ''}`),
  createQRCode: (input: CreateQRCodeInput) =>
    request<QRCode>('/v1/qrcodes', { method: 'POST', body: input }),
  getQRCode: (id: string) => request<QRCode>(`/v1/qrcodes/${id}`),
  updateQRCode: (id: string, input: UpdateQRCodeInput) =>
    request<QRCode>(`/v1/qrcodes/${id}`, { method: 'PATCH', body: input }),
  deleteQRCode: (id: string) => request<void>(`/v1/qrcodes/${id}`, { method: 'DELETE' }),

  listBatches: () => request<Batch[]>('/v1/batches'),
  createBatch: (input: CreateBatchInput) =>
    request<CreateBatchResponse>('/v1/batches', { method: 'POST', body: input }),
  deleteBatch: (id: string) => request<void>(`/v1/batches/${id}`, { method: 'DELETE' }),
};
