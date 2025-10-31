"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const me = await api.get<AuthUser>("/auth/me", true);
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Cargar sesión si existe token
    const token = typeof window !== "undefined" ? localStorage.getItem("jr_token") : null;
    if (!token) {
      setLoading(false);
      return;
    }
    fetchMe();
  }, [fetchMe]);

  const signIn = useCallback(async (email: string, password: string) => {
    // Espera que el backend devuelva { token: string }
    const { token } = await api.post<{ token: string }>("/api/auth/login", { email, password });
    localStorage.setItem("jr_token", token);
    // await fetchMe();
  }, [/*fetchMe*/]);

  const signOut = useCallback(() => {
    localStorage.removeItem("jr_token");
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, signIn, signOut }), [user, loading, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}


