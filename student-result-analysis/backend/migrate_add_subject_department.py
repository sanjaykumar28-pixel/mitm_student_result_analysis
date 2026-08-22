"""Migration: Add department column to Subjects table if it doesn't exist."""
import pymysql

conn = pymysql.connect(
    host="localhost",
    port=3306,
    user="root",
    password="",
    database="result_analysis",
)
cursor = conn.cursor()

cursor.execute(
    "SELECT COUNT(*) FROM information_schema.COLUMNS "
    "WHERE TABLE_SCHEMA = 'result_analysis' "
    "  AND TABLE_NAME   = 'Subjects' "
    "  AND COLUMN_NAME  = 'department'"
)
exists = cursor.fetchone()[0]

if exists:
    print("department column already exists – no action needed.")
else:
    cursor.execute(
        "ALTER TABLE Subjects ADD COLUMN department VARCHAR(80) NULL AFTER semester"
    )
    conn.commit()
    print("department column added to Subjects table successfully.")

cursor.execute("DESCRIBE Subjects")
rows = cursor.fetchall()
print("\nFinal Subjects table structure:")
for r in rows:
    print(r)

conn.close()
