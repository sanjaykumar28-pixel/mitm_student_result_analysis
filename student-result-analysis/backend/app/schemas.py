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
