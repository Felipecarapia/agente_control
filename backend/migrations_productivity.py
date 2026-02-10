"""
Migration: Criar tabela de métricas de produtividade mensal
"""
from sqlalchemy import create_engine, text, inspect
from app.core.database import SessionLocal, engine

def run_migration():
    print("Iniciando migração de Produtividade Mensal...")
    db = SessionLocal()
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        if "user_productivity_metrics" not in tables:
            print("Criando tabela 'user_productivity_metrics'...")
            sql = """
            CREATE TABLE user_productivity_metrics (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
                month_year VARCHAR(7) NOT NULL, -- Formato: 2026-02 (ano-mês)
                productivity_score DECIMAL(5,2) DEFAULT 0.00, -- Percentual de 0 a 100
                tasks_completed_on_time INT DEFAULT 0,
                tasks_completed_late INT DEFAULT 0,
                tasks_pending INT DEFAULT 0,
                tasks_overdue INT DEFAULT 0,
                last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id, month_year)
            );
            
            CREATE INDEX idx_productivity_user_month ON user_productivity_metrics(user_id, month_year);
            CREATE INDEX idx_productivity_score ON user_productivity_metrics(productivity_score DESC);
            """
            db.execute(text(sql))
            db.commit()
            print("✅ Tabela 'user_productivity_metrics' criada com sucesso.")
        else:
            print("ℹ️ Tabela 'user_productivity_metrics' já existe.")
            
    except Exception as e:
        print(f"❌ Erro na migração: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
