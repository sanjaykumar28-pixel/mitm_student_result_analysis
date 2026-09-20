"""Result calculation rules used by Excel import.

Excel has IA / Ext / T / Total / AVG only. Credits, letter grades, SGPA, and CGPA
are computed here so Student_Result is complete.

Grade bands (100-point paper, matching the frontend grade set):
  >= 90 O (10), >= 80 A+ (9), >= 70 A (8), >= 60 B+ (7),
  >= 50 B (6), >= 40 C (5), else F (0)

Credits when Subjects.credits is empty:
  lab codes containing 'MCAL' → 2; otherwise → 4

SGPA = sum(credits * grade_point) / sum(credits registered)
Credits earned = sum(credits) for non-F subjects
CGPA = credit-weighted average of all stored semester SGPAs for that USN
"""

from __future__ import annotations

GRADE_POINTS = {
    "O": 10,
    "A+": 9,
    "A": 8,
    "B+": 7,
    "B": 6,
    "C": 5,
    "F": 0,
}


def fail_reasons(
    internal_marks: float | None,
    external_marks: float | None,
    total_marks: float | None,
) -> list[str]:
    """Return the authoritative subject failure reasons.

    A missing mark is deliberately not a failure.  Callers can use an empty
    result together with :func:`has_complete_marks` to represent incomplete
    result data instead of creating a false backlog.
    """
    if not has_complete_marks(internal_marks, external_marks, total_marks):
        return []

    reasons: list[str] = []
    if float(internal_marks) < 25:
        reasons.append("CIE below 25")
    if float(external_marks) < 25:
        reasons.append("SEE below 25")
    if float(total_marks) < 40:
        reasons.append("Total below 40")
    return reasons


def has_complete_marks(
    internal_marks: float | None,
    external_marks: float | None,
    total_marks: float | None,
) -> bool:
    return internal_marks is not None and external_marks is not None and total_marks is not None


def is_subject_pass(
    internal_marks: float | None,
    external_marks: float | None,
    total_marks: float | None,
) -> bool | None:
    """Return True/False for complete marks, or None when results are incomplete."""
    if not has_complete_marks(internal_marks, external_marks, total_marks):
        return None
    return not fail_reasons(internal_marks, external_marks, total_marks)


def default_credits(subject_code: str) -> int:
    code = subject_code.upper()
    if "MCAL" in code or "LAB" in code:
        return 2
    return 4


def letter_grade(total: float) -> str:
    if total >= 90:
        return "O"
    if total >= 80:
        return "A+"
    if total >= 70:
        return "A"
    if total >= 60:
        return "B+"
    if total >= 50:
        return "B"
    if total >= 40:
        return "C"
    return "F"


def subject_result(
    total: float,
    credits: int,
    *,
    internal_marks: float | None = None,
    external_marks: float | None = None,
) -> tuple[str, int, float]:
    """Calculate a grade and credit outcome.

    When component marks are supplied, the academic minimums take precedence
    over a total-only letter-grade band.
    """
    passed = is_subject_pass(internal_marks, external_marks, total)
    grade = "F" if passed is False else letter_grade(total)
    points = GRADE_POINTS[grade]
    earned = 0 if grade == "F" else credits
    return grade, earned, credits * points

