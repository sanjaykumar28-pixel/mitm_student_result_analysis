from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import Student, StudentResult
from app.schemas import AdminResultRow, AdminResultsResponse


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
    if department:
        query = query.filter(Student.department == department)
    if semester is not None:
        query = query.filter(StudentResult.semester == semester)
    if search:
        like = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Student.usn.ilike(like),
                Student.student_name.ilike(like),
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
        department=department,
        semester=semester,
        total=len(results),
        departments=departments,
        results=results,
    )
