export type Grade = "O" | "A+" | "A" | "B+" | "B" | "C" | "F";

export const gradePoint: Record<Grade, number> = {
  O: 10,
  "A+": 9,
  A: 8,
  "B+": 7,
  B: 6,
  C: 5,
  F: 0,
};

export const departments = [
  "MCA",
  "Computer Science",
  "Electronics",
  "Mechanical",
  "Civil",
  "Information Technology",
];

export interface Student {
  id: string;
  name: string;
  email: string;
  department: string;
  semester: number;
  cgpa: number;
}

export interface SubjectResult {
  code: string;
  name: string;
  credits: number;
  marks: number;
  grade: Grade | "";
}

export interface SemesterResult {
  semester: number;
  sgpa: number;
  subjects: SubjectResult[];
}

export const mockStudents: Student[] = [
  { id: "STU2024001", name: "Rohan Mehta", email: "rohan@univ.edu", department: "Computer Science", semester: 5, cgpa: 9.21 },
  { id: "STU2024002", name: "Priya Iyer", email: "priya@univ.edu", department: "Electronics", semester: 5, cgpa: 9.58 },
  { id: "STU2024003", name: "Aman Verma", email: "aman@univ.edu", department: "Mechanical", semester: 3, cgpa: 8.42 },
  { id: "STU2024004", name: "Sneha Kapoor", email: "sneha@univ.edu", department: "Computer Science", semester: 7, cgpa: 9.75 },
  { id: "STU2024005", name: "Karan Joshi", email: "karan@univ.edu", department: "Civil", semester: 3, cgpa: 7.88 },
  { id: "STU2024006", name: "Neha Singh", email: "neha@univ.edu", department: "Information Technology", semester: 5, cgpa: 9.34 },
  { id: "STU2024007", name: "Vikram Rao", email: "vikram@univ.edu", department: "Computer Science", semester: 7, cgpa: 8.95 },
  { id: "STU2024008", name: "Ishita Sen", email: "ishita@univ.edu", department: "Electronics", semester: 3, cgpa: 9.12 },
  { id: "STU2024009", name: "Arjun Nair", email: "arjun@univ.edu", department: "Mechanical", semester: 5, cgpa: 8.34 },
  { id: "STU2024010", name: "Meera Pillai", email: "meera@univ.edu", department: "Information Technology", semester: 7, cgpa: 9.66 },
  { id: "STU2024011", name: "Rahul Khanna", email: "rahul@univ.edu", department: "Civil", semester: 5, cgpa: 7.45 },
  { id: "STU2024012", name: "Tanvi Desai", email: "tanvi@univ.edu", department: "Computer Science", semester: 3, cgpa: 9.05 },
];

export const adminStats = {
  totalStudents: 1284,
  totalSubjects: 86,
  passPercentage: 92.4,
  averageCGPA: 8.21,
  topPerformer: "Sneha Kapoor",
};

export const departmentPerformance = [
  { department: "CSE", avgCgpa: 8.7, pass: 96 },
  { department: "ECE", avgCgpa: 8.4, pass: 94 },
  { department: "MECH", avgCgpa: 7.9, pass: 88 },
  { department: "CIVIL", avgCgpa: 7.6, pass: 85 },
  { department: "IT", avgCgpa: 8.6, pass: 95 },
];

export const semesterPass = [
  { semester: "Sem 1", pass: 89 },
  { semester: "Sem 2", pass: 91 },
  { semester: "Sem 3", pass: 93 },
  { semester: "Sem 4", pass: 90 },
  { semester: "Sem 5", pass: 94 },
  { semester: "Sem 6", pass: 92 },
  { semester: "Sem 7", pass: 96 },
  { semester: "Sem 8", pass: 95 },
];

export const gradeDistribution = [
  { grade: "O", count: 184 },
  { grade: "A+", count: 320 },
  { grade: "A", count: 410 },
  { grade: "B+", count: 220 },
  { grade: "B", count: 96 },
  { grade: "C", count: 38 },
  { grade: "F", count: 16 },
];

