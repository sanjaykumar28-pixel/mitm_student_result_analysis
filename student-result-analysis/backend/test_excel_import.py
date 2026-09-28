import sys
from io import BytesIO
from pathlib import Path

from openpyxl import Workbook
from sqlalchemy import create_engine, func
from sqlalchemy.orm import Session

sys.path.insert(0, str(Path(__file__).parent))

from app.database import Base
from app.models import Student, StudentMark, StudentResult, Subject
from app.services.excel_parser import (
    ParsedMark,
    ParsedStudent,
    ParsedWorkbook,
    SubjectColumns,
    parse_result_workbook,
)
from app.services.import_results import ImportValidationError, persist_parsed_workbook
from app.services.grading import (
    fail_reasons,
    is_subject_pass,
    subject_fail_reasons,
    subject_result,
    subject_status,
)
from app.services.results import (
    get_admin_failed_subjects,
    get_admin_result_details,
    get_student_sgpa_cgpa,
    list_admin_failed_students,
    list_admin_makeup_eligible_students,
    list_admin_student_performance,
    list_student_results,
)


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


def test_component_mark_failure_rules_are_or_conditions():
    assert is_subject_pass(40, 20, 60) is False
    assert is_subject_pass(34, 30, 64) is False
    assert is_subject_pass(40, 25, 65) is True
    assert is_subject_pass(20, 20, 40) is False
    assert fail_reasons(20, 20, 40) == ["CIE below 35"]
    assert is_subject_pass(None, 25, 65) is None


def test_special_status_precedence_and_x_grade():
    assert subject_result(65, 4, internal_marks=40, external_marks=25)[0] == "B+"
    assert subject_result(45, 4, internal_marks=20, external_marks=25)[0] == "F"
    assert subject_result(None, 4, internal_status="AB", external_marks=20)[0] == "AB"
    assert subject_result(None, 4, internal_status="NE", result_status="W")[0] == "W"
    assert subject_result(54, 4, internal_marks=35, external_marks=19)[0] == "X"
    assert subject_result(None, 4, result_status="X")[0] == "X"
    assert subject_result(None, 4, result_status="X")[1] == 0
    assert subject_status(None, result_status="AB") == "INCOMPLETE"
    assert subject_status(None, result_status="W") == "INCOMPLETE"
    assert subject_status(None, result_status="NE") == "INCOMPLETE"
    assert subject_status(None, result_status="X") == "FAIL"
    assert subject_status(65, internal_marks=40, external_marks=25) == "PASS"
    assert subject_status(45, internal_marks=20, external_marks=25) == "FAIL"
    assert subject_status(None, internal_marks=40) == "INCOMPLETE"
    assert subject_fail_reasons(None, internal_marks=40) == []
    assert subject_result(60, 4, internal_marks=40, external_marks=20)[0] != "X"


def test_excel_parser_preserves_special_component_and_result_statuses():
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Data Entry"
    sheet.append(["MCA 1st SEMESTER"])
    sheet.append([
        "USN", "STUDENT NAME",
        "M24MCA101", None, None,
        "M24MCA102", None, None,
        "M24MCA103", None, None,
        "M24MCA104", None, None,
    ])
    sheet.append([None, None, "IA", "Ext", "T", "IA", "Ext", "T", "IA", "Ext", "T", "IA", "Ext", "T"])
    sheet.append([
        "4MH24MC001", "STUDENT NAME",
        "AB", 42, None,
        40, 35, "W",
        None, None, "NE",
        40, 30, "X",
    ])
    buffer = BytesIO()
    workbook.save(buffer)

    parsed = parse_result_workbook(buffer.getvalue(), "result.xlsx")
    marks = parsed.students[0].marks
    assert marks[0].internal_marks == "AB"
    assert marks[0].external_marks == 42
    assert marks[0].total_marks is None
    assert marks[1].total_marks == 75
    assert marks[1].result_status == "W"
    assert marks[2].internal_marks is None
    assert marks[2].external_marks is None
    assert marks[2].result_status == "NE"
    assert marks[3].total_marks == 70
    assert marks[3].result_status == "X"


