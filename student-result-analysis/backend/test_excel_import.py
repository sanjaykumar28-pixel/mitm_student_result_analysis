import sys
from pathlib import Path

from sqlalchemy import create_engine, func
from sqlalchemy.orm import Session

sys.path.insert(0, str(Path(__file__).parent))

from app.database import Base
from app.models import Student, StudentMark, StudentResult, Subject
from app.services.excel_parser import ParsedMark, ParsedStudent, ParsedWorkbook, SubjectColumns
from app.services.import_results import ImportValidationError, persist_parsed_workbook


def make_workbook(name: str = "AALIYA TABASUM") -> ParsedWorkbook:
    return ParsedWorkbook(
        sheet_name="Data Entry",
        department="MCA",
        semester=1,
        academic_year="2024-25",
        subjects=[
            SubjectColumns("M24MCA101", 3, 4, 5),
            SubjectColumns("M24MCAL106", 6, 7, 8),
        ],
        students=[
            ParsedStudent(
                row=7,
                slno=1,
                usn="4MH24MC001",
                name=name,
                marks=[
                    ParsedMark("M24MCA101", 45, 40, 85),
                    ParsedMark("M24MCAL106", 46, 46, 92),
                ],
            )
        ],
    )


def test_import_maps_marks_and_reupload_is_idempotent():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        db.add_all([
            Subject(subject_code="M24MCA101", semester=1, department="MCA", credits=4),
            Subject(subject_code="M24MCAL106", semester=1, department="MCA", credits=2),
        ])
        db.commit()
        first = persist_parsed_workbook(db, make_workbook())
        second = persist_parsed_workbook(db, make_workbook())

        marks = db.query(StudentMark).order_by(StudentMark.subject_code).all()
        assert [(mark.subject_code, float(mark.internal_marks), float(mark.external_marks)) for mark in marks] == [
            ("M24MCA101", 45, 40),
            ("M24MCAL106", 46, 46),
        ]
        assert db.query(Student).count() == 1
        assert db.query(Subject).count() == 2
        assert db.query(StudentMark).count() == 2
        assert db.query(StudentResult).count() == 1
        assert db.query(StudentResult).one().grand_total == 177
        assert first.students[0].credits_registered == 6
        assert first.students[0].credits_earned == 6
        assert first.marks_upserted == second.marks_upserted == 2


def test_import_rejects_missing_subjects_before_writes():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        db.add(Subject(subject_code="M24MCA101", semester=1, department="MCA", credits=4))
        db.commit()

        try:
            persist_parsed_workbook(db, make_workbook())
        except ImportValidationError as exc:
            assert [item.subject for item in exc.payload] == ["M24MCAL106"]
            assert "not configured for MCA Semester 1" in exc.message
        else:
            raise AssertionError("Expected missing subject validation error")

        assert db.query(Student).count() == 0
        assert db.query(Subject).count() == 1
        assert db.query(StudentMark).count() == 0
        assert db.query(StudentResult).count() == 0


def test_import_rejects_name_mismatch_before_mutating_data():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        db.add_all([
            Subject(subject_code="M24MCA101", semester=1, department="MCA", credits=4),
            Subject(subject_code="M24MCAL106", semester=1, department="MCA", credits=2),
        ])
        db.add(Student(usn="4MH24MC001", student_name="ORIGINAL NAME", department="MCA", semester=1))
        db.commit()

        try:
            persist_parsed_workbook(db, make_workbook())
        except ImportValidationError as exc:
            assert "does not match existing record" in exc.message
        else:
            raise AssertionError("Expected an identity validation error")

        assert db.query(Subject).count() == 0
        assert db.query(StudentMark).count() == 0
        assert db.query(StudentResult).count() == 0


def test_subject_metadata_mismatch_is_rejected():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        db.add(Subject(subject_code="M24MCA101", semester=8, department="OLD", credits=4))
        db.commit()

        try:
            persist_parsed_workbook(db, make_workbook())
        except ImportValidationError as exc:
            assert any(item.subject == "M24MCA101" for item in exc.payload)
        else:
            raise AssertionError("Expected subject metadata validation error")

        subject = db.query(Subject).filter(Subject.subject_code == "M24MCA101").one()
        assert subject.semester == 8
        assert subject.department == "OLD"
        assert db.query(func.count(Subject.subject_id)).scalar() == 1
