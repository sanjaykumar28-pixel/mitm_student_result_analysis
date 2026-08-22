from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Subject
from app.schemas import AddSubjectRequest, AddSubjectResponse


def create_subject(db: Session, body: AddSubjectRequest) -> AddSubjectResponse:
    """Insert a new subject row; raise 409 if subject_code already exists."""
    if db.query(Subject).filter(Subject.subject_code == body.subject_code).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A subject with code '{body.subject_code}' already exists",
        )

    subject = Subject(
        subject_name=body.subject_name,
        subject_code=body.subject_code,
        credits=body.credit,
        semester=body.semester,
        department=body.department,
    )
    try:
        db.add(subject)
        db.commit()
        db.refresh(subject)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Subject code already exists",
        )

    return AddSubjectResponse(
        subject_id=subject.subject_id,
        subject_name=subject.subject_name,
        subject_code=subject.subject_code,
        credit=subject.credits,
        semester=subject.semester,
        department=subject.department,
    )
