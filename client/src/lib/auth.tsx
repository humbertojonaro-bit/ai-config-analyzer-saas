import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { apiRequest, setSessionToken, getSessionToken, queryClient } from "./queryClient";
import type { AuthUser } from "./api-types";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  signup: (email: string, password: string) => Promise<AuthUser>;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  // Always start "not loading" — we don't persist tokens, so on first mount the user is signed out.
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If a token already exists in memory (e.g. after hot reload), try to fetch /me.
    if (getSessionToken()) {
      setLoading(true);
      apiRequest("GET", "/api/auth/me")
        .then((r) => r.json())
        .then((d) => setUser(d.user))
        .catch(() => setSessionToken(null))
        .finally(() => setLoading(false));
    }
  }, []);

  const refresh = useCallback(async () => {
    const r = await apiRequest("GET", "/api/auth/me");
    const d = await r.json();
    setUser(d.user);
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    const r = await apiRequest("POST", "/api/auth/signup", { email, password });
    const d = await r.json();
    setSessionToken(d.token);
    setUser(d.user);
    queryClient.clear();
    return d.user as AuthUser;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await apiRequest("POST", "/api/auth/login", { email, password });
    const d = await r.json();
    setSessionToken(d.token);
    setUser(d.user);
    queryClient.clear();
    return d.user as AuthUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch {}
    setSessionToken(null);
    setUser(null);
    queryClient.clear();
  }, []);

  return (
    <AuthCtx.Provider value={{ user, loading, signup, login, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
