import { api } from "./api";

export interface StudentSubjectMark {
  code: string;
  name: string;
  credits: number | null;
  credits_earned: number | null;
  cia: number;
  see: number;
  total: number;
  marks: number;
  grade: string | null;
  grade_point: number | null;
}

export interface StudentSemesterResult {
  semester: number;
  sgpa: number | null;
  cgpa: number | null;
  grand_total: number | null;
  average_marks: number | null;
  credits_earned: number | null;
  grade: string | null;
  subjects: StudentSubjectMark[];
}

export interface StudentDashboardResponse {
  usn: string;
  name: string;
  email: string;
  department: string | null;
  semester: number | null;
  current_sgpa: number | null;
  overall_cgpa: number | null;
  current_semester: number | null;
  academic_status: string | null;
  recent_subjects: StudentSubjectMark[];
  subject_marks: StudentSubjectMark[];
  cgpa_trend: Array<{ semester: string; cgpa: number }>;
}

export interface StudentResultsResponse {
  usn: string;
  semesters: StudentSemesterResult[];
}

export interface StudentGpaSubject {
  code: string;
  name: string;
  credits: number;
  credits_earned: number;
  cia: number;
  see: number;
  total: number;
  marks: number;
  grade: string | null;
  grade_point: number | null;
}

export interface StudentGpaSemester {
  semester: number;
  sgpa: number | null;
  credits: number;
  subjects: StudentGpaSubject[];
}

export interface StudentSgpaCgpaResponse {
  usn: string;
  current_semester: number | null;
  sgpa: number | null;
  cgpa: number | null;
  subjects: StudentGpaSubject[];
  semesters: StudentGpaSemester[];
}

export interface StudentChartPoint {
  semester: string;
  sgpa?: number | null;
  cgpa?: number | null;
  avg?: number | null;
  best?: number | null;
}

export interface StudentSubjectScore {
  subject: string;
  score: number;
}

export interface StudentAnalysisResponse {
  sgpa_trend: StudentChartPoint[];
  cgpa_trend: StudentChartPoint[];
  subject_strength: StudentSubjectScore[];
  grade_distribution: Array<{ grade: string; count: number }>;
  semester_compare: StudentChartPoint[];
  strong_subjects: StudentSubjectScore[];
  weak_subjects: StudentSubjectScore[];
}

export const studentService = {
  getDashboard: () => api.get<StudentDashboardResponse>("/student/dashboard").then((r) => r.data),
  getResults: (semester?: number) =>
    api.get<StudentResultsResponse>("/student/results", { params: { semester } }).then((r) => r.data),
  getSgpaCgpa: () => api.get<StudentSgpaCgpaResponse>("/student/sgpa-cgpa").then((r) => r.data),
  getAnalysis: () => api.get<StudentAnalysisResponse>("/student/analysis").then((r) => r.data),
};
