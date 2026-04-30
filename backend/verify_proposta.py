import psycopg2, sys
sys.stdout.reconfigure(encoding='utf-8')
conn = psycopg2.connect(host='78.142.242.97', port=5432, database='sistemaxi-crm', user='fortis', password='Fortis2107')
cur = conn.cursor()
cur.execute("SELECT id, titulo, landing_content FROM propostas WHERE id = '40e7d7f2-10d8-4223-8e4c-c6c24df4edf7'")
row = cur.fetchone()
content = row[2]
print(f'ID: {row[0]}')
print(f'Titulo: {row[1]}')
print(f'Total de secoes: {len(content)}')
print('---')
for i, s in enumerate(content):
    t = s.get('data', {}).get('titulo') or s.get('data', {}).get('headline', '?')
    print(f'[{i+1:02d}] {s["type"]:25s} | {t}')
cur.close()
conn.close()
