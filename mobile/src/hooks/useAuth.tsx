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
import { registerForPushNotifications } from '../lib/notifications';

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
