import pymysql

conn = pymysql.connect(host='localhost', user='root', password='', database='result_analysis')
cur = conn.cursor()
cur.execute('ALTER TABLE subjects ADD COLUMN department VARCHAR(80) NOT NULL DEFAULT "" AFTER semester')
conn.commit()
print('Column added successfully')
cur.execute('DESCRIBE subjects')
print(cur.fetchall())
conn.close()
