-- Apply once to databases created before Students.login_id was added.
ALTER TABLE Students
    ADD COLUMN login_id INT NULL AFTER student_id,
    ADD CONSTRAINT uq_students_login UNIQUE (login_id),
    ADD CONSTRAINT fk_students_login
        FOREIGN KEY (login_id) REFERENCES Login(login_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE;