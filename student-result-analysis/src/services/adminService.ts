import { api } from "./api";

export interface AdminProfile {
  id: string;
  email: string;
  role: "admin";
  created_at: string;
}

export interface AdminProfileUpdate {
  email: string;
}

export interface AddStudentPayload {
  usn: string;
  name: string;
  email: string;
  department: string;
  semester: number;
  gender: string;
  password: string;
}

export interface AddStudentResponse {
  student_id: number;
  usn: string;
  name: string;
  email: string;
  department: string;
  semester: number | null;
  gender: string | null;
  role: "student";
}

export interface AdminStudentRow {
  student_id: number;
  student_name: string;
  usn: string;
  email: string | null;
  department: string;
  semester: number | null;
  gender: string | null;
}

export interface BulkStudentError {
  row: number;
  usn: string | null;
  error: string;
}

export interface BulkStudentImportResponse {
  message: string;
  sheet_name: string;
  imported_count: number;
  duplicate_usns: string[];
  missing_required_columns: string[];
  invalid_rows: BulkStudentError[];
}

export interface AddSubjectPayload {
  subject_name: string;
  subject_code: string;
  credit: number;
  semester: number;
  department: string;
}

export interface AddSubjectResponse {
  subject_id: number;
  subject_name: string | null;
  subject_code: string;
  credit: number | null;
  semester: number;
  department: string | null;
}

export interface AdminSubjectRow {
  subject_id: number;
  subject_name: string | null;
  subject_code: string;
  credit: number | null;
  semester: number;
  department: string | null;
}

export interface ImportStudentPreview {
  usn: string;
  name: string;
  grand_total: number;
  average_marks: number;
  credits_registered: number;
  credits_earned: number;
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

export interface AdminDashboardPerformanceResponse {
  semesters: Array<{ semester: number; passed: number; failed: number }>;
}

export interface AdminDashboardResultSummaryResponse {
  total_passed: number;
  total_failed: number;
  passed_percentage: number;
  failed_percentage: number;
}

export interface AdminDashboardPassPercentageResponse {
  academic_year: string;
  passed_students: number;
  total_evaluated_students: number;
  pass_percentage: number;
}

export interface AdminResultSubject {
  subject_code: string;
  subject_name: string;
  credits: number | null;
  grade: string | null;
  internal_marks: number | null;
  external_marks: number | null;
  total_marks: number | null;
  grade_point: number | null;
}

export interface AdminResultSemester {
  semester: number;
  academic_year: string | null;
  total_credits: number | null;
  total_points: number;
  sgpa: number | null;
  cgpa: number | null;
  subjects: AdminResultSubject[];
}

export interface AdminResultDetailResponse {
  usn: string;
  student_name: string;
  department: string;
  semesters: AdminResultSemester[];
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

export interface AdminPerformanceSemester {
  semester: number;
  status: "PASS" | "FAIL" | "INCOMPLETE";
  failed_subject_count: number;
  sgpa: number | null;
  cgpa: number | null;
}

export interface AdminStudentPerformanceRow {
  sl_no: number | null;
  usn: string;
  student_name: string;
  department: string;
  semesters: AdminPerformanceSemester[];
  failed_subject_count: number;
}

export interface AdminStudentPerformanceResponse {
  total: number;
  departments: string[];
  students: AdminStudentPerformanceRow[];
}

export interface AdminFailedSubject {
  subject_code: string;
  subject_name: string;
  credits: number | null;
  internal_marks: number | null;
  external_marks: number | null;
  total_marks: number | null;
  grade: string | null;
  grade_point: number | null;
  fail_reason: string;
}

export interface AdminFailedSubjectSemester {
  semester: number;
  sgpa: number | null;
  cgpa: number | null;
  subjects: AdminFailedSubject[];
}

export interface AdminStudentFailedSubjectsResponse {
  usn: string;
  student_name: string;
  department: string;
  failed_subject_count: number;
  semesters: AdminFailedSubjectSemester[];
}

export const adminService = {
  getProfile: () => api.get<AdminProfile>("/admin/profile").then((r) => r.data),
  updateProfile: (data: AdminProfileUpdate) =>
    api.patch<AdminProfile>("/admin/profile", data).then((r) => r.data),
  getDashboardStats: () => api.get("/admin/stats").then((r) => r.data),
  getDashboardPerformance: () =>
    api
      .get<AdminDashboardPerformanceResponse>("/admin/dashboard/performance-overview")
      .then((r) => r.data),
  getDashboardResultSummary: () =>
    api
      .get<AdminDashboardResultSummaryResponse>("/admin/dashboard/result-summary")
      .then((r) => r.data),
  getDashboardPassPercentage: () =>
    api
      .get<AdminDashboardPassPercentageResponse>("/admin/dashboard/pass-percentage")
      .then((r) => r.data),
  addStudent: (data: AddStudentPayload) =>
    api.post<AddStudentResponse>("/admin/students", data).then((r) => r.data),
  getStudents: () => api.get<AdminStudentRow[]>("/admin/students").then((r) => r.data),
  uploadStudents: (file: File, onProgress?: (percent: number) => void) => {
    const form = new FormData();
    form.append("file", file);
    return api
      .post<BulkStudentImportResponse>("/admin/students/bulk-upload", form, {
        onUploadProgress: (event) => {
          if (!onProgress || !event.total) return;
          onProgress(Math.round((event.loaded / event.total) * 100));
        },
      })
      .then((r) => r.data);
  },
  getSubjects: () => api.get<AdminSubjectRow[]>("/admin/subjects").then((r) => r.data),
  addSubject: (data: AddSubjectPayload) =>
    api.post<AddSubjectResponse>("/admin/subjects", data).then((r) => r.data),
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
  getResultDetails: (usn: string) =>
    api
      .get<AdminResultDetailResponse>(`/admin/results/${encodeURIComponent(usn)}`)
      .then((r) => r.data),
  getStudentPerformance: (params?: { department?: string; search?: string }) =>
    api
      .get<AdminStudentPerformanceResponse>("/admin/student-performance", { params })
      .then((r) => r.data),
  getFailedSubjects: (usn: string) =>
    api
      .get<AdminStudentFailedSubjectsResponse>(
        `/admin/student-performance/${encodeURIComponent(usn)}/failed-subjects`,
      )
      .then((r) => r.data),
  deleteResult: (id: string) => api.delete(`/admin/results/${id}`).then((r) => r.data),
  getToppers: () => api.get<AdminToppersResponse>("/admin/toppers").then((r) => r.data),
};
