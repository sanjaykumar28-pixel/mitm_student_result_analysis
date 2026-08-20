from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Login, Student
from app.schemas import AddStudentRequest, AddStudentResponse
from app.security import hash_password


def create_student_with_login(db: Session, body: AddStudentRequest) -> AddStudentResponse:
    email = body.email
    usn = body.usn

    if db.query(Login).filter(Login.email == email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A login account with this email already exists",
        )
    if db.query(Login).filter(Login.usn == usn).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A login account with this USN already exists",
        )

    existing_student = db.query(Student).filter(Student.usn == usn).first()
    if existing_student and existing_student.login_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A student with this USN already exists",
        )

    try:
        login = Login(
            usn=usn,
            email=email,
            password=hash_password(body.password),
            role="student",
        )
        db.add(login)
        db.flush()

        if existing_student:
            existing_student.login_id = login.login_id
            existing_student.student_name = body.name
            existing_student.department = body.department
            existing_student.semester = body.semester
            student = existing_student
        else:
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
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="USN or email already exists",
        )

    return AddStudentResponse(
        student_id=student.student_id,
        usn=student.usn,
        name=student.student_name,
        email=login.email,
        department=student.department,
        semester=student.semester,
        role="student",
    )
