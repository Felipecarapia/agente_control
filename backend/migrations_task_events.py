import sys
import os

# Setup path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, engine
from sqlalchemy import text, inspect

def run_migration():
    print("Iniciando migração de Task Events...")
    db = SessionLocal()
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        if "task_events" not in tables:
            print("Criando tabela 'task_events'...")
            sql = """
            CREATE TABLE task_events (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                task_id UUID NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
                user_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
                type VARCHAR(50) NOT NULL,
                from_value VARCHAR(255),
                to_value VARCHAR(255),
                meta_json JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            CREATE INDEX idx_task_events_task_id ON task_events(task_id);
            CREATE INDEX idx_task_events_created_at ON task_events(created_at);
            CREATE INDEX idx_task_events_type ON task_events(type);
            """
            db.execute(text(sql))
            db.commit()
            print("✅ Tabela 'task_events' criada com sucesso.")
        else:
            print("ℹ️ Tabela 'task_events' já existe.")
            
    except Exception as e:
        print(f"❌ Erro na migração: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
