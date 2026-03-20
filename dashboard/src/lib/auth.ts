import type { User } from '../types';

const API_URL = import.meta.env.VITE_API_URL;

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  officer: User;
}

export async function login(
  badgeNumber: string,
  pin: string,
  deviceId?: string,
): Promise<User> {
  const res = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ badgeNumber, pin, ...(deviceId ? { deviceId } : {}) }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || 'Login failed');
  }

  const data: LoginResponse = await res.json();
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  localStorage.setItem('user', JSON.stringify(data.officer));
  return data.officer;
}

export async function logout(): Promise<void> {
  const token = localStorage.getItem('accessToken');
  try {
    await fetch(`${API_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    // Logout request may fail if token is already expired — that's fine
  }
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

export function getUser(): User | null {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return localStorage.getItem('accessToken') !== null;
}
