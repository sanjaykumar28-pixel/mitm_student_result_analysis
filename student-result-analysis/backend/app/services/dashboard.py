from __future__ import annotations

from collections import defaultdict
from datetime import date
import re

from sqlalchemy.orm import Session

from app.models import StudentMark
from app.schemas import (
    AdminDashboardPassPercentageResponse,
    AdminDashboardPerformanceResponse,
    AdminDashboardPerformanceSemester,
    AdminDashboardResultSummaryResponse,
)
from app.services.grading import is_subject_pass


def current_academic_year(today: date | None = None) -> str:
    """Return the current Indian academic year in the repository's YYYY-YY format."""
    current = today or date.today()
    start_year = current.year if current.month >= 6 else current.year - 1
    return f"{start_year}-{(start_year + 1) % 100:02d}"


def _normalize_academic_year(value: str | None) -> str | None:
    """Normalize stored academic-year variants such as 2024-2025 to YYYY-YY."""
    if not value:
        return None
    match = re.fullmatch(r"\s*(\d{4})\s*[-–]\s*(\d{2,4})\s*", value)
    if not match:
        return value.strip()
    return f"{match.group(1)}-{int(match.group(2)) % 100:02d}"


def _evaluated_student_semesters(
    db: Session,
    academic_year: str | None = None,
) -> dict[tuple[str, int], bool]:
    """Return one pass/fail outcome per student and semester with complete marks."""
    marks_by_key: dict[tuple[str, int], list[StudentMark]] = defaultdict(list)
    query = db.query(StudentMark)
    requested_year = _normalize_academic_year(academic_year)
    if requested_year is not None:
        query = query.filter(StudentMark.academic_year.isnot(None))

    for mark in query.all():
        if requested_year is not None and _normalize_academic_year(mark.academic_year) != requested_year:
            continue
        marks_by_key[(mark.usn, mark.semester)].append(mark)

    evaluated: dict[tuple[str, int], bool] = {}
    for key, marks in marks_by_key.items():
        outcomes = [
            is_subject_pass(
                float(mark.internal_marks) if mark.internal_marks is not None else None,
                float(mark.external_marks) if mark.external_marks is not None else None,
                float(mark.total_marks) if mark.total_marks is not None else None,
            )
            for mark in marks
        ]
        if outcomes and all(outcome is not None for outcome in outcomes):
            evaluated[key] = all(outcomes)
    return evaluated


def get_dashboard_performance(db: Session) -> AdminDashboardPerformanceResponse:
    """Build semester-wise counts from unique, fully evaluated student results."""
    evaluated = _evaluated_student_semesters(db)
    counts: dict[int, dict[str, int]] = defaultdict(lambda: {"passed": 0, "failed": 0})
    for (_, semester), passed in evaluated.items():
        counts[semester]["passed" if passed else "failed"] += 1
    return AdminDashboardPerformanceResponse(
        semesters=[
            AdminDashboardPerformanceSemester(
                semester=semester,
                passed=counts[semester]["passed"],
                failed=counts[semester]["failed"],
            )
            for semester in sorted(counts)
        ]
    )


def _latest_student_outcomes(evaluated: dict[tuple[str, int], bool]) -> list[bool]:
    """Select the latest evaluated semester so each student is counted once."""
    latest: dict[str, tuple[int, bool]] = {}
    for (usn, semester), passed in evaluated.items():
        existing = latest.get(usn)
        if existing is None or semester > existing[0]:
            latest[usn] = (semester, passed)
    return [passed for _, passed in latest.values()]


def get_dashboard_result_summary(db: Session) -> AdminDashboardResultSummaryResponse:
    """Summarize the latest evaluated semester for each student across all years."""
    outcomes = _latest_student_outcomes(_evaluated_student_semesters(db))
    total_passed = sum(outcomes)
    total_failed = len(outcomes) - total_passed
    total = len(outcomes)
    return AdminDashboardResultSummaryResponse(
        total_passed=total_passed,
        total_failed=total_failed,
        passed_percentage=round(total_passed * 100 / total, 2) if total else 0.0,
        failed_percentage=round(total_failed * 100 / total, 2) if total else 0.0,
    )


def get_dashboard_pass_percentage(db: Session) -> AdminDashboardPassPercentageResponse:
    """Calculate pass percentage from only the current academic year's evaluated students."""
    academic_year = current_academic_year()
    outcomes = _latest_student_outcomes(_evaluated_student_semesters(db, academic_year))
    passed_students = sum(outcomes)
    total = len(outcomes)
    return AdminDashboardPassPercentageResponse(
        academic_year=academic_year,
        passed_students=passed_students,
        total_evaluated_students=total,
        pass_percentage=round(passed_students * 100 / total, 2) if total else 0.0,
    )