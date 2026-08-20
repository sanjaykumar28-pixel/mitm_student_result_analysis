from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models import Student, StudentResult
from app.schemas import AdminResultRow, AdminResultsResponse, AdminTopperRow, AdminToppersResponse


def _as_float(value) -> float | None:
    if value is None:
        return None
    return float(value)


def list_admin_results(
    db: Session,
    *,
    department: str | None,
    semester: int | None,
    search: str | None,
) -> AdminResultsResponse:
    departments = [
        row[0]
        for row in db.query(Student.department)
        .distinct()
        .order_by(Student.department.asc())
        .all()
        if row[0]
    ]

    query = (
        db.query(StudentResult, Student)
        .join(Student, Student.usn == StudentResult.usn)
    )
    dept = department.strip() if department else None
    if dept:
        query = query.filter(func.lower(Student.department) == dept.lower())
    if semester is not None:
        query = query.filter(StudentResult.semester == semester)
    if search:
        like = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(Student.usn).like(like),
                func.lower(Student.student_name).like(like),
            )
        )

    rows = query.order_by(Student.department.asc(), StudentResult.semester.asc(), Student.usn.asc()).all()
    results = [
        AdminResultRow(
            result_id=result.result_id,
            usn=student.usn,
            student_name=student.student_name,
            department=student.department,
            semester=result.semester,
            academic_year=result.academic_year,
            grand_total=_as_float(result.grand_total) or 0,
            average_marks=_as_float(result.average_marks) or 0,
            credits_earned=result.credits_earned,
            grade=result.grade,
            sgpa=_as_float(result.sgpa),
            cgpa=_as_float(result.cgpa),
        )
        for result, student in rows
    ]
    return AdminResultsResponse(
        department=dept,
        semester=semester,
        total=len(results),
        departments=departments,
        results=results,
    )


def list_admin_toppers(db: Session) -> AdminToppersResponse:
    rows = (
        db.query(StudentResult, Student)
        .join(Student, Student.usn == StudentResult.usn)
        .filter(StudentResult.cgpa.isnot(None))
        .order_by(StudentResult.cgpa.desc(), StudentResult.semester.desc(), Student.usn.asc())
        .all()
    )
    seen_usn: set[str] = set()
    seen_dept: set[str] = set()
    toppers: list[AdminTopperRow] = []
    department_toppers: list[AdminTopperRow] = []
    for result, student in rows:
        if student.usn in seen_usn:
            continue
        seen_usn.add(student.usn)
        cgpa = _as_float(result.cgpa)
        if cgpa is None:
            continue
        row = AdminTopperRow(
            usn=student.usn,
            name=student.student_name,
            department=student.department,
            semester=result.semester,
            cgpa=cgpa,
        )
        if len(toppers) < 10:
            toppers.append(row)
        if student.department not in seen_dept:
            seen_dept.add(student.department)
            department_toppers.append(row)
    return AdminToppersResponse(toppers=toppers, department_toppers=department_toppers)