def test_import_persists_special_marks_without_numeric_substitution():
    parsed = make_workbook()
    parsed.subjects.extend([
        SubjectColumns("M24MCA103", 9, 10, 11),
        SubjectColumns("M24MCA104", 12, 13, 14),
        SubjectColumns("M24MCA105", 15, 16, 17),
        SubjectColumns("M24MCA108", 18, 19, 20),
    ])
    parsed.students[0].marks = [
        ParsedMark("M24MCA101", "AB", 42, None),
        ParsedMark("M24MCAL106", 40, 18, 58),
        ParsedMark("M24MCA103", 40, 35, 75, result_status="W"),
        ParsedMark("M24MCA104", None, "NE", None),
        ParsedMark("M24MCA105", 40, 25, 65),
        ParsedMark("M24MCA108", 20, 25, 45),
    ]
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        db.add_all([
            Subject(subject_code="M24MCA101", semester=1, department="MCA", credits=4),
            Subject(subject_code="M24MCAL106", semester=1, department="MCA", credits=2),
            Subject(subject_code="M24MCA103", semester=1, department="MCA", credits=4),
            Subject(subject_code="M24MCA104", semester=1, department="MCA", credits=4),
            Subject(subject_code="M24MCA105", semester=1, department="MCA", credits=4),
            Subject(subject_code="M24MCA108", semester=1, department="MCA", credits=4),
        ])
        db.commit()
        persist_parsed_workbook(db, parsed)

        marks = {mark.subject_code: mark for mark in db.query(StudentMark).all()}
        assert marks["M24MCA101"].internal_marks is None
        assert marks["M24MCA101"].internal_status == "AB"
        assert marks["M24MCA101"].grade == "AB"
        assert marks["M24MCAL106"].internal_marks == 40
        assert marks["M24MCAL106"].external_marks == 18
        assert marks["M24MCAL106"].grade == "X"
        assert marks["M24MCA103"].grade == "W"
        assert marks["M24MCA104"].external_marks is None
        assert marks["M24MCA104"].external_status == "NE"
        assert marks["M24MCA104"].grade == "NE"
        assert marks["M24MCA105"].grade == "B+"
        assert marks["M24MCA108"].grade == "F"

        detail = get_admin_result_details(db, usn="4MH24MC001", semester=1)
        subjects = {subject.subject_code: subject for subject in detail.semesters[0].subjects}
        assert subjects["M24MCA101"].internal_marks == "AB"
        assert subjects["M24MCA101"].grade == "AB"
        assert subjects["M24MCA101"].status == "INCOMPLETE"
        assert subjects["M24MCAL106"].grade == "X"
        assert subjects["M24MCAL106"].status == "FAIL"
        assert subjects["M24MCA103"].grade == "W"
        assert subjects["M24MCA103"].status == "INCOMPLETE"
        assert subjects["M24MCA104"].external_marks == "NE"
        assert subjects["M24MCA104"].grade == "NE"
        assert subjects["M24MCA104"].status == "INCOMPLETE"
        assert subjects["M24MCA105"].grade == "B+"
        assert subjects["M24MCA108"].grade == "F"
        assert detail.semesters[0].total_credits == 4

        failed = get_admin_failed_subjects(db, usn="4MH24MC001")
        failed_by_code = {
            subject.subject_code: subject
            for semester in failed.semesters
            for subject in semester.subjects
        }
        assert set(failed_by_code) == {"M24MCAL106", "M24MCA108"}
        assert failed_by_code["M24MCAL106"].grade == "X"
        assert failed_by_code["M24MCAL106"].status == "FAIL"

        performance = list_admin_student_performance(db, department="MCA", search=None)
        assert performance.students[0].semesters[0].status == "FAIL"
        assert performance.students[0].semesters[0].failed_subject_count == 2

        db.add(Subject(subject_code="M24MCA201", semester=2, department="MCA", credits=3))
        db.flush()
        db.add(StudentMark(
            usn="4MH24MC001", subject_code="M24MCA201", semester=2,
            internal_marks=40, external_marks=30, grade="A",
        ))
        db.add(StudentResult(
            usn="4MH24MC001", semester=2, grand_total=70, average_marks=70,
            credits_earned=3, grade="A", sgpa=8,
        ))
        db.commit()

        student_results = list_student_results(db, usn="4MH24MC001")
        assert [semester.semester for semester in student_results.semesters] == [1, 2]
        student_subjects = {
            subject.code: subject
            for semester in student_results.semesters
            for subject in semester.subjects
        }
        assert student_subjects["M24MCA101"].grade == "AB"
        assert student_subjects["M24MCA101"].status == "INCOMPLETE"
        assert student_subjects["M24MCAL106"].grade == "X"
        assert student_subjects["M24MCAL106"].status == "FAIL"
        assert student_subjects["M24MCA103"].grade == "W"
        assert student_subjects["M24MCA104"].grade == "NE"

        student_gpa = get_student_sgpa_cgpa(db, usn="4MH24MC001")
        assert [semester.semester for semester in student_gpa.semesters] == [1, 2]
        assert student_gpa.semesters[0].credits_earned == 4
        assert student_gpa.semesters[0].sgpa == 1.27
        assert student_gpa.cgpa == 2.08
        gpa_subjects = {subject.code: subject for subject in student_gpa.semesters[0].subjects}
        assert gpa_subjects["M24MCA101"].marks is None
        assert gpa_subjects["M24MCA101"].status == "INCOMPLETE"
        assert gpa_subjects["M24MCAL106"].status == "FAIL"


