from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from collections import defaultdict

from app.models import Student, StudentMark, StudentResult, Subject
from app.schemas import (
    AdminResultDetailResponse,
    AdminResultRow,
    AdminResultSemester,
    AdminResultSubject,
    AdminResultsResponse,
    AdminFailedSubject,
    AdminFailedSubjectSemester,
    AdminStudentFailedSubjectsResponse,
    AdminPerformanceSemester,
    AdminStudentPerformanceRow,
    AdminStudentPerformanceResponse,
    AdminTopperRow,
    AdminToppersResponse,
    StudentAnalysisResponse,
    StudentCgpaPoint,
    StudentChartPoint,
    StudentDashboardResponse,
    StudentGpaSemester,
    StudentGpaSubject,
    StudentGradeCount,
    StudentResultsResponse,
    StudentSemesterResult,
    StudentSgpaCgpaResponse,
    StudentSubjectMark,
    StudentSubjectScore,
)
from app.services.grading import GRADE_POINTS, fail_reasons, has_complete_marks, is_subject_pass, letter_grade


def _as_float(value) -> float | None:
    if value is None:
        return None
    return float(value)


def _performance_grade(mark: StudentMark) -> str | None:
    """Resolve a display grade without trusting an old total-only stored grade."""
    passed = is_subject_pass(
        _as_float(mark.internal_marks), _as_float(mark.external_marks), _as_float(mark.total_marks)
    )
    if passed is False:
        return "F"
    if passed is True:
        return letter_grade(_as_float(mark.total_marks) or 0)
    return None


def list_admin_student_performance(
    db: Session, *, department: str | None, search: str | None
) -> AdminStudentPerformanceResponse:
    departments = [
        row[0] for row in db.query(Student.department).distinct().order_by(Student.department.asc()).all() if row[0]
    ]
    query = db.query(Student)
    if department:
        query = query.filter(func.lower(Student.department) == department.lower())
    if search:
        like = f"%{search.lower()}%"
        query = query.filter(or_(func.lower(Student.usn).like(like), func.lower(Student.student_name).like(like)))
    students = query.order_by(Student.slno.asc(), Student.student_name.asc(), Student.usn.asc()).all()
    if not students:
        return AdminStudentPerformanceResponse(total=0, departments=departments, students=[])

    usns = [student.usn for student in students]
    marks_by_student_semester: dict[tuple[str, int], list[StudentMark]] = defaultdict(list)
    for mark in db.query(StudentMark).filter(StudentMark.usn.in_(usns)).all():
        marks_by_student_semester[(mark.usn, mark.semester)].append(mark)
    results_by_student_semester = {
        (result.usn, result.semester): result
        for result in db.query(StudentResult).filter(StudentResult.usn.in_(usns)).all()
    }

    rows: list[AdminStudentPerformanceRow] = []
    for student in students:
        semesters = sorted({sem for usn, sem in marks_by_student_semester if usn == student.usn} | {
            sem for usn, sem in results_by_student_semester if usn == student.usn
        })
        performance_semesters: list[AdminPerformanceSemester] = []
        failed_total = 0
        for semester in semesters:
            marks = marks_by_student_semester.get((student.usn, semester), [])
            result = results_by_student_semester.get((student.usn, semester))
            failures = sum(
                is_subject_pass(_as_float(mark.internal_marks), _as_float(mark.external_marks), _as_float(mark.total_marks)) is False
                for mark in marks
            )
            complete = bool(marks) and all(
                has_complete_marks(_as_float(mark.internal_marks), _as_float(mark.external_marks), _as_float(mark.total_marks))
                for mark in marks
            )
            status = "FAIL" if failures else "PASS" if complete else "INCOMPLETE"
            failed_total += failures
            performance_semesters.append(AdminPerformanceSemester(
                semester=semester, status=status, failed_subject_count=failures,
                sgpa=_as_float(result.sgpa) if result else None,
                cgpa=_as_float(result.cgpa) if result else None,
            ))
        rows.append(AdminStudentPerformanceRow(
            sl_no=student.slno, usn=student.usn, student_name=student.student_name,
            department=student.department, semesters=performance_semesters,
            failed_subject_count=failed_total,
        ))
    return AdminStudentPerformanceResponse(total=len(rows), departments=departments, students=rows)


