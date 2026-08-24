from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import Student, StudentMark, StudentResult, Subject
from app.schemas import ImportErrorItemSchema, ImportStudentPreview, ImportUploadResponse
from app.services.excel_parser import ImportErrorItem, ParsedWorkbook
from app.services.grading import subject_result


def _error_payload(errors: list[ImportErrorItem]) -> list[ImportErrorItemSchema]:
    return [
        ImportErrorItemSchema(row=e.row, usn=e.usn, subject=e.subject, error=e.error)
        for e in errors
    ]


class ImportValidationError(Exception):
    def __init__(self, message: str, errors: list[ImportErrorItem]):
        super().__init__(message)
        self.message = message
        self.errors = errors
        self.payload = _error_payload(errors)


def persist_parsed_workbook(db: Session, parsed: ParsedWorkbook) -> ImportUploadResponse:
    if parsed.errors:
        raise ImportValidationError(
            "Import rejected because one or more rows are invalid",
            parsed.errors,
        )

    semester = parsed.semester
    department = parsed.department
    academic_year = parsed.academic_year
    students_upserted = 0
    marks_upserted = 0
    results_upserted = 0
    preview: list[ImportStudentPreview] = []

    try:
        subject_errors: list[ImportErrorItem] = []
        subject_by_code: dict[str, Subject] = {}
        for subject_col in parsed.subjects:
            subject = db.query(Subject).filter(Subject.subject_code == subject_col.code).first()
            if subject is None:
                message = (
                    f"Upload failed: Subject {subject_col.code} is not available in the "
                    f"Subjects table for {department} Semester {semester}."
                )
            elif subject.department is None or subject.department.strip().casefold() != department.strip().casefold():
                message = (
                    f"Subject {subject_col.code} belongs to department {subject.department}, "
                    f"not {department}."
                )
            elif subject.semester != semester:
                message = (
                    f"Subject {subject_col.code} is configured for Semester {subject.semester}, "
                    f"not Semester {semester}."
                )
            elif subject.credits is None or int(subject.credits) <= 0:
                message = f"Subject {subject_col.code} has no valid credits configured."
            else:
                subject_by_code[subject_col.code] = subject
                continue

            subject_errors.append(
                ImportErrorItem(row=1, usn=None, subject=subject_col.code, error=message)
            )

        if subject_errors:
            raise ImportValidationError(
                f"Upload failed. The following subjects are not configured for {department} Semester {semester}",
                subject_errors,
            )

        identity_errors: list[ImportErrorItem] = []
        for row in parsed.students:
            existing_student = db.query(Student).filter(Student.usn == row.usn).first()
            if existing_student and existing_student.student_name.strip().casefold() != row.name.strip().casefold():
                identity_errors.append(
                    ImportErrorItem(
                        row.row,
                        row.usn,
                        None,
                        f"Student name does not match existing record '{existing_student.student_name}'",
                    )
                )
        if identity_errors:
            raise ImportValidationError("Import rejected because student identity checks failed", identity_errors)

        credit_by_code = {code: int(subject.credits) for code, subject in subject_by_code.items()}

        for row in parsed.students:
            student = db.query(Student).filter(Student.usn == row.usn).first()
            if student is None:
                student = Student(
                    usn=row.usn,
                    student_name=row.name,
                    department=department,
                    semester=semester,
                    slno=row.slno,
                )
                db.add(student)
            else:
                student.department = department
                student.semester = semester
                if row.slno is not None:
                    student.slno = row.slno
            students_upserted += 1
            db.flush()

            weighted_points = 0.0
            registered_credits = 0
            earned_credits = 0
            grand_total = 0.0

            for mark in row.marks:
                credits = credit_by_code[mark.subject_code]
                grade, earned, points = subject_result(mark.total_marks, credits)
                grand_total += mark.total_marks
                registered_credits += credits
                earned_credits += earned
                weighted_points += points

                existing = (
                    db.query(StudentMark)
                    .filter(
                        StudentMark.usn == row.usn,
                        StudentMark.subject_code == mark.subject_code,
                        StudentMark.semester == semester,
                    )
                    .first()
                )
                if existing is None:
                    db.add(
                        StudentMark(
                            usn=row.usn,
                            subject_code=mark.subject_code,
                            semester=semester,
                            academic_year=academic_year,
                            internal_marks=mark.internal_marks,
                            external_marks=mark.external_marks,
                            grade=grade,
                        )
                    )
                else:
                    existing.internal_marks = mark.internal_marks
                    existing.external_marks = mark.external_marks
                    existing.academic_year = academic_year
                    existing.grade = grade
                marks_upserted += 1

            average = round(grand_total / len(row.marks), 2) if row.marks else 0.0
            sgpa = round(weighted_points / registered_credits, 2) if registered_credits else 0.0
            overall_grade, _, _ = subject_result(average, 4)
            result = (
                db.query(StudentResult)
                .filter(StudentResult.usn == row.usn, StudentResult.semester == semester)
                .first()
            )
            if result is None:
                result = StudentResult(usn=row.usn, semester=semester)
                db.add(result)
            result.academic_year = academic_year
            result.grand_total = round(grand_total, 2)
            result.average_marks = average
            result.credits_earned = earned_credits
            result.grade = overall_grade
            result.sgpa = sgpa
            results_upserted += 1
            db.flush()

            cgpa = _recompute_cgpa(db, row.usn)
            result.cgpa = cgpa
            preview.append(
                ImportStudentPreview(
                    usn=row.usn,
                    name=row.name,
                    grand_total=round(grand_total, 2),
                    average_marks=average,
                    credits_registered=registered_credits,
                    credits_earned=earned_credits,
                    sgpa=sgpa,
                    cgpa=cgpa,
                )
            )

        db.commit()
    except Exception:
        db.rollback()
        raise

    return ImportUploadResponse(
        students_upserted=students_upserted,
        subjects_upserted=0,
        marks_upserted=marks_upserted,
        results_upserted=results_upserted,
        department=department,
        semester=semester,
        academic_year=academic_year,
        sheet_name=parsed.sheet_name,
        students=preview,
        errors=[],
    )


def _registered_credits(db: Session, usn: str, semester: int) -> int:
    marks = db.query(StudentMark).filter(
        StudentMark.usn == usn,
        StudentMark.semester == semester,
    ).all()
    total = 0
    for mark in marks:
        subject = db.query(Subject).filter(Subject.subject_code == mark.subject_code).first()
        if subject and subject.credits:
            total += int(subject.credits)
    return total


def _recompute_cgpa(db: Session, usn: str) -> float:
    rows = (
        db.query(StudentResult)
        .filter(StudentResult.usn == usn)
        .order_by(StudentResult.semester.asc())
        .all()
    )
    weighted = 0.0
    credits = 0
    latest = 0.0
    for row in rows:
        if row.sgpa is None:
            continue
        sem_credits = _registered_credits(db, usn, row.semester)
        if sem_credits <= 0:
            continue
        weighted += float(row.sgpa) * sem_credits
        credits += sem_credits
        latest = round(weighted / credits, 2)
        row.cgpa = latest
    return latest
