import { getToken, refreshTokens } from './auth';
import { getCached, setCache } from './cache';
import { API_URL } from '../config';
import NetInfo from '@react-native-community/netinfo';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { cacheKey?: string },
): Promise<T> {
  const { cacheKey, ...fetchOptions } = options || {};
  const netState = await NetInfo.fetch();
  const isOnline = netState.isConnected;

  // Offline READ: serve from cache
  if (!isOnline && (!fetchOptions.method || fetchOptions.method === 'GET')) {
    if (cacheKey) {
      const cached = await getCached<T>(cacheKey);
      if (cached) return cached;
    }
    throw new ApiError(0, 'Offline — no cached data available');
  }

  if (!isOnline) {
    throw new ApiError(0, 'Offline — cannot perform write operation');
  }

  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(fetchOptions.headers as Record<string, string>),
    },
  });

  // Auto-refresh on 401
  if (res.status === 401) {
    const refreshed = await refreshTokens();
    if (refreshed) return apiFetch(path, options);
    throw new ApiError(401, 'Session expired');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const msg =
      typeof body.error === 'string'
        ? body.error
        : body.error?.message || 'Request failed';
    throw new ApiError(res.status, msg);
  }

  const json = await res.json();

  // Unwrap { data: [...] } wrapper from backend list endpoints
  const result =
    json &&
    typeof json === 'object' &&
    'data' in json &&
    Array.isArray((json as Record<string, unknown>).data) &&
    Object.keys(json as Record<string, unknown>).length === 1
      ? ((json as Record<string, unknown>).data as T)
      : (json as T);

  // Cache GET responses
  if (cacheKey && (!fetchOptions.method || fetchOptions.method === 'GET')) {
    await setCache(cacheKey, result);
  }

  return result;
}
