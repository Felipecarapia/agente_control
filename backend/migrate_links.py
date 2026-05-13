import os
from sqlalchemy import text
from app.core.database import engine

def migrate():
    print("Iniciando migração de vínculo com clientes...")
    with engine.begin() as conn:
        try:
            # WhatsApp Connections
            conn.execute(text("ALTER TABLE whatsapp_connections ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL;"))
            print("Coluna 'cliente_id' adicionada em 'whatsapp_connections'.")
            
            # AI Agents
            conn.execute(text("ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL;"))
            print("Coluna 'cliente_id' adicionada em 'ai_agents'.")
            
        except Exception as e:
            print(f"Erro ao migrar: {e}")

if __name__ == "__main__":
    migrate()
