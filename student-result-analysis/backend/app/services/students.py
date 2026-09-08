from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Login, Student
from app.schemas import AddStudentRequest, AddStudentResponse
from app.security import hash_password


def _duplicate_error(field: str, message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={"code": "duplicate", "field": field, "message": message},
    )


def _raise_duplicate_conflict(db: Session, usn: str, email: str) -> None:
    if db.query(Student).filter(Student.usn == usn).first():
        raise _duplicate_error("usn", "USN already exists. Please enter a different USN.")
    if db.query(Login).filter(Login.email == email).first():
        raise _duplicate_error("email", "Email already exists. Please use a different email.")
    if db.query(Login).filter(Login.usn == usn).first():
        raise _duplicate_error("usn", "USN already exists. Please enter a different USN.")


def create_student_with_login(db: Session, body: AddStudentRequest) -> AddStudentResponse:
    email = str(body.email).lower()
    usn = body.usn.strip().upper()

    if db.query(Student).filter(Student.usn == usn).first():
        raise _duplicate_error("usn", "USN already exists. Please enter a different USN.")
    if db.query(Login).filter(Login.email == email).first():
        raise _duplicate_error("email", "Email already exists. Please use a different email.")
    if db.query(Login).filter(Login.usn == usn).first():
        raise _duplicate_error("usn", "USN already exists. Please enter a different USN.")

    try:
        login = Login(
            usn=usn,
            email=email,
            password=hash_password(body.password),
            role="student",
        )
        db.add(login)
        db.flush()

        student = Student(
            login_id=login.login_id,
            usn=usn,
            student_name=body.name,
            department=body.department,
            semester=body.semester,
        )
        db.add(student)

        db.commit()
        db.refresh(student)
        db.refresh(login)
    except IntegrityError:
        db.rollback()
        _raise_duplicate_conflict(db, usn, email)
        raise _duplicate_error("student", "Student could not be created because of a duplicate record.")

    return AddStudentResponse(
        student_id=student.student_id,
        usn=student.usn,
        name=student.student_name,
        email=login.email,
        department=student.department,
        semester=student.semester,
        role="student",
    )
