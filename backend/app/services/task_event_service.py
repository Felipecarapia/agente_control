from sqlalchemy.orm import Session
from app.models.task_event import TaskEvent
import json

def log_task_event(
    db: Session, 
    task_id, 
    user_id, 
    event_type: str, 
    from_value: str = None, 
    to_value: str = None, 
    meta: dict = None
):
    """
    Registra um evento de auditoria para uma tarefa.
    Deve ser chamado dentro de uma transação ativa.
    """
    try:
        event = TaskEvent(
            task_id=task_id,
            user_id=user_id,
            type=event_type,
            from_value=str(from_value) if from_value is not None else None,
            to_value=str(to_value) if to_value is not None else None,
            meta_json=meta
        )
        db.add(event)
        # Flush para garantir ID se necessário, mas commit fica por conta do caller
        db.flush()
    except Exception as e:
        print(f"Erro ao logar evento de tarefa: {e}")
        # Não lança erro para não bloquear a ação principal
