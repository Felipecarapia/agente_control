import uuid
import logging
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Request, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.response import success_response, error_response, serialize_data
from app.models.agent import AIAgent, AgentConversation
from app.models.usuario import Usuario
from app.schemas.agent import (
    AIAgentCreate,
    AIAgentUpdate,
    AgentTestRequest,
)
from app.services.openai_agent import OpenAIAgentService
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agents", tags=["agents"])


# ──────────────────── CRUD ────────────────────

@router.get("")
def list_agents(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
    is_active: Optional[bool] = Query(None),
):
    """Lista todos os agentes de IA."""
    request_id = getattr(request.state, "request_id", None)
    try:
        q = db.query(AIAgent).order_by(desc(AIAgent.created_at))
        if is_active is not None:
            q = q.filter(AIAgent.is_active == is_active)
        agents = q.all()
        data = [serialize_data(a) for a in agents]
        return success_response(data=data, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao listar agentes: {e}", exc_info=True)
        return success_response(data=[], request_id=request_id)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_agent(
    request: Request,
    data: AIAgentCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Cria um novo agente de IA."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = AIAgent(
            **data.model_dump(),
            created_by_user_id=current_user.id,
        )
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return success_response(data=serialize_data(obj), request_id=request_id, status_code=201)
    except Exception as e:
        logger.error(f"Erro ao criar agente: {e}", exc_info=True)
        db.rollback()
        return error_response(code="CREATE_ERROR", message=str(e), status_code=500, request_id=request_id)


@router.get("/{agent_id}")
def get_agent(
    request: Request,
    agent_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Busca um agente pelo ID."""
    request_id = getattr(request.state, "request_id", None)
    obj = db.query(AIAgent).filter(AIAgent.id == agent_id).first()
    if not obj:
        return error_response(code="NOT_FOUND", message="Agente não encontrado", status_code=404, request_id=request_id)
    return success_response(data=serialize_data(obj), request_id=request_id)


@router.put("/{agent_id}")
def update_agent(
    request: Request,
    agent_id: uuid.UUID,
    data: AIAgentUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Atualiza um agente de IA."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = db.query(AIAgent).filter(AIAgent.id == agent_id).first()
        if not obj:
            return error_response(code="NOT_FOUND", message="Agente não encontrado", status_code=404, request_id=request_id)
        update_data = data.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        return success_response(data=serialize_data(obj), request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao atualizar agente: {e}", exc_info=True)
        db.rollback()
        return error_response(code="UPDATE_ERROR", message=str(e), status_code=500, request_id=request_id)


@router.delete("/{agent_id}")
def delete_agent(
    request: Request,
    agent_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Deleta um agente de IA."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = db.query(AIAgent).filter(AIAgent.id == agent_id).first()
        if not obj:
            return error_response(code="NOT_FOUND", message="Agente não encontrado", status_code=404, request_id=request_id)
        db.delete(obj)
        db.commit()
        return success_response(data={"deleted": True}, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao deletar agente: {e}", exc_info=True)
        db.rollback()
        return error_response(code="DELETE_ERROR", message=str(e), status_code=500, request_id=request_id)


# ──────────────────── Testar Agente ────────────────────

@router.post("/{agent_id}/test")
async def test_agent(
    request: Request,
    agent_id: uuid.UUID,
    data: AgentTestRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Testa o agente enviando uma mensagem e recebendo a resposta da IA."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = db.query(AIAgent).filter(AIAgent.id == agent_id).first()
        if not obj:
            return error_response(code="NOT_FOUND", message="Agente não encontrado", status_code=404, request_id=request_id)

        openai_key = settings.OPENAI_API_KEY or ""
        if not openai_key:
            return error_response(
                code="CONFIG_ERROR",
                message="OPENAI_API_KEY não configurada no servidor",
                status_code=500,
                request_id=request_id,
            )

        svc = OpenAIAgentService(api_key=openai_key)
        result = await svc.create_chat_completion(
            system_prompt=obj.system_prompt,
            messages=[{"role": "user", "content": data.message}],
            model=obj.model,
            temperature=obj.temperature,
            max_tokens=obj.max_tokens,
        )

        return success_response(
            data={
                "agent_id": str(obj.id),
                "input_message": data.message,
                "response": result["response"],
                "tokens_used": result.get("tokens_used"),
            },
            request_id=request_id,
        )

    except Exception as e:
        logger.error(f"Erro ao testar agente: {e}", exc_info=True)
        return error_response(code="TEST_ERROR", message=str(e), status_code=500, request_id=request_id)


# ──────────────────── Conversas ────────────────────

@router.get("/{agent_id}/conversations")
def list_conversations(
    request: Request,
    agent_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Lista as conversas do agente."""
    request_id = getattr(request.state, "request_id", None)
    try:
        convs = (
            db.query(AgentConversation)
            .filter(AgentConversation.agent_id == agent_id)
            .order_by(desc(AgentConversation.started_at))
            .all()
        )
        data = [serialize_data(c) for c in convs]
        return success_response(data=data, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao listar conversas: {e}", exc_info=True)
        return success_response(data=[], request_id=request_id)
