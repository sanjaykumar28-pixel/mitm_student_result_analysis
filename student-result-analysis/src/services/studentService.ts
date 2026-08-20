import { api } from "./api";

export const studentService = {
  getDashboard: () => api.get("/student/dashboard").then((r) => r.data),
  getResults: (semester?: number) => api.get("/student/results", { params: { semester } }).then((r) => r.data),
  getAnalysis: () => api.get("/student/analysis").then((r) => r.data),
};
