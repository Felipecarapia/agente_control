"""
Script para migrar tarefas existentes para o sistema Notion.
Atribui todas as tarefas ao database padrão e migra dados básicos.

Execute: python -m app.scripts.migrate_tasks_to_notion
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import SessionLocal
from app.models.tarefa import Tarefa
from app.models.task_notion import TaskDatabase, TaskProperty, TaskPropertyValue


def migrate_tasks():
    db = SessionLocal()
    try:
        # Buscar database padrão
        default_db = db.query(TaskDatabase).filter(TaskDatabase.is_default == True).first()
        if not default_db:
            print("❌ Database padrão não encontrado. Execute o seed primeiro.")
            return
        
        print(f"✅ Database padrão encontrado: {default_db.name} (ID: {default_db.id})")
        
        # Buscar todas as tarefas sem database
        tasks = db.query(Tarefa).filter(Tarefa.task_database_id.is_(None)).all()
        print(f"📋 Encontradas {len(tasks)} tarefas para migrar")
        
        # Buscar properties do database
        properties = db.query(TaskProperty).filter(
            TaskProperty.task_database_id == default_db.id
        ).all()
        property_map = {p.key: p for p in properties}
        
        migrated = 0
        for task in tasks:
            # Atribuir ao database padrão
            task.task_database_id = default_db.id
            
            # Migrar prioridade para property value se existir property "prioridade"
            if task.prioridade and "prioridade" in property_map:
                prop = property_map["prioridade"]
                # Verificar se já existe value
                existing = db.query(TaskPropertyValue).filter(
                    TaskPropertyValue.task_id == task.id,
                    TaskPropertyValue.property_id == prop.id
                ).first()
                
                if not existing:
                    value = TaskPropertyValue(
                        task_id=task.id,
                        property_id=prop.id,
                        value_json={"value": task.prioridade}
                    )
                    db.add(value)
            
            # Migrar status para property value se existir property "status"
            if task.status and "status" in property_map:
                prop = property_map["status"]
                existing = db.query(TaskPropertyValue).filter(
                    TaskPropertyValue.task_id == task.id,
                    TaskPropertyValue.property_id == prop.id
                ).first()
                
                if not existing:
                    # Mapear status antigo para novo
                    status_map = {
                        "pendente": "Pendente",
                        "em_andamento": "Em Andamento",
                        "concluida": "Concluída",
                        "concluída": "Concluída",
                    }
                    mapped_status = status_map.get(task.status, task.status.capitalize())
                    
                    value = TaskPropertyValue(
                        task_id=task.id,
                        property_id=prop.id,
                        value_json={"value": mapped_status}
                    )
                    db.add(value)
            
            migrated += 1
        
        db.commit()
        print(f"✅ {migrated} tarefas migradas com sucesso!")
        print(f"   - Todas atribuídas ao database '{default_db.name}'")
        print(f"   - Prioridades e status migrados para property values")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erro durante migração: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate_tasks()




