from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session
import logging

from app.database import get_db
from app.deps import require_admin
from app.models import Login
from app.schemas import (
    AddStudentRequest,
    AddStudentResponse,
    AdminResultsResponse,
    AdminToppersResponse,
    ImportUploadResponse,
)
from app.services.excel_parser import parse_result_workbook
from app.services.import_results import ImportValidationError, persist_parsed_workbook
from app.services.results import list_admin_results, list_admin_toppers
from app.services.students import create_student_with_login

router = APIRouter(prefix="/admin", tags=["admin"])
logger = logging.getLogger(__name__)


@router.post("/students", response_model=AddStudentResponse, status_code=201)
def add_student(
    body: AddStudentRequest,
    db: Session = Depends(get_db),
    _: Login = Depends(require_admin),
) -> AddStudentResponse:
    return create_student_with_login(db, body)


@router.get("/results", response_model=AdminResultsResponse)
def get_admin_results(
    department: str | None = Query(None, max_length=80),
    semester: int | None = Query(None, ge=1, le=8),
    search: str | None = Query(None, max_length=100),
    db: Session = Depends(get_db),
    _: Login = Depends(require_admin),
) -> AdminResultsResponse:
    dept = department.strip() if department and department.strip() else None
    if dept and dept.lower() == "all":
        dept = None
    q = search.strip() if search and search.strip() else None
    return list_admin_results(db, department=dept, semester=semester, search=q)


@router.get("/toppers", response_model=AdminToppersResponse)
def get_admin_toppers(
    db: Session = Depends(get_db),
    _: Login = Depends(require_admin),
) -> AdminToppersResponse:
    return list_admin_toppers(db)


@router.post("/upload", response_model=ImportUploadResponse)
async def upload_results_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: Login = Depends(require_admin),
) -> ImportUploadResponse:
    filename = file.filename or "upload.xlsx"
    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "The uploaded file is empty", "errors": []},
        )
    try:
        parsed = parse_result_workbook(content, filename)
        return persist_parsed_workbook(db, parsed)
    except ValueError as exc:
        logger.warning("Excel import rejected: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": str(exc), "errors": []},
        ) from exc
    except ImportValidationError as exc:
        logger.warning("Excel import row errors: %s", exc.message)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": exc.message,
                "errors": [item.model_dump() for item in exc.payload],
            },
        ) from exc
