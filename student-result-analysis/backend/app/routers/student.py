from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_student, student_usn
from app.models import Login
from app.schemas import StudentAnalysisResponse, StudentDashboardResponse, StudentResultsResponse, StudentSgpaCgpaResponse
from app.services.results import (
    get_student_analysis,
    get_student_dashboard,
    get_student_sgpa_cgpa,
    list_student_results,
)

router = APIRouter(prefix="/student", tags=["student"])


@router.get("/dashboard", response_model=StudentDashboardResponse)
def student_dashboard(
    db: Session = Depends(get_db),
    login: Login = Depends(require_student),
) -> StudentDashboardResponse:
    return get_student_dashboard(db, usn=student_usn(login), email=login.email)


@router.get("/results", response_model=StudentResultsResponse)
def student_results(
    semester: int | None = Query(None, ge=1, le=8),
    db: Session = Depends(get_db),
    login: Login = Depends(require_student),
) -> StudentResultsResponse:
    return list_student_results(db, usn=student_usn(login), semester=semester)


@router.get("/sgpa-cgpa", response_model=StudentSgpaCgpaResponse)
def student_sgpa_cgpa(
    db: Session = Depends(get_db),
    login: Login = Depends(require_student),
) -> StudentSgpaCgpaResponse:
    return get_student_sgpa_cgpa(db, usn=student_usn(login))


@router.get("/analysis", response_model=StudentAnalysisResponse)
def student_analysis(
    db: Session = Depends(get_db),
    login: Login = Depends(require_student),
) -> StudentAnalysisResponse:
    return get_student_analysis(db, usn=student_usn(login))
