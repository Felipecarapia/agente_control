import uuid
from typing import Annotated, Optional
import logging
from pydantic import ValidationError
from datetime import date, datetime

from fastapi import APIRouter, Depends, Request, Query, status
from sqlalchemy.orm import Session, joinedload, selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.response import success_response, error_response, serialize_data
from app.models.tarefa import Tarefa, TarefaAssignee
from app.models.usuario import Usuario
from app.models.projeto import Projeto
from app.schemas.tarefa import TarefaCreate, TarefaUpdate, TarefaResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tarefas", tags=["tarefas"])

# Status e prioridades válidos (defaults)
VALID_STATUSES = ["pendente", "em_andamento", "concluida", "cancelada"]
VALID_PRIORITIES = ["baixa", "media", "alta", "urgente"]


@router.get("")
def list_tarefas(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
    projeto_id: Optional[uuid.UUID] = None,
):
    """
    Lista todas as tarefas com relacionamentos carregados.
    Retorna sempre 200 com lista vazia se não houver tarefas (nunca retorna 500).
    """
    request_id = getattr(request.state, "request_id", None)
    
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
        
        # Converter usando serialize_data para serialização correta (datas/decimal)
        tarefas_data = [serialize_data(t) for t in tarefas]
        
        # Adicionar assigned_user_ids e assigned_users manualmente (não serializados automaticamente)
        for i, t in enumerate(tarefas):
            if hasattr(t, 'assignees') and t.assignees:
                tarefas_data[i]["assigned_user_ids"] = [a.usuario_id for a in t.assignees]
                tarefas_data[i]["assigned_users"] = [
                    {
                        "id": a.id,
                        "usuario_id": a.usuario_id,
                        "usuario_nome": a.usuario.nome if a.usuario else None
                    }
                    for a in t.assignees
                ]
            else:
                tarefas_data[i]["assigned_user_ids"] = []
                tarefas_data[i]["assigned_users"] = []
        
        return success_response(data=tarefas_data if tarefas_data else [], request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao listar tarefas: {e}", exc_info=True, extra={"request_id": request_id})
        # Em caso de erro, retornar lista vazia ao invés de quebrar
        return success_response(data=[], request_id=request_id)


@router.get("/kanban")
def get_tarefas_kanban(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Retorna tarefas agrupadas por status para visualização Kanban.
    Retorna sempre 200 com estrutura vazia se não houver tarefas (nunca retorna 500).
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Carregar todas as tarefas com relacionamentos
        tarefas = db.query(Tarefa).options(
            joinedload(Tarefa.projeto),
            joinedload(Tarefa.responsavel),
            selectinload(Tarefa.assignees).joinedload(TarefaAssignee.usuario)
        ).order_by(Tarefa.created_at.desc()).all()
        
        # Função auxiliar para converter tarefa para dict usando serialize_data
        def tarefa_to_dict(t):
            tarefa_dict = serialize_data(t)
            # Adicionar assigned_user_ids e assigned_users manualmente
            if hasattr(t, 'assignees') and t.assignees:
                tarefa_dict["assigned_user_ids"] = [a.usuario_id for a in t.assignees]
                tarefa_dict["assigned_users"] = [
                    {
                        "id": a.id,
                        "usuario_id": a.usuario_id,
                        "usuario_nome": a.usuario.nome if a.usuario else None
                    }
                    for a in t.assignees
                ]
            else:
                tarefa_dict["assigned_user_ids"] = []
                tarefa_dict["assigned_users"] = []
            return tarefa_dict
        
        # Agrupar por status
        pendente = []
        em_andamento = []
        concluida = []
        
        for t in tarefas:
            tarefa_dict = tarefa_to_dict(t)
            status = t.status or "pendente"
            
            if status == "concluida":
                concluida.append(tarefa_dict)
            elif status == "em_andamento":
                em_andamento.append(tarefa_dict)
            else:
                pendente.append(tarefa_dict)
        
        kanban_data = {
            "pendente": pendente,
            "em_andamento": em_andamento,
            "concluida": concluida,
        }
        
        return success_response(data=kanban_data, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao carregar Kanban: {e}", exc_info=True, extra={"request_id": request_id})
        # Retornar estrutura vazia ao invés de erro
        return success_response(data={
            "pendente": [],
            "em_andamento": [],
            "concluida": [],
        }, request_id=request_id)


@router.get("/range")
def get_tarefas_range(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
    from_date: Optional[str] = Query(None, alias="from", description="Data inicial (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, alias="to", description="Data final (YYYY-MM-DD)"),
):
    """
    Retorna tarefas dentro de um intervalo de datas (para calendário e agenda).
    Retorna sempre 200 com lista vazia se não houver tarefas ou datas inválidas (nunca retorna 500).
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        from sqlalchemy import and_
        
        # Carregar tarefas com relacionamentos
        q = db.query(Tarefa).options(
            joinedload(Tarefa.projeto),
            joinedload(Tarefa.responsavel),
            selectinload(Tarefa.assignees).joinedload(TarefaAssignee.usuario)
        )
        
        # Filtrar por intervalo de datas se fornecido
        if from_date and to_date:
            try:
                from_dt = date.fromisoformat(from_date)
                to_dt = date.fromisoformat(to_date)
                # Filtrar tarefas que têm data_vencimento dentro do intervalo
                q = q.filter(
                    and_(
                        Tarefa.data_vencimento >= from_dt,
                        Tarefa.data_vencimento <= to_dt
                    )
                )
            except ValueError:
                # Se as datas forem inválidas, retornar lista vazia
                return success_response(data=[], request_id=request_id)
        
        tarefas = q.order_by(Tarefa.data_vencimento.asc(), Tarefa.created_at.desc()).all()
        
        # Converter usando serialize_data para serialização correta
        tarefas_data = [serialize_data(t) for t in tarefas]
        
        # Adicionar assigned_user_ids e assigned_users manualmente
        for i, t in enumerate(tarefas):
            if hasattr(t, 'assignees') and t.assignees:
                tarefas_data[i]["assigned_user_ids"] = [a.usuario_id for a in t.assignees]
                tarefas_data[i]["assigned_users"] = [
                    {
                        "id": a.id,
                        "usuario_id": a.usuario_id,
                        "usuario_nome": a.usuario.nome if a.usuario else None
                    }
                    for a in t.assignees
                ]
            else:
                tarefas_data[i]["assigned_user_ids"] = []
                tarefas_data[i]["assigned_users"] = []
        
        return success_response(data=tarefas_data if tarefas_data else [], request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao carregar tarefas por range: {e}", exc_info=True, extra={"request_id": request_id})
        # Retornar lista vazia ao invés de erro
        return success_response(data=[], request_id=request_id)


@router.get("/{tarefa_id}")
def get_tarefa(
    request: Request,
    tarefa_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Obtém uma tarefa específica com todos os relacionamentos.
    Retorna 404 padronizado se tarefa não encontrada.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        obj = db.query(Tarefa).options(
            joinedload(Tarefa.projeto),
            joinedload(Tarefa.responsavel),
            selectinload(Tarefa.assignees).joinedload(TarefaAssignee.usuario)
        ).filter(Tarefa.id == tarefa_id).first()
        
        if not obj:
            return error_response(
                code="TASK_NOT_FOUND",
                message=f"Tarefa com ID {tarefa_id} não encontrada",
                status_code=404,
                request_id=request_id
            )
        
        # Converter usando serialize_data para serialização correta
        tarefa_dict = serialize_data(obj)
        
        # Adicionar assigned_user_ids e assigned_users manualmente
        if hasattr(obj, 'assignees') and obj.assignees:
            tarefa_dict["assigned_user_ids"] = [a.usuario_id for a in obj.assignees]
            tarefa_dict["assigned_users"] = [
                {
                    "id": a.id,
                    "usuario_id": a.usuario_id,
                    "usuario_nome": a.usuario.nome if a.usuario else None
                }
                for a in obj.assignees
            ]
        else:
            tarefa_dict["assigned_user_ids"] = []
            tarefa_dict["assigned_users"] = []
        
        return success_response(data=tarefa_dict, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao buscar tarefa {tarefa_id}: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="INTERNAL_ERROR",
            message="Erro ao buscar tarefa",
            status_code=500,
            request_id=request_id
        )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_tarefa(
    request: Request,
    data: TarefaCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Cria uma nova tarefa e vincula assignees.
    Valida payload com Pydantic -> 400 com details se inválido.
    Valida status/prioridade -> 400 se inválido.
    Valida projeto existe -> 404 se não encontrado.
    Retorna 409 se tarefa duplicada (mesmo título + projeto).
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Validação Pydantic já é feita automaticamente pelo FastAPI
        # Validar status
        if data.status and data.status not in VALID_STATUSES:
            return error_response(
                code="VALIDATION_ERROR",
                message=f"Status inválido. Valores válidos: {', '.join(VALID_STATUSES)}",
                details=[{"loc": ["body", "status"], "msg": f"Status deve ser um de: {', '.join(VALID_STATUSES)}"}],
                status_code=400,
                request_id=request_id
            )
        
        # Validar prioridade (se fornecida)
        if data.prioridade and data.prioridade.lower() not in VALID_PRIORITIES:
            return error_response(
                code="VALIDATION_ERROR",
                message=f"Prioridade inválida. Valores válidos: {', '.join(VALID_PRIORITIES)}",
                details=[{"loc": ["body", "prioridade"], "msg": f"Prioridade deve ser um de: {', '.join(VALID_PRIORITIES)}"}],
                status_code=400,
                request_id=request_id
            )
        
        # Verificar se projeto existe
        projeto = db.query(Projeto).filter(Projeto.id == data.projeto_id).first()
        if not projeto:
            return error_response(
                code="PROJECT_NOT_FOUND",
                message=f"Projeto com ID {data.projeto_id} não encontrado",
                status_code=404,
                request_id=request_id
            )
        
        # Verificar duplicado: mesmo título + projeto
        existing = db.query(Tarefa).filter(
            Tarefa.titulo == data.titulo,
            Tarefa.projeto_id == data.projeto_id
        ).first()
        if existing:
            return error_response(
                code="TASK_DUPLICATE",
                message=f"Tarefa '{data.titulo}' já existe neste projeto",
                details={"existing_task_id": existing.id, "field": "titulo"},
                status_code=409,
                request_id=request_id
            )
        
        # Extrair assigned_user_ids antes de criar a tarefa
        create_data = data.model_dump()
        assigned_user_ids = create_data.pop("assigned_user_ids", [])
        
        # Normalizar status e prioridade (lowercase)
        if create_data.get("status"):
            create_data["status"] = create_data["status"].lower()
        if create_data.get("prioridade"):
            create_data["prioridade"] = create_data["prioridade"].lower()
        
        # Criar tarefa
        obj = Tarefa(**create_data)
        db.add(obj)
        db.flush()  # Para obter o ID
        
        # Criar assignees se houver
        if assigned_user_ids:
            for user_id in assigned_user_ids:
                # Verificar se usuário existe
                user = db.query(Usuario).filter(Usuario.id == user_id).first()
                if not user:
                    continue  # Pular usuário inválido
                assignee = TarefaAssignee(tarefa_id=obj.id, usuario_id=user_id)
                db.add(assignee)
        
        db.commit()
        
        # Recarregar com relacionamentos
        obj = db.query(Tarefa).options(
            joinedload(Tarefa.projeto),
            joinedload(Tarefa.responsavel),
            selectinload(Tarefa.assignees).joinedload(TarefaAssignee.usuario)
        ).filter(Tarefa.id == obj.id).first()
        
        # Converter usando serialize_data
        tarefa_dict = serialize_data(obj)
        
        # Adicionar assigned_user_ids e assigned_users manualmente
        if hasattr(obj, 'assignees') and obj.assignees:
            tarefa_dict["assigned_user_ids"] = [a.usuario_id for a in obj.assignees]
            tarefa_dict["assigned_users"] = [
                {
                    "id": a.id,
                    "usuario_id": a.usuario_id,
                    "usuario_nome": a.usuario.nome if a.usuario else None
                }
                for a in obj.assignees
            ]
        else:
            tarefa_dict["assigned_user_ids"] = []
            tarefa_dict["assigned_users"] = []
        
        return success_response(data=tarefa_dict, status_code=status.HTTP_201_CREATED, request_id=request_id)
    except ValidationError as e:
        # Validação Pydantic falhou
        return error_response(
            code="VALIDATION_ERROR",
            message="Dados inválidos",
            details=e.errors(),
            status_code=400,
            request_id=request_id
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao criar tarefa: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="CREATE_ERROR",
            message=f"Erro ao criar tarefa: {str(e)}",
            status_code=500,
            request_id=request_id
        )


@router.patch("/{tarefa_id}")
def update_tarefa(
    request: Request,
    tarefa_id: uuid.UUID,
    data: TarefaUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Atualiza uma tarefa existente e gerencia assignees.
    Valida payload com Pydantic -> 400 com details se inválido.
    Valida status/prioridade -> 400 se inválido.
    Retorna 404 se tarefa não encontrada.
    Retorna 409 se título+projeto duplicado.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        obj = db.query(Tarefa).filter(Tarefa.id == tarefa_id).first()
        if not obj:
            return error_response(
                code="TASK_NOT_FOUND",
                message=f"Tarefa com ID {tarefa_id} não encontrada",
                status_code=404,
                request_id=request_id
            )
        
        update_data = data.model_dump(exclude_unset=True)
        
        # Validar status (se está sendo atualizado)
        if "status" in update_data and update_data["status"]:
            if update_data["status"].lower() not in VALID_STATUSES:
                return error_response(
                    code="VALIDATION_ERROR",
                    message=f"Status inválido. Valores válidos: {', '.join(VALID_STATUSES)}",
                    details=[{"loc": ["body", "status"], "msg": f"Status deve ser um de: {', '.join(VALID_STATUSES)}"}],
                    status_code=400,
                    request_id=request_id
                )
            update_data["status"] = update_data["status"].lower()
        
        # Validar prioridade (se está sendo atualizada)
        if "prioridade" in update_data and update_data["prioridade"]:
            if update_data["prioridade"].lower() not in VALID_PRIORITIES:
                return error_response(
                    code="VALIDATION_ERROR",
                    message=f"Prioridade inválida. Valores válidos: {', '.join(VALID_PRIORITIES)}",
                    details=[{"loc": ["body", "prioridade"], "msg": f"Prioridade deve ser um de: {', '.join(VALID_PRIORITIES)}"}],
                    status_code=400,
                    request_id=request_id
                )
            update_data["prioridade"] = update_data["prioridade"].lower()
        
        # Verificar duplicados se título ou projeto_id estão sendo atualizados
        if "titulo" in update_data or "projeto_id" in update_data:
            titulo = update_data.get("titulo", obj.titulo)
            projeto_id = update_data.get("projeto_id", obj.projeto_id)
            existing = db.query(Tarefa).filter(
                Tarefa.titulo == titulo,
                Tarefa.projeto_id == projeto_id,
                Tarefa.id != tarefa_id
            ).first()
            if existing:
                return error_response(
                    code="TASK_DUPLICATE",
                    message=f"Tarefa '{titulo}' já existe neste projeto",
                    details={"existing_task_id": existing.id, "field": "titulo"},
                    status_code=409,
                    request_id=request_id
                )
        
        # Verificar se projeto existe (se projeto_id está sendo atualizado)
        if "projeto_id" in update_data:
            projeto = db.query(Projeto).filter(Projeto.id == update_data["projeto_id"]).first()
            if not projeto:
                return error_response(
                    code="PROJECT_NOT_FOUND",
                    message=f"Projeto com ID {update_data['projeto_id']} não encontrado",
                    status_code=404,
                    request_id=request_id
                )
        
        # Gerenciar assignees separadamente
        if "assigned_user_ids" in update_data:
            assigned_user_ids = update_data.pop("assigned_user_ids")
            
            # Remover assignees existentes
            db.query(TarefaAssignee).filter(TarefaAssignee.tarefa_id == tarefa_id).delete()
            
            # Adicionar novos assignees
            if assigned_user_ids:
                for user_id in assigned_user_ids:
                    # Verificar se usuário existe
                    user = db.query(Usuario).filter(Usuario.id == user_id).first()
                    if not user:
                        continue  # Pular usuário inválido
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
        
        # Converter usando serialize_data
        tarefa_dict = serialize_data(obj)
        
        # Adicionar assigned_user_ids e assigned_users manualmente
        if hasattr(obj, 'assignees') and obj.assignees:
            tarefa_dict["assigned_user_ids"] = [a.usuario_id for a in obj.assignees]
            tarefa_dict["assigned_users"] = [
                {
                    "id": a.id,
                    "usuario_id": a.usuario_id,
                    "usuario_nome": a.usuario.nome if a.usuario else None
                }
                for a in obj.assignees
            ]
        else:
            tarefa_dict["assigned_user_ids"] = []
            tarefa_dict["assigned_users"] = []
        
        return success_response(data=tarefa_dict, request_id=request_id)
    except ValidationError as e:
        # Validação Pydantic falhou
        return error_response(
            code="VALIDATION_ERROR",
            message="Dados inválidos",
            details=e.errors(),
            status_code=400,
            request_id=request_id
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao atualizar tarefa {tarefa_id}: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="UPDATE_ERROR",
            message=f"Erro ao atualizar tarefa: {str(e)}",
            status_code=500,
            request_id=request_id
        )


@router.delete("/{tarefa_id}")
def delete_tarefa(
    request: Request,
    tarefa_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Deleta uma tarefa.
    Retorna 404 padronizado se tarefa não encontrada.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        obj = db.query(Tarefa).filter(Tarefa.id == tarefa_id).first()
        if not obj:
            return error_response(
                code="TASK_NOT_FOUND",
                message=f"Tarefa com ID {tarefa_id} não encontrada",
                status_code=404,
                request_id=request_id
            )
        db.delete(obj)
        db.commit()
        return success_response(data={"deleted": True, "tarefa_id": tarefa_id}, request_id=request_id)
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao deletar tarefa {tarefa_id}: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="DELETE_ERROR",
            message=f"Erro ao deletar tarefa: {str(e)}",
            status_code=500,
            request_id=request_id
        )


@router.post("/{tarefa_id}/toggle-status")
def toggle_tarefa_status(
    request: Request,
    tarefa_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Alterna o status da tarefa entre 'pendente' e 'concluida'.
    Retorna 404 padronizado se tarefa não encontrada.
    """
    request_id = getattr(request.state, "request_id", None)
    
    # Validar ID
    if tarefa_id <= 0:
        return error_response(
            code="INVALID_ID",
            message="ID da tarefa deve ser maior que 0",
            status_code=400,
            request_id=request_id
        )
    
    try:
        obj = db.query(Tarefa).filter(Tarefa.id == tarefa_id).first()
        if not obj:
            return error_response(
                code="TASK_NOT_FOUND",
                message=f"Tarefa com ID {tarefa_id} não encontrada",
                status_code=404,
                request_id=request_id
            )
        
        # Alternar status
        if obj.status == "concluida":
            obj.status = "pendente"
            obj.completed_at = None
            obj.completed_by_user_id = None
        else:
            obj.status = "concluida"
            obj.completed_at = datetime.now()
            obj.completed_by_user_id = current_user.id
        
        db.commit()
        
        # Recarregar com relacionamentos
        obj = db.query(Tarefa).options(
            joinedload(Tarefa.projeto),
            joinedload(Tarefa.responsavel),
            selectinload(Tarefa.assignees).joinedload(TarefaAssignee.usuario)
        ).filter(Tarefa.id == tarefa_id).first()
        
        # Converter usando serialize_data
        tarefa_dict = serialize_data(obj)
        
        # Adicionar assigned_user_ids e assigned_users manualmente
        if hasattr(obj, 'assignees') and obj.assignees:
            tarefa_dict["assigned_user_ids"] = [a.usuario_id for a in obj.assignees]
            tarefa_dict["assigned_users"] = [
                {
                    "id": a.id,
                    "usuario_id": a.usuario_id,
                    "usuario_nome": a.usuario.nome if a.usuario else None
                }
                for a in obj.assignees
            ]
        else:
            tarefa_dict["assigned_user_ids"] = []
            tarefa_dict["assigned_users"] = []
        
        return success_response(data=tarefa_dict, request_id=request_id)
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao alternar status da tarefa {tarefa_id}: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="TOGGLE_ERROR",
            message=f"Erro ao alternar status: {str(e)}",
            status_code=500,
            request_id=request_id
        )