def test_performance_categories_use_distinct_students_and_matching_grades():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        cases = [
            ("4MH24MC001", "X ONLY", [("M24MCA101", 40, 10, None, None, "X")]),
            ("4MH24MC002", "F ONLY", [("M24MCA102", 20, 20, None, None, "F")]),
            (
                "4MH24MC003", "MIXED",
                [
                    ("M24MCA103", 40, 10, None, None, "X"),
                    ("M24MCA104", 20, 20, None, None, "F"),
                ],
            ),
            ("4MH24MC004", "PASS ONLY", [("M24MCA105", 40, 30, None, None, "A")]),
            ("4MH24MC005", "AB ONLY", [("M24MCA106", None, 30, "AB", None, "AB")]),
            ("4MH24MC006", "W ONLY", [("M24MCA107", 30, 30, None, None, "W")]),
            ("4MH24MC007", "NE ONLY", [("M24MCA108", None, None, None, "NE", "NE")]),
        ]
        for usn, name, subject_rows in cases:
            db.add(Student(usn=usn, student_name=name, department="MCA", semester=1))
            for code, internal, external, internal_status, external_status, grade in subject_rows:
                db.add(Subject(subject_code=code, semester=1, department="MCA", credits=4))
                db.add(
                    StudentMark(
                        usn=usn,
                        subject_code=code,
                        semester=1,
                        internal_marks=internal,
                        external_marks=external,
                        internal_status=internal_status,
                        external_status=external_status,
                        grade=grade,
                    )
                )
            db.add(
                StudentResult(
                    usn=usn,
                    semester=1,
                    grand_total=sum((row[1] or 0) + (row[2] or 0) for row in subject_rows),
                    average_marks=0,
                    credits_earned=0,
                    grade="F",
                    sgpa=0,
                )
            )
        db.commit()

        makeup = list_admin_makeup_eligible_students(db, department="MCA", search=None)
        failed = list_admin_failed_students(db, department="MCA", search=None)
        makeup_by_usn = {student.usn: student for student in makeup.students}
        failed_by_usn = {student.usn: student for student in failed.students}

        assert makeup.total == len(makeup.students) == 2
        assert failed.total == len(failed.students) == 2
        assert set(makeup_by_usn) == {"4MH24MC001", "4MH24MC003"}
        assert set(failed_by_usn) == {"4MH24MC002", "4MH24MC003"}
        assert len(makeup_by_usn["4MH24MC003"].semesters[0].subjects) == 1
        assert len(failed_by_usn["4MH24MC003"].semesters[0].subjects) == 1

        makeup_subject = makeup_by_usn["4MH24MC001"].semesters[0].subjects[0]
        assert (makeup_subject.subject_code, makeup_subject.grade, makeup_subject.status) == (
            "M24MCA101", "X", "FAIL",
        )
        assert (makeup_subject.internal_marks, makeup_subject.external_marks, makeup_subject.total_marks) == (
            40, 10, 50,
        )
        assert failed_by_usn["4MH24MC002"].semesters[0].subjects[0].grade == "F"

        performance = list_admin_student_performance(db, department="MCA", search=None)
        assert performance.total == 7
        assert performance.passed_students == 1
