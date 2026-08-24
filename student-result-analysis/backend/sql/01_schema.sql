-- Result Analysis schema (phpMyAdmin)
-- Source of truth: MCA 1st Sem (Autonomous) AY 2024-25 (ODD) result sheet
-- Columns present in Excel: SL.NO, USN, STUDENT NAME,
--   per-subject IA / Ext / T (M24MCA101..105, M24MCA108, M24MCAL106, M24MCAL107),
--   Total, AVG. Semester comes from the sheet title, not a column.
--
-- Backup existing data first. This drops and recreates the five tables.

CREATE DATABASE IF NOT EXISTS result_analysis
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE result_analysis;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS Student_Marks;
DROP TABLE IF EXISTS Student_Result;
DROP TABLE IF EXISTS Students;
DROP TABLE IF EXISTS Subjects;
DROP TABLE IF EXISTS Login;
SET FOREIGN_KEY_CHECKS = 1;

-- Auth accounts. Admins have no USN. Students get a USN when registered.
-- Passwords are bcrypt hashes only (never plain text).
CREATE TABLE Login (
    login_id INT AUTO_INCREMENT PRIMARY KEY,
    usn VARCHAR(20) NULL,
    email VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'student') NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_login_email UNIQUE (email),
    CONSTRAINT uq_login_usn UNIQUE (usn),
    CONSTRAINT chk_login_usn_by_role CHECK (
        (role = 'admin' AND usn IS NULL) OR
        (role = 'student' AND usn IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row per student (identity). Semester here is "latest / current", not a result year.
-- No FK to Login.usn: Excel import can create students before they have accounts.

CREATE TABLE Students (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    login_id INT NULL,
    slno INT NULL COMMENT 'Sheet serial number; not a stable identity',
    usn VARCHAR(20) NOT NULL,
    student_name VARCHAR(100) NOT NULL,
    department VARCHAR(80) NOT NULL DEFAULT 'MCA',
    semester TINYINT UNSIGNED NULL COMMENT 'Latest semester seen in imports',
    section VARCHAR(10) NULL,

    CONSTRAINT uq_students_usn UNIQUE (usn),
    CONSTRAINT uq_students_login UNIQUE (login_id),
    CONSTRAINT fk_student_login
        FOREIGN KEY (login_id) REFERENCES Login(login_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Subject catalogue. Excel provides codes only, not names or credits.
CREATE TABLE Subjects (
    subject_id INT AUTO_INCREMENT PRIMARY KEY,
    subject_code VARCHAR(20) NOT NULL,
    subject_name VARCHAR(100) NULL,
    credits TINYINT UNSIGNED NULL,
    semester TINYINT UNSIGNED NOT NULL,

    CONSTRAINT uq_subjects_code UNIQUE (subject_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One marks row per student + subject + semester (allows later semesters).
CREATE TABLE Student_Marks (
    marks_id INT AUTO_INCREMENT PRIMARY KEY,
    usn VARCHAR(20) NOT NULL,
    subject_code VARCHAR(20) NOT NULL,
    semester TINYINT UNSIGNED NOT NULL,
    academic_year VARCHAR(16) NULL COMMENT 'e.g. 2024-25',

    internal_marks DECIMAL(5,2) NOT NULL DEFAULT 0,
    external_marks DECIMAL(5,2) NOT NULL DEFAULT 0,
    total_marks DECIMAL(5,2)
        GENERATED ALWAYS AS (internal_marks + external_marks) STORED,
    grade VARCHAR(4) NULL COMMENT 'Not present in the sample sheet',

    CONSTRAINT fk_marks_student
        FOREIGN KEY (usn) REFERENCES Students(usn)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_marks_subject
        FOREIGN KEY (subject_code) REFERENCES Subjects(subject_code)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT uq_marks_student_subject_sem
        UNIQUE (usn, subject_code, semester),
    CONSTRAINT chk_marks_ia CHECK (internal_marks >= 0 AND internal_marks <= 100),
    CONSTRAINT chk_marks_ext CHECK (external_marks >= 0 AND external_marks <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One summary row per student per semester (Excel Total + AVG).
-- SGPA/CGPA/grade/credits are nullable because they are not on this sheet.
CREATE TABLE Student_Result (
    result_id INT AUTO_INCREMENT PRIMARY KEY,
    usn VARCHAR(20) NOT NULL,
    semester TINYINT UNSIGNED NOT NULL,
    academic_year VARCHAR(16) NULL,

    grand_total DECIMAL(6,2) NOT NULL,
    average_marks DECIMAL(5,2) NOT NULL,
    credits_earned INT NULL,
    grade VARCHAR(4) NULL,
    sgpa DECIMAL(4,2) NULL,
    cgpa DECIMAL(4,2) NULL,

    CONSTRAINT fk_result_student
        FOREIGN KEY (usn) REFERENCES Students(usn)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT uq_result_student_sem
        UNIQUE (usn, semester)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_login_role ON Login (role);
CREATE INDEX idx_students_dept_sem ON Students (department, semester);
CREATE INDEX idx_marks_semester ON Student_Marks (semester);
CREATE INDEX idx_result_semester ON Student_Result (semester);

-- Added department column to Subjects table
ALTER TABLE Subjects
ADD COLUMN department VARCHAR(80) NOT NULL 
AFTER subject_name;