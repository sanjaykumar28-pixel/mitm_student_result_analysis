from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
import logging

from app.database import get_db
from app.deps import require_admin
from app.models import Login, Student
from app.schemas import (
    AddStudentRequest,
    AddStudentResponse,
    AdminStudentRow,
    AdminSubjectRow,
    BulkStudentImportResponse,
    AddSubjectRequest,
    AddSubjectResponse,
    AdminProfileResponse,
    AdminProfileUpdate,
    AdminResultsResponse,
    AdminToppersResponse,
    ImportUploadResponse,
)
from app.services.excel_parser import parse_result_workbook
from app.services.bulk_students import (
    BulkImportValidationError,
    parse_student_workbook,
    persist_bulk_students,
)
from app.services.import_results import ImportValidationError, persist_parsed_workbook
from app.services.results import list_admin_results, list_admin_toppers
from app.services.students import create_student_with_login
from app.services.subjects import create_subject, list_subjects

router = APIRouter(prefix="/admin", tags=["admin"])
logger = logging.getLogger(__name__)


def to_admin_profile(login: Login) -> AdminProfileResponse:
    return AdminProfileResponse(
        id=f"ADM{login.login_id:03d}",
        email=login.email,
        role="admin",
        created_at=login.created_at,
    )


@router.get("/profile", response_model=AdminProfileResponse)
def get_admin_profile(login: Login = Depends(require_admin)) -> AdminProfileResponse:
    return to_admin_profile(login)


@router.patch("/profile", response_model=AdminProfileResponse)
def update_admin_profile(
    body: AdminProfileUpdate,
    db: Session = Depends(get_db),
    login: Login = Depends(require_admin),
) -> AdminProfileResponse:
    login.email = body.email
    try:
        db.commit()
        db.refresh(login)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That email address is already in use.",
        ) from exc
    return to_admin_profile(login)


@router.post("/students", response_model=AddStudentResponse, status_code=201)
def add_student(
    body: AddStudentRequest,
    db: Session = Depends(get_db),
    _: Login = Depends(require_admin),
) -> AddStudentResponse:
    return create_student_with_login(db, body)


@router.get("/students", response_model=list[AdminStudentRow])
def list_students(
    db: Session = Depends(get_db),
    _: Login = Depends(require_admin),
) -> list[AdminStudentRow]:
    students = (
        db.query(Student)
        .options(joinedload(Student.login))
        .order_by(Student.student_name.asc(), Student.usn.asc())
        .all()
    )
    return [
        AdminStudentRow(
            student_id=student.student_id,
            student_name=student.student_name,
            usn=student.usn,
            email=student.login.email if student.login else None,
            department=student.department,
            semester=student.semester,
            gender=student.gender,
        )
        for student in students
    ]


@router.post("/students/bulk-upload", response_model=BulkStudentImportResponse)
async def bulk_upload_students(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: Login = Depends(require_admin),
) -> BulkStudentImportResponse:
    filename = file.filename or "upload.xlsx"
    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "The uploaded file is empty",
                "sheet_name": "",
                "imported_count": 0,
                "duplicate_usns": [],
                "missing_required_columns": [],
                "invalid_rows": [],
            },
        )
    try:
        parsed = parse_student_workbook(content, filename)
        imported_count = persist_bulk_students(db, parsed)
    except ValueError as exc:
        logger.warning("Bulk student import rejected: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": str(exc),
                "sheet_name": "",
                "imported_count": 0,
                "duplicate_usns": [],
                "missing_required_columns": [],
                "invalid_rows": [],
            },
        ) from exc
    except BulkImportValidationError as exc:
        logger.warning("Bulk student import row errors: %s", exc.message)
        parsed = exc.parsed
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": exc.message,
                "sheet_name": parsed.sheet_name,
                "imported_count": 0,
                "duplicate_usns": parsed.duplicate_usns,
                "missing_required_columns": parsed.missing_required_columns,
                "invalid_rows": [
                    {"row": item.row, "usn": item.usn, "error": item.error}
                    for item in parsed.errors
                ],
            },
        ) from exc

    return BulkStudentImportResponse(
        message=f"Imported {imported_count} students successfully",
        sheet_name=parsed.sheet_name,
        imported_count=imported_count,
    )


@router.get("/subjects", response_model=list[AdminSubjectRow])
def list_subjects_route(
    db: Session = Depends(get_db),
    _: Login = Depends(require_admin),
) -> list[AdminSubjectRow]:
    return list_subjects(db)


@router.post("/subjects", response_model=AddSubjectResponse, status_code=201)
def add_subject(
    body: AddSubjectRequest,
    db: Session = Depends(get_db),
    _: Login = Depends(require_admin),
) -> AddSubjectResponse:
    return create_subject(db, body)


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
