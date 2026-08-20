import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  headers: { "Content-Type": "application/json" },
});

export function getApiErrorMessage(error: unknown, fallback = "Request failed"): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const first = detail.find((item) => typeof item?.msg === "string");
      if (first?.msg) return String(first.msg).replace(/^Value error,\s*/i, "");
    }
    if (error.response?.status === 401) return "Please sign in as an admin and try again.";
    if (error.code === "ERR_NETWORK") return "Cannot reach the server. Confirm the FastAPI backend is running.";
  }
  return fallback;
}

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token =
      window.localStorage.getItem("sras_token") ?? window.sessionStorage.getItem("sras_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    // Centralized error logging hook
    return Promise.reject(error);
  },
);
