import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import { API_URL } from '../config';
import type { User } from '../types';

function getDeviceId(): string {
  return `${Device.modelName || 'unknown'}-${Device.osInternalBuildId || Device.osBuildId || 'unknown'}`;
}

export async function login(badgeNumber: string, pin: string): Promise<User> {
  const deviceId = getDeviceId();
  const res = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ badgeNumber, pin, deviceId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Login failed' }));
    const msg =
      typeof body.error === 'string'
        ? body.error
        : body.error?.message || 'Login failed';
    throw new Error(msg);
  }
  const data = await res.json();
  await SecureStore.setItemAsync('accessToken', data.accessToken);
  await SecureStore.setItemAsync('refreshToken', data.refreshToken);
  await SecureStore.setItemAsync('user', JSON.stringify(data.officer));
  return data.officer as User;
}

export async function logout(): Promise<void> {
  const token = await SecureStore.getItemAsync('accessToken');
  try {
    await fetch(`${API_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    /* ignore network errors during logout */
  }
  await SecureStore.deleteItemAsync('accessToken');
  await SecureStore.deleteItemAsync('refreshToken');
  await SecureStore.deleteItemAsync('user');
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync('accessToken');
}

export async function getUser(): Promise<User | null> {
  const raw = await SecureStore.getItemAsync('user');
  return raw ? JSON.parse(raw) : null;
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await SecureStore.getItemAsync('accessToken');
  return token !== null;
}

export async function refreshTokens(): Promise<boolean> {
  const refreshToken = await SecureStore.getItemAsync('refreshToken');
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    await SecureStore.setItemAsync('accessToken', data.accessToken);
    await SecureStore.setItemAsync('refreshToken', data.refreshToken);
    return true;
  } catch {
    return false;
  }
}
