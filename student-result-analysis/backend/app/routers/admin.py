from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin
from app.models import Login
from app.schemas import AddStudentRequest, AddStudentResponse
from app.services.students import create_student_with_login

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/students", response_model=AddStudentResponse, status_code=201)
def add_student(
    body: AddStudentRequest,
    db: Session = Depends(get_db),
    _: Login = Depends(require_admin),
) -> AddStudentResponse:
    return create_student_with_login(db, body)
