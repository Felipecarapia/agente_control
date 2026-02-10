import sys
import os

# Adicionar o diretório pai ao path para importar app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from sqlalchemy import text

def fix_db():
    print("Iniciando alteração da tabela tarefas...")
    db = SessionLocal()
    try:
        # Alterar a coluna projeto_id para permitir NULL
        # Comando específico para PostgreSQL
        sql = "ALTER TABLE tarefas ALTER COLUMN projeto_id DROP NOT NULL;"
        db.execute(text(sql))
        db.commit()
        print("SUCESSO: Coluna 'projeto_id' na tabela 'tarefas' agora aceita valores NULL.")
    except Exception as e:
        print(f"ERRO ao alterar tabela: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_db()
