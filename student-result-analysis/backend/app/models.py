from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    Computed,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Login(Base):
    __tablename__ = "Login"

    login_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    usn: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True)
    email: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(Enum("admin", "student"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    student: Mapped["Student | None"] = relationship(back_populates="login")


class Student(Base):
    __tablename__ = "Students"

    student_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    login_id: Mapped[int | None] = mapped_column(
        ForeignKey("Login.login_id", ondelete="SET NULL", onupdate="CASCADE"),
        unique=True,
        nullable=True,
    )
    slno: Mapped[int | None] = mapped_column(Integer, nullable=True)
    usn: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    student_name: Mapped[str] = mapped_column(String(100), nullable=False)
    department: Mapped[str] = mapped_column(String(80), nullable=False, default="MCA")
    semester: Mapped[int | None] = mapped_column(Integer, nullable=True)
    section: Mapped[str | None] = mapped_column(String(10), nullable=True)

    login: Mapped[Login | None] = relationship(back_populates="student")
    marks: Mapped[list["StudentMark"]] = relationship(back_populates="student")
    results: Mapped[list["StudentResult"]] = relationship(back_populates="student")


class Subject(Base):
    __tablename__ = "Subjects"

    subject_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    subject_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    subject_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    credits: Mapped[int | None] = mapped_column(Integer, nullable=True)
    semester: Mapped[int] = mapped_column(Integer, nullable=False)


class StudentMark(Base):
    __tablename__ = "Student_Marks"
    __table_args__ = (
        UniqueConstraint("usn", "subject_code", "semester", name="uq_marks_student_subject_sem"),
        CheckConstraint("internal_marks >= 0 AND internal_marks <= 100", name="chk_marks_ia"),
        CheckConstraint("external_marks >= 0 AND external_marks <= 100", name="chk_marks_ext"),
    )

    marks_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    usn: Mapped[str] = mapped_column(
        ForeignKey("Students.usn", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )
    subject_code: Mapped[str] = mapped_column(
        ForeignKey("Subjects.subject_code", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
    )
    semester: Mapped[int] = mapped_column(Integer, nullable=False)
    academic_year: Mapped[str | None] = mapped_column(String(16), nullable=True)
    internal_marks: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    external_marks: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    total_marks: Mapped[float | None] = mapped_column(
        Numeric(5, 2),
        Computed("internal_marks + external_marks", persisted=True),
    )
    grade: Mapped[str | None] = mapped_column(String(4), nullable=True)

    student: Mapped[Student] = relationship(back_populates="marks")


class StudentResult(Base):
    __tablename__ = "Student_Result"
    __table_args__ = (
        UniqueConstraint("usn", "semester", name="uq_result_student_sem"),
    )

    result_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    usn: Mapped[str] = mapped_column(
        ForeignKey("Students.usn", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )
    semester: Mapped[int] = mapped_column(Integer, nullable=False)
    academic_year: Mapped[str | None] = mapped_column(String(16), nullable=True)
    grand_total: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    average_marks: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    credits_earned: Mapped[int | None] = mapped_column(Integer, nullable=True)
    grade: Mapped[str | None] = mapped_column(String(4), nullable=True)
    sgpa: Mapped[float | None] = mapped_column(Numeric(4, 2), nullable=True)
    cgpa: Mapped[float | None] = mapped_column(Numeric(4, 2), nullable=True)

    student: Mapped[Student] = relationship(back_populates="results")
