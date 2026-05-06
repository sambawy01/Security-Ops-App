import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import * as authLib from '../lib/auth';
import { apiFetch } from '../lib/api';
import { registerForPushNotifications } from '../lib/notifications';

const HEARTBEAT_INTERVAL_MS = 60_000;

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (badge: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authLib.getUser().then((u) => {
      if (u) setUser(u);
      setLoading(false);
    });
  }, []);

  // Send a presence heartbeat every 60s while logged in. Failures are silent —
  // network drops shouldn't surface to the user; the auth onRequest hook also
  // updates lastSeenAt on every other authenticated call as a backup signal.
  useEffect(() => {
    if (!user) return;
    const ping = () => {
      apiFetch('/api/v1/officers/heartbeat', { method: 'POST' }).catch(() => {});
    };
    ping();
    const id = setInterval(ping, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [user]);

  const login = useCallback(async (badge: string, pin: string) => {
    const u = await authLib.login(badge, pin);
    setUser(u);
    // Fire and forget push notification registration
    registerForPushNotifications().catch(() => {});
  }, []);

  const logout = useCallback(async () => {
    await authLib.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, login, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
