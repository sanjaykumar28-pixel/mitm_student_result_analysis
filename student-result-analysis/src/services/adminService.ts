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

export interface AddSubjectPayload {
  subject_name: string;
  subject_code: string;
  credit: number;
  semester: number;
  department: string;
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

export interface AdminResultRow {
  result_id: number;
  usn: string;
  student_name: string;
  department: string;
  semester: number;
  academic_year: string | null;
  grand_total: number;
  average_marks: number;
  credits_earned: number | null;
  grade: string | null;
  sgpa: number | null;
  cgpa: number | null;
}

export interface AdminResultsResponse {
  department: string | null;
  semester: number | null;
  total: number;
  departments: string[];
  results: AdminResultRow[];
}

export interface AdminTopperRow {
  usn: string;
  name: string;
  department: string;
  semester: number;
  cgpa: number;
}

export interface AdminToppersResponse {
  toppers: AdminTopperRow[];
  department_toppers: AdminTopperRow[];
}

export const adminService = {
  getDashboardStats: () => api.get("/admin/stats").then((r) => r.data),
  addStudent: (data: AddStudentPayload) =>
    api.post<AddStudentResponse>("/admin/students", data).then((r) => r.data),
  addSubject: (data: AddSubjectPayload) =>
    // REQUIRED FROM BACKEND: POST /admin/subjects endpoint
    api.post("/admin/subjects", data).then((r) => r.data),
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
  getResults: (params?: { department?: string; semester?: number; search?: string }) =>
    api.get<AdminResultsResponse>("/admin/results", { params }).then((r) => r.data),
  deleteResult: (id: string) => api.delete(`/admin/results/${id}`).then((r) => r.data),
  getToppers: () => api.get<AdminToppersResponse>("/admin/toppers").then((r) => r.data),
};
