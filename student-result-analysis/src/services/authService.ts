import { api } from "./api";
import type { AuthUser, UserRole } from "@/context/AuthContext";

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export const authService = {
  login: (email: string, password: string, role: UserRole) =>
    api.post<LoginResponse>("/auth/login", { email, password, role }).then((r) => r.data),
  logout: () => api.post("/auth/logout").then((r) => r.data),
  me: () => api.get<AuthUser>("/auth/me").then((r) => r.data),
};
