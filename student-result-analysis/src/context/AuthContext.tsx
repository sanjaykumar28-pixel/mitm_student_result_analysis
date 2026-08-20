import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getApiErrorMessage } from "@/services/api";
import { authService, type LoginResponse } from "@/services/authService";

export type UserRole = "admin" | "student";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  usn?: string | null;
  department?: string;
  semester?: number;
  avatar?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string, role: UserRole, remember?: boolean) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const USER_KEY = "sras_auth_user";
const TOKEN_KEY = "sras_token";

function persistAuth(user: AuthUser, token: string, remember: boolean) {
  const store = remember ? window.localStorage : window.sessionStorage;
  const other = remember ? window.sessionStorage : window.localStorage;
  other.removeItem(USER_KEY);
  other.removeItem(TOKEN_KEY);
  store.setItem(USER_KEY, JSON.stringify(user));
  store.setItem(TOKEN_KEY, token);
}

function readStoredAuth(): { user: AuthUser | null; token: string | null } {
  if (typeof window === "undefined") return { user: null, token: null };
  const raw = window.localStorage.getItem(USER_KEY) ?? window.sessionStorage.getItem(USER_KEY);
  const token = window.localStorage.getItem(TOKEN_KEY) ?? window.sessionStorage.getItem(TOKEN_KEY);
  if (!raw || !token) return { user: null, token: null };
  try {
    return { user: JSON.parse(raw) as AuthUser, token };
  } catch {
    return { user: null, token: null };
  }
}

function clearAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(USER_KEY);
  window.sessionStorage.removeItem(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { user: stored, token } = readStoredAuth();
    if (!stored || !token) {
      setLoading(false);
      return;
    }
    setUser(stored);
    authService
      .me()
      .then((fresh) => {
        setUser(fresh);
        const remember = Boolean(window.localStorage.getItem(TOKEN_KEY));
        persistAuth(fresh, token, remember);
      })
      .catch(() => {
        clearAuth();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string, role: UserRole, remember = true) => {
    const data: LoginResponse = await authService.login(email, password, role);
    persistAuth(data.user, data.access_token, remember);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    clearAuth();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function getAuthErrorMessage(error: unknown): string {
  return getApiErrorMessage(error, "Unable to sign in. Please try again.");
}
