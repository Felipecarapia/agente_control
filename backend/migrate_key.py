import os
from sqlalchemy import text
from app.core.database import engine

def migrate():
    print("Iniciando migração manual...")
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE clientes ADD COLUMN IF NOT EXISTS openai_api_key VARCHAR(255);"))
            print("Coluna 'openai_api_key' verificada/adicionada com sucesso!")
        except Exception as e:
            print(f"Erro ao migrar: {e}")

if __name__ == "__main__":
    migrate()