def get_admin_failed_subjects(db: Session, *, usn: str) -> AdminStudentFailedSubjectsResponse:
    student = db.query(Student).filter(Student.usn == usn).first()
    if student is None:
        raise ValueError("Student not found")
    results = {result.semester: result for result in db.query(StudentResult).filter(StudentResult.usn == usn).all()}
    grouped: dict[int, list[AdminFailedSubject]] = defaultdict(list)
    marks = (
        db.query(StudentMark, Subject)
        .outerjoin(Subject, Subject.subject_code == StudentMark.subject_code)
        .filter(StudentMark.usn == usn)
        .order_by(StudentMark.semester.asc(), StudentMark.subject_code.asc())
        .all()
    )
    for mark, subject in marks:
        reasons = fail_reasons(_as_float(mark.internal_marks), _as_float(mark.external_marks), _as_float(mark.total_marks))
        if not reasons:
            continue
        grade = _performance_grade(mark)
        grouped[mark.semester].append(AdminFailedSubject(
            subject_code=mark.subject_code,
            subject_name=(subject.subject_name if subject else None) or mark.subject_code,
            credits=subject.credits if subject else None,
            internal_marks=_as_float(mark.internal_marks), external_marks=_as_float(mark.external_marks),
            total_marks=_as_float(mark.total_marks), grade=grade,
            grade_point=GRADE_POINTS.get(grade) if grade else None,
            fail_reason="Multiple criteria failed" if len(reasons) > 1 else reasons[0],
        ))
    semesters = [AdminFailedSubjectSemester(
        semester=semester, sgpa=_as_float(results[semester].sgpa) if semester in results else None,
        cgpa=_as_float(results[semester].cgpa) if semester in results else None, subjects=subjects,
    ) for semester, subjects in sorted(grouped.items())]
    return AdminStudentFailedSubjectsResponse(
        usn=student.usn, student_name=student.student_name, department=student.department,
        failed_subject_count=sum(len(subjects) for subjects in grouped.values()), semesters=semesters,
    )


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


