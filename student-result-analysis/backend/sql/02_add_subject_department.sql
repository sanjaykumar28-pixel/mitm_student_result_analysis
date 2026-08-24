-- -- Migration: Add department column to Subjects table
-- -- Run this against the result_analysis database.
-- -- Safe to run multiple times (uses IF NOT EXISTS guard via column check).

-- USE result_analysis;

-- -- Add department column if it does not already exist
-- SET @col_exists = (
--     SELECT COUNT(*) FROM information_schema.COLUMNS
--     WHERE TABLE_SCHEMA = 'result_analysis'
--       AND TABLE_NAME   = 'Subjects'
--       AND COLUMN_NAME  = 'department'
-- );

-- SET @sql = IF(
--     @col_exists = 0,
--     'ALTER TABLE Subjects ADD COLUMN department VARCHAR(80) NULL AFTER semester',
--     'SELECT ''department column already exists, skipping'' AS info'
-- );

-- PREPARE stmt FROM @sql;
-- EXECUTE stmt;
-- DEALLOCATE PREPARE stmt;
