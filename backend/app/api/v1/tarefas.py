from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload, selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.response import success_response, error_response
from app.models.tarefa import Tarefa, TarefaAssignee
from app.models.usuario import Usuario
from app.schemas.tarefa import TarefaCreate, TarefaUpdate, TarefaResponse

router = APIRouter(prefix="/tarefas", tags=["tarefas"])


@router.get("")
def list_tarefas(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
    projeto_id: int | None = None,
):
    """Lista todas as tarefas com relacionamentos carregados. Retorna lista vazia se não houver tarefas."""
    try:
        # Carregar tarefas com todos os relacionamentos necessários
        q = db.query(Tarefa).options(
            joinedload(Tarefa.projeto),
            joinedload(Tarefa.responsavel),
            selectinload(Tarefa.assignees).joinedload(TarefaAssignee.usuario)
        )
        if projeto_id is not None:
            q = q.filter(Tarefa.projeto_id == projeto_id)
        tarefas = q.all()
        
        # Converter para dict incluindo relacionamentos
        tarefas_data = []
        for t in tarefas:
            tarefa_dict = {
                "id": t.id,
                "titulo": t.titulo,
                "descricao": t.descricao,
                "projeto_id": t.projeto_id,
                "status": t.status,
                "prioridade": t.prioridade,
                "responsavel_id": t.responsavel_id,
                "data_vencimento": t.data_vencimento.isoformat() if t.data_vencimento else None,
                "is_recurring": t.is_recurring,
                "recurrence_type": t.recurrence_type,
                "recurrence_interval": t.recurrence_interval,
                "recurrence_end_date": t.recurrence_end_date.isoformat() if t.recurrence_end_date else None,
                "parent_task_id": t.parent_task_id,
                "created_at": t.created_at.isoformat() if t.created_at else None,
                "updated_at": t.updated_at.isoformat() if t.updated_at else None,
                # Incluir assigned_user_ids dos relacionamentos
                "assigned_user_ids": [a.usuario_id for a in t.assignees] if t.assignees else [],
                # Incluir dados dos assignees para compatibilidade
                "assigned_users": [
                    {
                        "id": a.id,
                        "usuario_id": a.usuario_id,
                        "usuario_nome": a.usuario.nome if a.usuario else None
                    }
                    for a in t.assignees
                ] if t.assignees else [],
            }
            tarefas_data.append(tarefa_dict)
        
        return success_response(data=tarefas_data)
    except Exception as e:
        # Em caso de erro, retornar lista vazia ao invés de quebrar
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erro ao listar tarefas: {e}", exc_info=True)
        return success_response(data=[])


