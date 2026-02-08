"""
Script para gerar tarefas recorrentes.
Execute este script diariamente via cron job.

Exemplo de crontab (executar diariamente às 00:00):
0 0 * * * cd /caminho/para/backend && source .venv/bin/activate && python -m app.scripts.generate_recurring_tasks
"""
import sys
import os

# Adicionar o diretório raiz ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import SessionLocal
from app.models.tarefa import Tarefa, TarefaAssignee
from datetime import date, timedelta


def generate_recurring_tasks():
    """Gera tarefas recorrentes baseadas nas tarefas pai configuradas."""
    db = SessionLocal()
    try:
        today = date.today()
        generated_count = 0
        
        # Buscar todas as tarefas recorrentes ativas
        recurring_tasks = db.query(Tarefa).filter(
            Tarefa.is_recurring == True,
            Tarefa.parent_task_id == None,  # Apenas tarefas pai
            Tarefa.recurrence_end_date >= today  # Ainda não expirou
        ).all()
        
        for parent_task in recurring_tasks:
            if not parent_task.recurrence_type or not parent_task.recurrence_interval:
                continue
            
            # Calcular próxima data baseada no tipo de recorrência
            interval_days = 0
            if parent_task.recurrence_type == "diaria":
                interval_days = parent_task.recurrence_interval or 1
            elif parent_task.recurrence_type == "semanal":
                interval_days = (parent_task.recurrence_interval or 1) * 7
            elif parent_task.recurrence_type == "mensal":
                interval_days = (parent_task.recurrence_interval or 1) * 30
            
            # Verificar se já existe uma tarefa para hoje ou para o próximo período
            last_child = db.query(Tarefa).filter(
                Tarefa.parent_task_id == parent_task.id
            ).order_by(Tarefa.data_vencimento.desc()).first()
            
            next_date = today
            if last_child and last_child.data_vencimento:
                next_date = last_child.data_vencimento + timedelta(days=interval_days)
            elif parent_task.data_vencimento:
                next_date = parent_task.data_vencimento + timedelta(days=interval_days)
            
            # Gerar tarefa se a próxima data for hoje ou no futuro (mas não além do end_date)
            if next_date <= today and next_date <= (parent_task.recurrence_end_date or date.max):
                # Verificar se já existe tarefa para esta data
                existing = db.query(Tarefa).filter(
                    Tarefa.parent_task_id == parent_task.id,
                    Tarefa.data_vencimento == next_date
                ).first()
                
                if not existing:
                    # Criar nova tarefa filha
                    new_task = Tarefa(
                        titulo=parent_task.titulo,
                        descricao=parent_task.descricao,
                        projeto_id=parent_task.projeto_id,
                        status="pendente",
                        prioridade=parent_task.prioridade,
                        responsavel_id=parent_task.responsavel_id,
                        data_vencimento=next_date,
                        is_recurring=False,  # Tarefas filhas não são recorrentes
                        parent_task_id=parent_task.id
                    )
                    db.add(new_task)
                    db.flush()
                    
                    # Copiar assignees da tarefa pai
                    parent_assignees = db.query(TarefaAssignee).filter(
                        TarefaAssignee.tarefa_id == parent_task.id
                    ).all()
                    
                    for parent_assignee in parent_assignees:
                        new_assignee = TarefaAssignee(
                            tarefa_id=new_task.id,
                            usuario_id=parent_assignee.usuario_id
                        )
                        db.add(new_assignee)
                    
                    generated_count += 1
                    print(f"✅ Tarefa recorrente gerada: {new_task.titulo} (ID: {new_task.id}) para {next_date}")
        
        db.commit()
        print(f"✅ Total de tarefas geradas: {generated_count}")
        return generated_count
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao gerar tarefas recorrentes: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    generate_recurring_tasks()




