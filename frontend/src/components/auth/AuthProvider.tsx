"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, onAuthChange, refreshSession, setAccessToken } from "@/lib/api-client";
import type { AuthResponse, User } from "@/lib/types";

type RegisterInput = {
  email: string; password: string; fullName: string; phone?: string; accountType: "tourist" | "operator";
  companyName?: string; consent: boolean;
};
type AuthState = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (u: User) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const off = onAuthChange((a) => setUser(a?.user ?? null));
    refreshSession().finally(() => setReady(true));
    return () => {
      off();
    };
  }, []);

  const apply = useCallback((a: AuthResponse) => {
    setAccessToken(a.accessToken);
    setUser(a.user);
    return a.user;
  }, []);

  const login = useCallback(
    async (email: string, password: string) => apply(await api<AuthResponse>("/auth/login", { body: { email, password } })),
    [apply],
  );
  const register = useCallback(async (input: RegisterInput) => apply(await api<AuthResponse>("/auth/register", { body: input })), [apply]);
  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, ready, login, register, logout, setUser }), [user, ready, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth вне AuthProvider");
  return ctx;
}

/** Куда вести пользователя после входа — в свой кабинет. */
export function homeFor(user: User) {
  return user.role === "Admin" ? "/admin" : user.role === "Operator" ? "/operator" : "/account";
}
