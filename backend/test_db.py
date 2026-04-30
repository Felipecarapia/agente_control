import psycopg2
try:
    conn = psycopg2.connect(host='78.142.242.97', port='5432', user='fortis', password='Fortis2107', dbname='postgres')
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute('CREATE DATABASE "sistemaxi-prod";')
    print('Database created successfully')
except Exception as e:
    print('Error:', e)
