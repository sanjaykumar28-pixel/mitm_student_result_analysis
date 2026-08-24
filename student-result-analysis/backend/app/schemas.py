from pydantic import BaseModel, EmailStr, Field, field_validator

from typing import Literal

Role = Literal["admin", "student"]


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=64)
    role: Role

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).lower()


class AuthUser(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: Role
    usn: str | None = None
    department: str | None = None
    semester: int | None = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUser


class AddStudentRequest(BaseModel):
    usn: str = Field(min_length=3, max_length=20)
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    department: str = Field(min_length=1, max_length=80)
    semester: int = Field(ge=1, le=8)
    password: str = Field(min_length=6, max_length=64)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).lower()

    @field_validator("usn")
    @classmethod
    def normalize_usn(cls, value: str) -> str:
        return value.strip().upper()

    @field_validator("name", "department")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()


class AddStudentResponse(BaseModel):
    student_id: int
    usn: str
    name: str
    email: EmailStr
    department: str
    semester: int | None
    role: Role = "student"


class AddSubjectRequest(BaseModel):
    subject_name: str = Field(min_length=2, max_length=100)
    subject_code: str = Field(min_length=2, max_length=20)
    credit: int = Field(ge=1, le=10)
    semester: int = Field(ge=1, le=8)
    department: str = Field(min_length=1, max_length=80)

    @field_validator("subject_name", "subject_code", "department")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("subject_code")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        return value.strip().upper()


class AddSubjectResponse(BaseModel):
    subject_id: int
    subject_name: str | None
    subject_code: str
    credit: int | None
    semester: int
    department: str | None


class ImportErrorItemSchema(BaseModel):
    row: int
    usn: str | None = None
    subject: str | None = None
    error: str


class ImportStudentPreview(BaseModel):
    usn: str
    name: str
    grand_total: float
    average_marks: float
    credits_registered: int
    credits_earned: int
    sgpa: float
    cgpa: float


class ImportUploadResponse(BaseModel):
    students_upserted: int
    subjects_upserted: int
    marks_upserted: int
    results_upserted: int
    department: str
    semester: int
    academic_year: str | None = None
    sheet_name: str
    students: list[ImportStudentPreview]
    errors: list[ImportErrorItemSchema] = []


class AdminResultRow(BaseModel):
    result_id: int
    usn: str
    student_name: str
    department: str
    semester: int
    academic_year: str | None = None
    grand_total: float
    average_marks: float
    credits_earned: int | None = None
    grade: str | None = None
    sgpa: float | None = None
    cgpa: float | None = None


class AdminResultsResponse(BaseModel):
    department: str | None = None
    semester: int | None = None
    total: int
    departments: list[str]
    results: list[AdminResultRow]


class AdminTopperRow(BaseModel):
    usn: str
    name: str
    department: str
    semester: int
    cgpa: float


class AdminToppersResponse(BaseModel):
    toppers: list[AdminTopperRow]
    department_toppers: list[AdminTopperRow]


class StudentSubjectMark(BaseModel):
    code: str
    name: str
    credits: int | None = None
    marks: float | None = None
    internal_marks: float | None = None
    external_marks: float | None = None
    total_marks: float | None = None
    grade: str | None = None


class StudentSemesterResult(BaseModel):
    semester: int
    sgpa: float | None = None
    cgpa: float | None = None
    grand_total: float | None = None
    average_marks: float | None = None
    credits_earned: int | None = None
    grade: str | None = None
    subjects: list[StudentSubjectMark]


class StudentCgpaPoint(BaseModel):
    semester: str
    cgpa: float


class StudentDashboardResponse(BaseModel):
    usn: str
    name: str
    email: EmailStr
    department: str | None = None
    semester: int | None = None
    current_sgpa: float | None = None
    overall_cgpa: float | None = None
    current_semester: int | None = None
    academic_status: str | None = None
    recent_subjects: list[StudentSubjectMark]
    subject_marks: list[StudentSubjectMark]
    cgpa_trend: list[StudentCgpaPoint]


class StudentResultsResponse(BaseModel):
    usn: str
    semesters: list[StudentSemesterResult]


class StudentGpaSubject(BaseModel):
    code: str
    name: str
    credits: int
    marks: float
    grade: str | None = None
    grade_point: int | None = None


class StudentGpaSemester(BaseModel):
    semester: int
    sgpa: float | None = None
    credits: int
    credits_earned: int = 0
    subjects: list[StudentGpaSubject]


class StudentSgpaCgpaResponse(BaseModel):
    usn: str
    current_semester: int | None = None
    sgpa: float | None = None
    cgpa: float | None = None
    subjects: list[StudentGpaSubject]
    semesters: list[StudentGpaSemester]


class StudentChartPoint(BaseModel):
    semester: str
    sgpa: float | None = None
    cgpa: float | None = None
    avg: float | None = None
    best: float | None = None


class StudentSubjectScore(BaseModel):
    subject: str
    score: float


class StudentGradeCount(BaseModel):
    grade: str
    count: int


class StudentAnalysisResponse(BaseModel):
    sgpa_trend: list[StudentChartPoint]
    cgpa_trend: list[StudentChartPoint]
    subject_strength: list[StudentSubjectScore]
    grade_distribution: list[StudentGradeCount]
    semester_compare: list[StudentChartPoint]
    strong_subjects: list[StudentSubjectScore]
    weak_subjects: list[StudentSubjectScore]
