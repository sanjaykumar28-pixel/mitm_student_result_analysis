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


def subject_result(total: float, credits: int) -> tuple[str, int, float]:
    grade = letter_grade(total)
    points = GRADE_POINTS[grade]
    earned = 0 if grade == "F" else credits
    return grade, earned, credits * points