def get_admin_result_details(
    db: Session,
    *,
    usn: str,
    semester: int | None = None,
) -> AdminResultDetailResponse:
    student = db.query(Student).filter(Student.usn == usn).first()
    if student is None:
        raise ValueError("Student not found")

    results_query = db.query(StudentResult).filter(StudentResult.usn == usn)
    if semester is not None:
        results_query = results_query.filter(StudentResult.semester == semester)
    result_rows = results_query.order_by(StudentResult.semester.asc()).all()

    marks_query = (
        db.query(StudentMark, Subject)
        .join(Subject, Subject.subject_code == StudentMark.subject_code)
        .filter(StudentMark.usn == usn)
    )
    if semester is not None:
        marks_query = marks_query.filter(StudentMark.semester == semester)
    marks = marks_query.order_by(StudentMark.semester.asc(), StudentMark.subject_code.asc()).all()

    marks_by_semester: dict[int, list[AdminResultSubject]] = defaultdict(list)
    for mark, subject in marks:
        grade = _resolved_grade(mark)
        marks_by_semester[mark.semester].append(
            AdminResultSubject(
                subject_code=subject.subject_code,
                subject_name=subject.subject_name or subject.subject_code,
                credits=subject.credits,
                grade=grade,
                internal_marks=_as_float(mark.internal_marks),
                external_marks=_as_float(mark.external_marks),
                total_marks=_as_float(mark.total_marks),
                grade_point=GRADE_POINTS.get(grade) if grade else None,
            )
        )

    result_by_semester = {row.semester: row for row in result_rows}
    semesters = sorted(set(result_by_semester) | set(marks_by_semester))
    detail_semesters: list[AdminResultSemester] = []
    for current_semester in semesters:
        result = result_by_semester.get(current_semester)
        subjects = marks_by_semester.get(current_semester, [])
        total_points = round(
            sum(
                (subject.credits or 0) * (subject.grade_point or 0)
                for subject in subjects
            ),
            2,
        )
        total_credits = result.credits_earned if result else sum(
            subject.credits or 0
            for subject in subjects
            if subject.grade != "F"
        )
        detail_semesters.append(
            AdminResultSemester(
                semester=current_semester,
                academic_year=result.academic_year if result else None,
                total_credits=total_credits,
                total_points=total_points,
                sgpa=_as_float(result.sgpa) if result else None,
                cgpa=_as_float(result.cgpa) if result else None,
                subjects=subjects,
            )
        )

    return AdminResultDetailResponse(
        usn=student.usn,
        student_name=student.student_name,
        department=student.department,
        semesters=detail_semesters,
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


def _subject_mark(mark: StudentMark, subject: Subject | None) -> StudentSubjectMark:
    name = None
    credits = None
    if subject is not None:
        name = subject.subject_name
        credits = subject.credits
    return StudentSubjectMark(
        code=mark.subject_code,
        name=name or mark.subject_code,
        credits=credits,
        marks=_as_float(mark.total_marks),
        internal_marks=_as_float(mark.internal_marks),
        external_marks=_as_float(mark.external_marks),
        total_marks=_as_float(mark.total_marks),
        grade=mark.grade,
    )


def _marks_by_semester(db: Session, usn: str) -> dict[int, list[StudentSubjectMark]]:
    rows = (
        db.query(StudentMark, Subject)
        .outerjoin(Subject, Subject.subject_code == StudentMark.subject_code)
        .filter(StudentMark.usn == usn)
        .order_by(StudentMark.semester.asc(), StudentMark.subject_code.asc())
        .all()
    )
    grouped: dict[int, list[StudentSubjectMark]] = {}
    for mark, subject in rows:
        grouped.setdefault(mark.semester, []).append(_subject_mark(mark, subject))
    return grouped


def list_student_results(db: Session, *, usn: str, semester: int | None = None) -> StudentResultsResponse:
    query = db.query(StudentResult).filter(StudentResult.usn == usn)
    if semester is not None:
        query = query.filter(StudentResult.semester == semester)
    result_rows = query.order_by(StudentResult.semester.asc()).all()
    marks_map = _marks_by_semester(db, usn)

    semesters: list[StudentSemesterResult] = []
    seen = set()
    for result in result_rows:
        seen.add(result.semester)
        semesters.append(
            StudentSemesterResult(
                semester=result.semester,
                sgpa=_as_float(result.sgpa),
                cgpa=_as_float(result.cgpa),
                grand_total=_as_float(result.grand_total),
                average_marks=_as_float(result.average_marks),
                credits_earned=result.credits_earned,
                grade=result.grade,
                subjects=marks_map.get(result.semester, []),
            )
        )
    if semester is None:
        for sem, subjects in marks_map.items():
            if sem in seen:
                continue
            semesters.append(
                StudentSemesterResult(
                    semester=sem,
                    subjects=subjects,
                )
            )
        semesters.sort(key=lambda row: row.semester)
    elif not semesters:
        subjects = marks_map.get(semester, [])
        if subjects:
            semesters.append(StudentSemesterResult(semester=semester, subjects=subjects))

    return StudentResultsResponse(usn=usn, semesters=semesters)


def get_student_dashboard(db: Session, *, usn: str, email: str) -> StudentDashboardResponse:
    student = db.query(Student).filter(Student.usn == usn).first()
    payload = list_student_results(db, usn=usn)
    latest = payload.semesters[-1] if payload.semesters else None
    recent = latest.subjects if latest else []
    cgpa_trend = [
        StudentCgpaPoint(semester=f"S{row.semester}", cgpa=row.cgpa)
        for row in payload.semesters
        if row.cgpa is not None
    ]
    return StudentDashboardResponse(
        usn=usn,
        name=student.student_name if student else usn,
        email=email,
        department=student.department if student else None,
        semester=student.semester if student else (latest.semester if latest else None),
        current_sgpa=latest.sgpa if latest else None,
        overall_cgpa=latest.cgpa if latest else None,
        current_semester=latest.semester if latest else None,
        academic_status=latest.grade if latest else None,
        recent_subjects=recent,
        subject_marks=recent,
        cgpa_trend=cgpa_trend,
    )


def _resolved_credits(mark: StudentMark, subject: Subject | None) -> int:
    if subject is not None and subject.credits:
        return int(subject.credits)
    return 0


def _resolved_grade(mark: StudentMark) -> str | None:
    if mark.grade:
        return mark.grade
    total = _as_float(mark.total_marks)
    if total is None:
        return None
    return letter_grade(total)


def _computed_gpa_semesters(db: Session, usn: str) -> list[StudentGpaSemester]:
    rows = (
        db.query(StudentMark, Subject)
        .outerjoin(Subject, Subject.subject_code == StudentMark.subject_code)
        .filter(StudentMark.usn == usn)
        .order_by(StudentMark.semester.asc(), StudentMark.subject_code.asc())
        .all()
    )
    grouped: dict[int, list[StudentGpaSubject]] = defaultdict(list)
    for mark, subject in rows:
        grade = _resolved_grade(mark)
        credits = _resolved_credits(mark, subject)
        name = None
        if subject is not None:
            name = subject.subject_name
        grouped[mark.semester].append(
            StudentGpaSubject(
                code=mark.subject_code,
                name=name or mark.subject_code,
                credits=credits,
                marks=_as_float(mark.total_marks) or 0,
                grade=grade,
                grade_point=GRADE_POINTS.get(grade) if grade else None,
            )
        )

    semesters: list[StudentGpaSemester] = []
    for semester in sorted(grouped):
        subjects = grouped[semester]
        registered = sum(item.credits for item in subjects)
        earned = 0
        points = 0.0
        for item in subjects:
            if item.grade_point is None:
                continue
            points += item.credits * item.grade_point
            if item.grade != "F":
                earned += item.credits
        sgpa = round(points / registered, 2) if registered else None
        semesters.append(
            StudentGpaSemester(
                semester=semester,
                sgpa=sgpa,
                credits=registered,
                credits_earned=earned,
                subjects=subjects,
            )
        )
    return semesters


def _overall_cgpa(semesters: list[StudentGpaSemester]) -> float | None:
    total_points = 0.0
    total_credits = 0
    for semester in semesters:
        for subject in semester.subjects:
            if subject.grade_point is None or subject.credits <= 0:
                continue
            total_points += subject.credits * subject.grade_point
            total_credits += subject.credits
    return round(total_points / total_credits, 2) if total_credits else None


def get_student_sgpa_cgpa(db: Session, *, usn: str) -> StudentSgpaCgpaResponse:
    semesters = _computed_gpa_semesters(db, usn)
    latest = semesters[-1] if semesters else None
    return StudentSgpaCgpaResponse(
        usn=usn,
        current_semester=latest.semester if latest else None,
        sgpa=latest.sgpa if latest else None,
        cgpa=_overall_cgpa(semesters),
        subjects=latest.subjects if latest else [],
        semesters=semesters,
    )


def get_student_analysis(db: Session, *, usn: str) -> StudentAnalysisResponse:
    semesters = _computed_gpa_semesters(db, usn)
    running = 0.0
    running_credits = 0
    sgpa_trend: list[StudentChartPoint] = []
    cgpa_trend: list[StudentChartPoint] = []
    semester_compare: list[StudentChartPoint] = []
    subject_strength: list[StudentSubjectScore] = []
    grade_counts: dict[str, int] = defaultdict(int)

    for row in semesters:
        if row.sgpa is not None:
            sgpa_trend.append(StudentChartPoint(semester=f"S{row.semester}", sgpa=row.sgpa))
        if row.sgpa is not None and row.credits > 0:
            running += row.sgpa * row.credits
            running_credits += row.credits
            cgpa_trend.append(
                StudentChartPoint(semester=f"S{row.semester}", cgpa=round(running / running_credits, 2))
            )
        marks = [item.marks for item in row.subjects]
        if marks:
            semester_compare.append(
                StudentChartPoint(
                    semester=f"Sem {row.semester}",
                    avg=round(sum(marks) / len(marks), 2),
                    best=max(marks),
                )
            )
        for item in row.subjects:
            label = item.name if len(semesters) == 1 else f"{item.name} (S{row.semester})"
            subject_strength.append(StudentSubjectScore(subject=label, score=item.marks))
            if item.grade:
                grade_counts[item.grade] += 1

    ordered_grades = ["O", "A+", "A", "B+", "B", "C", "F"]
    grade_distribution = [
        StudentGradeCount(grade=grade, count=grade_counts[grade])
        for grade in ordered_grades
        if grade_counts.get(grade)
    ]
    for grade, count in grade_counts.items():
        if grade not in ordered_grades:
            grade_distribution.append(StudentGradeCount(grade=grade, count=count))

    ranked = sorted(subject_strength, key=lambda item: item.score, reverse=True)
    strong = ranked[:3]
    weak = sorted(subject_strength, key=lambda item: item.score)[:3]

    return StudentAnalysisResponse(
        sgpa_trend=sgpa_trend,
        cgpa_trend=cgpa_trend,
        subject_strength=subject_strength,
        grade_distribution=grade_distribution,
        semester_compare=semester_compare,
        strong_subjects=strong,
        weak_subjects=weak,
    )
