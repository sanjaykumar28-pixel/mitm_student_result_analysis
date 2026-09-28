-- Preserve AB, W, and NE source marks without coercing them to numeric zero.
ALTER TABLE Student_Marks
    MODIFY COLUMN internal_marks DECIMAL(5,2) NULL DEFAULT NULL,
    MODIFY COLUMN external_marks DECIMAL(5,2) NULL DEFAULT NULL,
    ADD COLUMN internal_status VARCHAR(4) NULL,
    ADD COLUMN external_status VARCHAR(4) NULL;