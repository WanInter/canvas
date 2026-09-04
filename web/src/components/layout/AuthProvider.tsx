'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clearStoredToken, getStoredToken, setStoredToken } from '@/lib/api/client';
import { login as loginRequest, logout as logoutRequest, me as meRequest, register as registerRequest, type AuthUser } from '@/lib/api/auth';

type AuthContextValue = Readonly<{
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, verificationCode: string, inviteCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}>;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const nextUser = await meRequest();
      setUser(nextUser);
    } catch {
      clearStoredToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setReady(true);
      return;
    }
    void refreshUser().finally(() => setReady(true));
  }, [refreshUser]);

  useEffect(() => {
    const handleAuthExpired = () => {
      clearStoredToken();
      setUser(null);
      setReady(true);
    };
    window.addEventListener('aics:auth-expired', handleAuthExpired);
    return () => window.removeEventListener('aics:auth-expired', handleAuthExpired);
  }, []);

  const login = async (email: string, password: string) => {
    const session = await loginRequest(email, password);
    setStoredToken(session.access_token);
    setUser(session.user);
  };

  const register = async (name: string, email: string, password: string, verificationCode: string, inviteCode?: string) => {
    const session = await registerRequest(name, email, password, verificationCode, inviteCode);
    setStoredToken(session.access_token);
    setUser(session.user);
  };

  const logout = async () => {
    try {
      await logoutRequest();
    } finally {
      clearStoredToken();
      setUser(null);
    }
  };

  const value = useMemo(() => ({ user, ready, login, register, logout, refresh: refreshUser }), [user, ready, refreshUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
