import sys
import os

# Adicionar o diretório pai ao path para importar app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.tarefa import Tarefa
from sqlalchemy.exc import IntegrityError, DataError

def debug():
    print("Iniciando teste de criação de tarefa sem projeto...")
    db = SessionLocal()
    try:
        # Tentar criar a tarefa mais simples possível (apenas título obrigatório)
        # Passando explicitamente None para projeto_id para testar a constraint
        t = Tarefa(
            titulo="Tarefa de Teste Debug (Pode deletar)",
            status="pendente",
            projeto_id=None,
            responsavel_id=None
        )
        db.add(t)
        db.commit()
        print(f"✅ SUCESSO! Tarefa criada com ID: {t.id}")
        print("A tabela 'tarefas' está aceitando projeto_id NULL corretamente.")
        
        # Opcional: limpar a tarefa criada
        # db.delete(t)
        # db.commit()
        
    except IntegrityError as e:
        print(f"❌ ERRO DE INTEGRIDADE (Constraint):")
        print(e)
        print("Provavelmente alguma coluna obrigatória (NOT NULL) não foi preenchida.")
        db.rollback()
    except DataError as e:
        print(f"❌ ERRO DE DADOS (Tipo inválido):")
        print(e)
        print("Provavelmente um UUID inválido ou string longa demais.")
        db.rollback()
    except Exception as e:
        print(f"❌ ERRO GENÉRICO:")
        print(e)
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    debug()
