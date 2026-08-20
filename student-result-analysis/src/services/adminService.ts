import { api } from "./api";

export interface AddStudentPayload {
  usn: string;
  name: string;
  email: string;
  department: string;
  semester: number;
  password: string;
}

export interface AddStudentResponse {
  student_id: number;
  usn: string;
  name: string;
  email: string;
  department: string;
  semester: number | null;
  role: "student";
}

export interface ImportStudentPreview {
  usn: string;
  name: string;
  grand_total: number;
  average_marks: number;
  sgpa: number;
  cgpa: number;
}

export interface ImportUploadResponse {
  students_upserted: number;
  subjects_upserted: number;
  marks_upserted: number;
  results_upserted: number;
  department: string;
  semester: number;
  academic_year: string | null;
  sheet_name: string;
  students: ImportStudentPreview[];
}

export const adminService = {
  getDashboardStats: () => api.get("/admin/stats").then((r) => r.data),
  addStudent: (data: AddStudentPayload) =>
    api.post<AddStudentResponse>("/admin/students", data).then((r) => r.data),
  uploadExcel: (file: File, onProgress?: (percent: number) => void) => {
    const form = new FormData();
    form.append("file", file);
    return api
      .post<ImportUploadResponse>("/admin/upload", form, {
        onUploadProgress: (event) => {
          if (!onProgress || !event.total) return;
          onProgress(Math.round((event.loaded / event.total) * 100));
        },
      })
      .then((r) => r.data);
  },
  getResults: (params?: Record<string, unknown>) => api.get("/admin/results", { params }).then((r) => r.data),
  deleteResult: (id: string) => api.delete(`/admin/results/${id}`).then((r) => r.data),
  getToppers: () => api.get("/admin/toppers").then((r) => r.data),
};