export const performanceTrend = [
  { month: "Jan", cgpa: 7.8 },
  { month: "Feb", cgpa: 7.9 },
  { month: "Mar", cgpa: 8.0 },
  { month: "Apr", cgpa: 8.1 },
  { month: "May", cgpa: 8.15 },
  { month: "Jun", cgpa: 8.21 },
];

export const studentSemesterResults: SemesterResult[] = [
  {
    semester: 1,
    sgpa: 8.6,
    subjects: [
      { code: "MA101", name: "Mathematics I", credits: 4, marks: 86, grade: "A+" },
      { code: "PH101", name: "Physics", credits: 3, marks: 78, grade: "A" },
      { code: "CS101", name: "Intro to Programming", credits: 4, marks: 91, grade: "O" },
      { code: "EN101", name: "English", credits: 2, marks: 74, grade: "B+" },
      { code: "CH101", name: "Chemistry", credits: 3, marks: 70, grade: "B+" },
    ],
  },
  {
    semester: 2,
    sgpa: 8.9,
    subjects: [
      { code: "MA102", name: "Mathematics II", credits: 4, marks: 88, grade: "A+" },
      { code: "CS102", name: "Data Structures", credits: 4, marks: 94, grade: "O" },
      { code: "EE101", name: "Basic Electrical", credits: 3, marks: 76, grade: "A" },
      { code: "ME101", name: "Engg. Mechanics", credits: 3, marks: 72, grade: "B+" },
      { code: "EN102", name: "Communication", credits: 2, marks: 80, grade: "A" },
    ],
  },
  {
    semester: 3,
    sgpa: 9.1,
    subjects: [
      { code: "CS201", name: "Algorithms", credits: 4, marks: 92, grade: "O" },
      { code: "CS202", name: "Discrete Math", credits: 3, marks: 84, grade: "A+" },
      { code: "CS203", name: "Digital Logic", credits: 3, marks: 81, grade: "A+" },
      { code: "CS204", name: "OOP in Java", credits: 4, marks: 95, grade: "O" },
      { code: "HU201", name: "Economics", credits: 2, marks: 70, grade: "B+" },
    ],
  },
  {
    semester: 4,
    sgpa: 9.3,
    subjects: [
      { code: "CS301", name: "Operating Systems", credits: 4, marks: 93, grade: "O" },
      { code: "CS302", name: "DBMS", credits: 4, marks: 90, grade: "O" },
      { code: "CS303", name: "Computer Networks", credits: 3, marks: 85, grade: "A+" },
      { code: "CS304", name: "Theory of Computation", credits: 3, marks: 82, grade: "A+" },
      { code: "MA301", name: "Probability & Stats", credits: 3, marks: 79, grade: "A" },
    ],
  },
  {
    semester: 5,
    sgpa: 9.5,
    subjects: [
      { code: "CS401", name: "Software Engineering", credits: 4, marks: 94, grade: "O" },
      { code: "CS402", name: "Compiler Design", credits: 4, marks: 88, grade: "A+" },
      { code: "CS403", name: "Web Technologies", credits: 3, marks: 96, grade: "O" },
      { code: "CS404", name: "Machine Learning", credits: 4, marks: 92, grade: "O" },
      { code: "OE401", name: "Open Elective", credits: 2, marks: 80, grade: "A" },
    ],
  },
];

export const subjectStrength = [
  { subject: "Programming", score: 95 },
  { subject: "Web Tech", score: 96 },
  { subject: "ML", score: 92 },
  { subject: "Networks", score: 85 },
  { subject: "DBMS", score: 90 },
  { subject: "OS", score: 93 },
  { subject: "Compilers", score: 88 },
];

export const cgpaGrowth = [
  { semester: "S1", cgpa: 8.6 },
  { semester: "S2", cgpa: 8.75 },
  { semester: "S3", cgpa: 8.86 },
  { semester: "S4", cgpa: 9.0 },
  { semester: "S5", cgpa: 9.21 },
];
