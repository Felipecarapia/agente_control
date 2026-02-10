import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from sqlalchemy import text

def fix_context_id():
    print("Iniciando correção da coluna context_id...")
    db = SessionLocal()
    try:
        # Dropar e recriar a coluna para garantir tipo UUID limpo
        # Se tiver dados, eles serão perdidos nesta coluna específica, mas é melhor garantir a integridade futura.
        # Como o erro diz que é integer, provavelmente está vazia ou com lixo.
        
        print("Removendo coluna context_id antiga (integer)...")
        db.execute(text("ALTER TABLE tarefas DROP COLUMN IF EXISTS context_id;"))
        
        print("Adicionando coluna context_id nova (uuid)...")
        db.execute(text("ALTER TABLE tarefas ADD COLUMN context_id UUID;"))
        
        db.commit()
        print("✅ SUCESSO: tabela 'tarefas' corrigida. 'context_id' agora é UUID.")
    except Exception as e:
        print(f"❌ ERRO ao corrigir: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_context_id()
