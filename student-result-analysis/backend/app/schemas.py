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
