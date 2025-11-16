"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "@/lib/api";

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type LoginResponse = {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

function parseJwt(token: string): any {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
  return JSON.parse(jsonPayload);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // 👇 IMPORTANTE: mismo valor inicial en server y cliente
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Hidratamos desde localStorage SOLO en el cliente, DESPUÉS de la hidratación
  useEffect(() => {
    try {
      const idToken = localStorage.getItem("idToken");
      if (!idToken) {
        setLoading(false);
        return;
      }

      const payload = parseJwt(idToken);
      setUser({
        id: payload.sub,
        email: payload.email ?? "",
        name:
          payload.name ??
          payload["cognito:username"] ??
          payload.username ??
          undefined,
      });
    } catch {
      // si hay basura en localStorage, limpiamos
      localStorage.removeItem("idToken");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const tokens = await api.post<LoginResponse>("/auth/login", {
        email,
        password,
      });

      localStorage.setItem("idToken", tokens.idToken);
      localStorage.setItem("accessToken", tokens.accessToken);
      localStorage.setItem("refreshToken", tokens.refreshToken);

      localStorage.setItem("jr_token", tokens.accessToken);

      const payload = parseJwt(tokens.idToken);

      setUser({
        id: payload.sub,
        email: payload.email ?? email,
        name:
          payload.name ??
          payload["cognito:username"] ??
          payload.username ??
          undefined,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem("idToken");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("jr_token"); 
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signOut }),
    [user, loading, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}