@router.get("/{tarefa_id}")
def get_tarefa(
    tarefa_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Obtém uma tarefa específica com todos os relacionamentos."""
    obj = db.query(Tarefa).options(
        joinedload(Tarefa.projeto),
        joinedload(Tarefa.responsavel),
        selectinload(Tarefa.assignees).joinedload(TarefaAssignee.usuario)
    ).filter(Tarefa.id == tarefa_id).first()
    
    if not obj:
        return error_response(
            code="TASK_NOT_FOUND",
            message="Tarefa não encontrada",
            status_code=404
        )
    
    # Converter para dict incluindo relacionamentos
    tarefa_dict = {
        "id": obj.id,
        "titulo": obj.titulo,
        "descricao": obj.descricao,
        "projeto_id": obj.projeto_id,
        "status": obj.status,
        "prioridade": obj.prioridade,
        "responsavel_id": obj.responsavel_id,
        "data_vencimento": obj.data_vencimento.isoformat() if obj.data_vencimento else None,
        "is_recurring": obj.is_recurring,
        "recurrence_type": obj.recurrence_type,
        "recurrence_interval": obj.recurrence_interval,
        "recurrence_end_date": obj.recurrence_end_date.isoformat() if obj.recurrence_end_date else None,
        "parent_task_id": obj.parent_task_id,
        "created_at": obj.created_at.isoformat() if obj.created_at else None,
        "updated_at": obj.updated_at.isoformat() if obj.updated_at else None,
        "assigned_user_ids": [a.usuario_id for a in obj.assignees] if obj.assignees else [],
        "assigned_users": [
            {
                "id": a.id,
                "usuario_id": a.usuario_id,
                "usuario_nome": a.usuario.nome if a.usuario else None
            }
            for a in obj.assignees
        ] if obj.assignees else [],
    }
    
    return success_response(data=tarefa_dict)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_tarefa(
    data: TarefaCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Cria uma nova tarefa e vincula assignees."""
    try:
        # Extrair assigned_user_ids antes de criar a tarefa
        assigned_user_ids = data.model_dump().pop("assigned_user_ids", [])
        
        # Criar tarefa
        obj = Tarefa(**data.model_dump())
        db.add(obj)
        db.flush()  # Para obter o ID
        
        # Criar assignees se houver
        if assigned_user_ids:
            for user_id in assigned_user_ids:
                assignee = TarefaAssignee(tarefa_id=obj.id, usuario_id=user_id)
                db.add(assignee)
        
        db.commit()
        
        # Recarregar com relacionamentos
        db.refresh(obj)
        obj = db.query(Tarefa).options(
            joinedload(Tarefa.projeto),
            joinedload(Tarefa.responsavel),
            selectinload(Tarefa.assignees).joinedload(TarefaAssignee.usuario)
        ).filter(Tarefa.id == obj.id).first()
        
        # Converter para dict
        tarefa_dict = {
            "id": obj.id,
            "titulo": obj.titulo,
            "descricao": obj.descricao,
            "projeto_id": obj.projeto_id,
            "status": obj.status,
            "prioridade": obj.prioridade,
            "responsavel_id": obj.responsavel_id,
            "data_vencimento": obj.data_vencimento.isoformat() if obj.data_vencimento else None,
            "is_recurring": obj.is_recurring,
            "recurrence_type": obj.recurrence_type,
            "recurrence_interval": obj.recurrence_interval,
            "recurrence_end_date": obj.recurrence_end_date.isoformat() if obj.recurrence_end_date else None,
            "parent_task_id": obj.parent_task_id,
            "created_at": obj.created_at.isoformat() if obj.created_at else None,
            "updated_at": obj.updated_at.isoformat() if obj.updated_at else None,
            "assigned_user_ids": [a.usuario_id for a in obj.assignees] if obj.assignees else [],
            "assigned_users": [
                {
                    "id": a.id,
                    "usuario_id": a.usuario_id,
                    "usuario_nome": a.usuario.nome if a.usuario else None
                }
                for a in obj.assignees
            ] if obj.assignees else [],
        }
        
        return success_response(data=tarefa_dict, status_code=201)
    except Exception as e:
        db.rollback()
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erro ao criar tarefa: {e}", exc_info=True)
        return error_response(
            code="CREATE_ERROR",
            message=f"Erro ao criar tarefa: {str(e)}",
            status_code=400
        )


@router.patch("/{tarefa_id}")
def update_tarefa(
    tarefa_id: int,
    data: TarefaUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Atualiza uma tarefa existente e gerencia assignees."""
    obj = db.query(Tarefa).filter(Tarefa.id == tarefa_id).first()
    if not obj:
        return error_response(
            code="TASK_NOT_FOUND",
            message="Tarefa não encontrada",
            status_code=404
        )
    try:
        update_data = data.model_dump(exclude_unset=True)
        
        # Gerenciar assignees separadamente
        if "assigned_user_ids" in update_data:
            assigned_user_ids = update_data.pop("assigned_user_ids")
            
            # Remover assignees existentes
            db.query(TarefaAssignee).filter(TarefaAssignee.tarefa_id == tarefa_id).delete()
            
            # Adicionar novos assignees
            if assigned_user_ids:
                for user_id in assigned_user_ids:
                    assignee = TarefaAssignee(tarefa_id=tarefa_id, usuario_id=user_id)
                    db.add(assignee)
        
        # Atualizar outros campos
        for k, v in update_data.items():
            setattr(obj, k, v)
        
        db.commit()
        
        # Recarregar com relacionamentos
        obj = db.query(Tarefa).options(
            joinedload(Tarefa.projeto),
            joinedload(Tarefa.responsavel),
            selectinload(Tarefa.assignees).joinedload(TarefaAssignee.usuario)
        ).filter(Tarefa.id == tarefa_id).first()
        
        # Converter para dict
        tarefa_dict = {
            "id": obj.id,
            "titulo": obj.titulo,
            "descricao": obj.descricao,
            "projeto_id": obj.projeto_id,
            "status": obj.status,
            "prioridade": obj.prioridade,
            "responsavel_id": obj.responsavel_id,
            "data_vencimento": obj.data_vencimento.isoformat() if obj.data_vencimento else None,
            "is_recurring": obj.is_recurring,
            "recurrence_type": obj.recurrence_type,
            "recurrence_interval": obj.recurrence_interval,
            "recurrence_end_date": obj.recurrence_end_date.isoformat() if obj.recurrence_end_date else None,
            "parent_task_id": obj.parent_task_id,
            "created_at": obj.created_at.isoformat() if obj.created_at else None,
            "updated_at": obj.updated_at.isoformat() if obj.updated_at else None,
            "assigned_user_ids": [a.usuario_id for a in obj.assignees] if obj.assignees else [],
            "assigned_users": [
                {
                    "id": a.id,
                    "usuario_id": a.usuario_id,
                    "usuario_nome": a.usuario.nome if a.usuario else None
                }
                for a in obj.assignees
            ] if obj.assignees else [],
        }
        
        return success_response(data=tarefa_dict)
    except Exception as e:
        db.rollback()
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erro ao atualizar tarefa: {e}", exc_info=True)
        return error_response(
            code="UPDATE_ERROR",
            message=f"Erro ao atualizar tarefa: {str(e)}",
            status_code=400
        )


@router.delete("/{tarefa_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tarefa(
    tarefa_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    obj = db.query(Tarefa).filter(Tarefa.id == tarefa_id).first()
    if not obj:
        return error_response(
            code="TASK_NOT_FOUND",
            message="Tarefa não encontrada",
            status_code=404
        )
    db.delete(obj)
    db.commit()
    return None


@router.post("/{tarefa_id}/toggle-status")
def toggle_tarefa_status(
    tarefa_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Alterna o status da tarefa entre 'pendente' e 'concluida'."""
    obj = db.query(Tarefa).filter(Tarefa.id == tarefa_id).first()
    if not obj:
        return error_response(
            code="TASK_NOT_FOUND",
            message="Tarefa não encontrada",
            status_code=404
        )
    
    # Alternar status
    if obj.status == "concluida":
        obj.status = "pendente"
        obj.completed_at = None
        obj.completed_by_user_id = None
    else:
        obj.status = "concluida"
        from datetime import datetime
        obj.completed_at = datetime.now()
        obj.completed_by_user_id = current_user.id
    
    db.commit()
    
    # Recarregar com relacionamentos
    obj = db.query(Tarefa).options(
        joinedload(Tarefa.projeto),
        joinedload(Tarefa.responsavel),
        selectinload(Tarefa.assignees).joinedload(TarefaAssignee.usuario)
    ).filter(Tarefa.id == tarefa_id).first()
    
    # Converter para dict
    tarefa_dict = {
        "id": obj.id,
        "titulo": obj.titulo,
        "descricao": obj.descricao,
        "projeto_id": obj.projeto_id,
        "status": obj.status,
        "prioridade": obj.prioridade,
        "responsavel_id": obj.responsavel_id,
        "data_vencimento": obj.data_vencimento.isoformat() if obj.data_vencimento else None,
        "is_recurring": obj.is_recurring,
        "recurrence_type": obj.recurrence_type,
        "recurrence_interval": obj.recurrence_interval,
        "recurrence_end_date": obj.recurrence_end_date.isoformat() if obj.recurrence_end_date else None,
        "parent_task_id": obj.parent_task_id,
        "created_at": obj.created_at.isoformat() if obj.created_at else None,
        "updated_at": obj.updated_at.isoformat() if obj.updated_at else None,
        "assigned_user_ids": [a.usuario_id for a in obj.assignees] if obj.assignees else [],
        "assigned_users": [
            {
                "id": a.id,
                "usuario_id": a.usuario_id,
                "usuario_nome": a.usuario.nome if a.usuario else None
            }
            for a in obj.assignees
        ] if obj.assignees else [],
    }
    
    return success_response(data=tarefa_dict)
