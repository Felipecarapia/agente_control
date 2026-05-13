from app.core.database import engine
from sqlalchemy import text

def migrate():
    print("Iniciando migração da tabela ai_agents...")
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS google_client_id VARCHAR(255)"))
            conn.execute(text("ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS google_calendar_id VARCHAR(255)"))
            conn.commit()
            print("✅ Colunas google_client_id e google_calendar_id adicionadas com sucesso!")
        except Exception as e:
            print(f"❌ Erro na migração: {e}")

if __name__ == "__main__":
    migrate()
