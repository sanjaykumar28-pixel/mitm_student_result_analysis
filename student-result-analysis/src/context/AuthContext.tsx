import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AUTH_INVALID_EVENT, getApiErrorMessage } from "@/services/api";
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
  login: (email: string, password: string, remember?: boolean) => Promise<AuthUser>;
  logout: () => void;
  updateUser: (updates: Pick<AuthUser, "email">) => void;
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

function isValidAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AuthUser>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.email === "string" &&
    (candidate.role === "admin" || candidate.role === "student")
  );
}

function readStoredAuth(): { user: AuthUser | null; token: string | null } {
  if (typeof window === "undefined") return { user: null, token: null };
  const raw = window.localStorage.getItem(USER_KEY) ?? window.sessionStorage.getItem(USER_KEY);
  const token = window.localStorage.getItem(TOKEN_KEY) ?? window.sessionStorage.getItem(TOKEN_KEY);
  if (!raw || !token) return { user: null, token: null };
  try {
    const stored = JSON.parse(raw) as unknown;
    return isValidAuthUser(stored) ? { user: stored, token } : { user: null, token: null };
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
    const handleInvalidAuth = () => {
      clearAuth();
      setUser(null);
    };
    window.addEventListener(AUTH_INVALID_EVENT, handleInvalidAuth);

    const { user: stored, token } = readStoredAuth();
    if (!stored || !token) {
      setLoading(false);
      return () => window.removeEventListener(AUTH_INVALID_EVENT, handleInvalidAuth);
    }
    setUser(stored);
    authService
      .me()
      .then((fresh) => {
        if (!isValidAuthUser(fresh)) {
          throw new Error("The authenticated account has an invalid role.");
        }
        setUser(fresh);
        const remember = Boolean(window.localStorage.getItem(TOKEN_KEY));
        persistAuth(fresh, token, remember);
      })
      .catch(() => {
        handleInvalidAuth();
      })
      .finally(() => setLoading(false));

    return () => window.removeEventListener(AUTH_INVALID_EVENT, handleInvalidAuth);
  }, []);

  const login = async (email: string, password: string, remember = true) => {
    const data: LoginResponse = await authService.login(email, password);
    if (!isValidAuthUser(data.user)) {
      throw new Error("The authenticated account has an invalid role.");
    }
    persistAuth(data.user, data.access_token, remember);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    clearAuth();
    setUser(null);
  };

  const updateUser = (updates: Pick<AuthUser, "email">) => {
    setUser((current) => {
      if (!current) return current;
      const updatedUser = { ...current, email: updates.email };
      const token = window.localStorage.getItem(TOKEN_KEY) ?? window.sessionStorage.getItem(TOKEN_KEY);
      if (token) {
        const remember = Boolean(window.localStorage.getItem(TOKEN_KEY));
        persistAuth(updatedUser, token, remember);
      }
      return updatedUser;
    });
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, logout, updateUser }}>
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
