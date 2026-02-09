import sys
import os
from sqlalchemy import create_engine, inspect

# Add current directory to path
sys.path.append(os.getcwd())

try:
    from app.core.config import settings
    db_url = str(settings.database_url)
except Exception as e:
    print(f"Error loading settings: {e}")
    # Fallback or exit
    sys.exit(1)

print(f"Connecting to {db_url}")
engine = create_engine(db_url)
inspector = inspect(engine)

print("Tables:")
for table_name in inspector.get_table_names():
    print(f" - {table_name}")

print("\nColumns in 'tarefas':")
try:
    for col in inspector.get_columns("tarefas"):
        print(f" - {col['name']} ({col['type']})")
except Exception:
    print("Table 'tarefas' not found")

print("\nColumns in 'usuarios':")
try:
    for col in inspector.get_columns("usuarios"):
        print(f" - {col['name']} ({col['type']})")
except Exception:
    print("Table 'usuarios' not found")
