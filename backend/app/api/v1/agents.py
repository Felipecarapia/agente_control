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
from app.models.tenant import Tenant
from app.schemas.agent import (
    AIAgentCreate,
    AIAgentUpdate,
    AgentTestRequest,
)
from app.services.openai_agent import OpenAIAgentService
from app.core.config import settings
from app.core.rbac import require_feature
from app.core.plans import PLAN_LIMITS, PLAN_FEATURES

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agents", tags=["agents"])


# ──────────────────── CRUD ────────────────────

@router.get("/module-info")
def agents_module_info(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Retorna status do módulo de Agentes para o tenant (feature, limite e uso atual)."""
    request_id = getattr(request.state, "request_id", None)
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        return error_response(code="TENANT_NOT_FOUND", message="Tenant não encontrado", status_code=404, request_id=request_id)

    plan_key = str(tenant.plano)
    features = PLAN_FEATURES.get(plan_key, set())
    limits = PLAN_LIMITS.get(plan_key, {})
    current_agents = db.query(AIAgent).filter(AIAgent.tenant_id == current_user.tenant_id).count()
    max_agents = limits.get("ai_agents", 0)

    return success_response(
        data={
            "enabled": "ai_agents" in features,
            "plan": plan_key,
            "limits": {"ai_agents": max_agents},
            "usage": {"ai_agents": current_agents},
        },
        request_id=request_id,
    )

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
        tenant_id = current_user.tenant_id
        q = db.query(AIAgent).filter(AIAgent.tenant_id == tenant_id).order_by(desc(AIAgent.created_at))
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
    current_user: Annotated[Usuario, Depends(require_feature("ai_agents"))],
):
    """Cria um novo agente de IA."""
    request_id = getattr(request.state, "request_id", None)
    try:
        tenant_id = current_user.tenant_id
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        limits = PLAN_LIMITS.get(str(tenant.plano), {})
        max_agents = limits.get("ai_agents", 0)
        current_agents = db.query(AIAgent).filter(AIAgent.tenant_id == tenant_id).count()
        if current_agents >= max_agents:
            return error_response(
                code="PLAN_LIMIT",
                message=f"Limite de agentes do plano atingido ({max_agents})",
                status_code=403,
                request_id=request_id,
            )

        obj = AIAgent(
            **data.model_dump(),
            tenant_id=tenant_id,
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
    tenant_id = current_user.tenant_id
    obj = db.query(AIAgent).filter(AIAgent.id == agent_id, AIAgent.tenant_id == tenant_id).first()
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
        obj = db.query(AIAgent).filter(AIAgent.id == agent_id, AIAgent.tenant_id == current_user.tenant_id).first()
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
        obj = db.query(AIAgent).filter(AIAgent.id == agent_id, AIAgent.tenant_id == current_user.tenant_id).first()
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
        tenant_id = current_user.tenant_id
        obj = db.query(AIAgent).filter(AIAgent.id == agent_id, AIAgent.tenant_id == tenant_id).first()
        if not obj:
            return error_response(code="NOT_FOUND", message="Agente não encontrado", status_code=404, request_id=request_id)

        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        
        from app.services.agent_factory import AgentFactory
        
        # Obter histórico enviado pelo frontend (opcional)
        history = data.history if hasattr(data, "history") and data.history else []
        
        # Preparar mensagens para a IA
        messages = history + [{"role": "user", "content": data.message}]

        # Prioridade de chave: 1. Cliente vinculado -> 2. Empresa (Tenant) -> 3. Global
        api_key = None
        
        # 1. Tentar chave do cliente se o agente estiver vinculado
        if obj.cliente_id:
            from app.models.cliente import Cliente
            cliente = db.query(Cliente).filter(Cliente.id == obj.cliente_id).first()
            if cliente:
                if obj.provider == "openai" and cliente.openai_api_key:
                    api_key = cliente.openai_api_key
                elif obj.provider == "gemini" and cliente.gemini_api_key:
                    api_key = cliente.gemini_api_key
        
        # 2. Tentar chave da empresa
        if not api_key and tenant:
            if obj.provider == "openai" and tenant.openai_api_key:
                api_key = tenant.openai_api_key
            elif obj.provider == "gemini" and tenant.gemini_api_key:
                api_key = tenant.gemini_api_key
            
        # 3. Tentar chave global (do .env)
        if not api_key:
            if obj.provider == "openai":
                api_key = settings.OPENAI_API_KEY
            elif obj.provider == "gemini":
                api_key = settings.GEMINI_API_KEY

        if not api_key:
            return error_response(
                code="CONFIG_ERROR",
                message=f"Chave para o provedor {obj.provider} não configurada.",
                status_code=500,
                request_id=request_id,
            )

        # Usar factory para obter o serviço correto (OpenAI ou Gemini)
        svc = AgentFactory.get_service(obj.provider, api_key=api_key)
        
        result = await svc.create_chat_completion(
            system_prompt=obj.system_prompt,
            messages=messages,
            model=obj.model,
            temperature=obj.temperature,
            max_tokens=obj.max_tokens,
        )

        return success_response(
            data={
                "agent_id": str(obj.id),
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
        tenant_id = current_user.tenant_id
        convs = (
            db.query(AgentConversation)
            .filter(
                AgentConversation.agent_id == agent_id,
                AgentConversation.tenant_id == tenant_id
            )
            .order_by(desc(AgentConversation.started_at))
            .all()
        )
        data = [serialize_data(c) for c in convs]
        return success_response(data=data, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao listar conversas: {e}", exc_info=True)
        return success_response(data=[], request_id=request_id)


# ──────────────────── Logs ────────────────────

@router.get("/{agent_id}/logs")
def list_logs(
    request: Request,
    agent_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Lista os logs e métricas de execução do agente."""
    request_id = getattr(request.state, "request_id", None)
    try:
        from app.models.agent import AgentLog
        tenant_id = current_user.tenant_id
        logs = (
            db.query(AgentLog)
            .filter(
                AgentLog.agent_id == agent_id,
                AgentLog.tenant_id == tenant_id
            )
            .order_by(desc(AgentLog.created_at))
            .limit(50)
            .all()
        )
        data = [serialize_data(log) for log in logs]
        return success_response(data=data, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao listar logs do agente: {e}", exc_info=True)
        return success_response(data=[], request_id=request_id)
