import uuid
from datetime import datetime, timezone
from typing import Annotated, Optional
import logging

from fastapi import APIRouter, Depends, Request, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import ValidationError

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.config import settings
from app.core.response import success_response, error_response, serialize_data
from app.models.lead import Lead, LeadConversation, LeadMessage
from app.models.agent import AIAgent
from app.models.whatsapp import WhatsAppConnection
from app.models.usuario import Usuario
from app.schemas.lead import LeadCreate, LeadUpdate, LeadResponse
from app.services.openai_agent import OpenAIAgentService
from app.services.evolution_api import EvolutionAPIService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/leads", tags=["leads"])


@router.get("")
def list_leads(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
    status_filter: Optional[str] = Query(None, alias="status"),
    temperatura: Optional[str] = Query(None),
    origem: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    """
    Lista todos os leads com filtros opcionais.
    Retorna sempre 200 com lista vazia se não houver leads.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        q = db.query(Lead)
        if status_filter:
            q = q.filter(Lead.status == status_filter)
        if temperatura:
            q = q.filter(Lead.temperatura == temperatura)
        if origem:
            q = q.filter(Lead.origem == origem)
        if search:
            pattern = f"%{search}%"
            q = q.filter(
                (Lead.nome.ilike(pattern)) |
                (Lead.email.ilike(pattern)) |
                (Lead.empresa.ilike(pattern)) |
                (Lead.telefone.ilike(pattern))
            )
        leads = q.order_by(desc(Lead.created_at)).all()
        # Converter para dict usando serialize_data
        from app.core.response import serialize_data
        leads_data = [serialize_data(lead) for lead in leads]
        return success_response(data=leads_data if leads_data else [], request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao listar leads: {str(e)}", exc_info=True, extra={"request_id": request_id})
        # Retornar lista vazia em vez de erro
        return success_response(data=[], request_id=request_id)


@router.get("/stats/overview")
def leads_stats(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Estatísticas rápidas dos leads.
    Retorna sempre 200 com valores zerados se não houver leads.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        total = db.query(Lead).count()
        novos = db.query(Lead).filter(Lead.status == "novo").count()
        quentes = db.query(Lead).filter(Lead.temperatura == "quente").count()
        ganhos = db.query(Lead).filter(Lead.status == "ganho").count()
        perdidos = db.query(Lead).filter(Lead.status == "perdido").count()
        return success_response(
            data={
                "total": total or 0,
                "novos": novos or 0,
                "quentes": quentes or 0,
                "ganhos": ganhos or 0,
                "perdidos": perdidos or 0,
            },
            request_id=request_id
        )
    except Exception as e:
        logger.error(f"Erro ao calcular estatísticas de leads: {str(e)}", exc_info=True, extra={"request_id": request_id})
        # Retornar valores zerados em vez de erro
        return success_response(
            data={
                "total": 0,
                "novos": 0,
                "quentes": 0,
                "ganhos": 0,
                "perdidos": 0,
            },
            request_id=request_id
        )


@router.get("/{lead_id}")
def get_lead(
    request: Request,
    lead_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Busca um lead por ID. Retorna 404 se não encontrado."""
    request_id = getattr(request.state, "request_id", None)
    
    try:
        obj = db.query(Lead).filter(Lead.id == lead_id).first()
        if not obj:
            return error_response(
                code="LEAD_NOT_FOUND",
                message=f"Lead com ID {lead_id} não encontrado",
                status_code=404,
                request_id=request_id
            )
        # Converter para dict usando serialize_data
        from app.core.response import serialize_data
        lead_dict = serialize_data(obj)
        return success_response(data=lead_dict, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao buscar lead {lead_id}: {str(e)}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="INTERNAL_ERROR",
            message="Erro ao buscar lead",
            status_code=500,
            request_id=request_id
        )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_lead(
    request: Request,
    data: LeadCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Cria um novo lead.
    Valida payload com Pydantic -> 400 com details se inválido.
    Retorna 409 se lead duplicado (mesmo email).
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Validação Pydantic já é feita automaticamente pelo FastAPI
        # Verificar se email já existe (duplicado)
        if data.email:
            existing = db.query(Lead).filter(Lead.email == data.email).first()
            if existing:
                return error_response(
                    code="LEAD_DUPLICATE",
                    message=f"Lead com email {data.email} já existe",
                    details={"existing_lead_id": existing.id},
                    status_code=409,
                    request_id=request_id
                )
        
        # Criar lead
        obj = Lead(**data.model_dump(), criado_por_id=current_user.id)
        if not obj.responsavel_id:
            obj.responsavel_id = current_user.id
        db.add(obj)
        db.commit()
        db.refresh(obj)
        
        # Converter para dict
        lead_dict = {k: v for k, v in obj.__dict__.items() if not k.startswith("_")}
        return success_response(data=lead_dict, request_id=request_id, status_code=status.HTTP_201_CREATED)
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
        logger.error(f"Erro ao criar lead: {str(e)}", exc_info=True, extra={"request_id": request_id})
        db.rollback()
        return error_response(
            code="CREATE_ERROR",
            message=f"Erro ao criar lead: {str(e)}",
            status_code=500,
            request_id=request_id
        )


@router.patch("/{lead_id}")
def update_lead(
    request: Request,
    lead_id: uuid.UUID,
    data: LeadUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Atualiza um lead existente.
    Valida payload com Pydantic -> 400 com details se inválido.
    Retorna 404 se lead não encontrado.
    Retorna 409 se email duplicado.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        obj = db.query(Lead).filter(Lead.id == lead_id).first()
        if not obj:
            return error_response(
                code="LEAD_NOT_FOUND",
                message=f"Lead com ID {lead_id} não encontrado",
                status_code=404,
                request_id=request_id
            )
        
        # Verificar se email está sendo atualizado e se já existe em outro lead
        update_data = data.model_dump(exclude_unset=True)
        if "email" in update_data and update_data["email"]:
            existing = db.query(Lead).filter(
                Lead.email == update_data["email"],
                Lead.id != lead_id
            ).first()
            if existing:
                return error_response(
                    code="LEAD_DUPLICATE",
                    message=f"Lead com email {update_data['email']} já existe",
                    details={"existing_lead_id": existing.id},
                    status_code=409,
                    request_id=request_id
                )
        
        # Atualizar campos
        for k, v in update_data.items():
            setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        
        # Converter para dict usando serialize_data
        from app.core.response import serialize_data
        lead_dict = serialize_data(obj)
        return success_response(data=lead_dict, request_id=request_id)
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
        logger.error(f"Erro ao atualizar lead {lead_id}: {str(e)}", exc_info=True, extra={"request_id": request_id})
        db.rollback()
        return error_response(
            code="UPDATE_ERROR",
            message=f"Erro ao atualizar lead: {str(e)}",
            status_code=500,
            request_id=request_id
        )


@router.delete("/{lead_id}")
def delete_lead(
    request: Request,
    lead_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Deleta um lead.
    Retorna 404 se lead não encontrado.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        obj = db.query(Lead).filter(Lead.id == lead_id).first()
        if not obj:
            return error_response(
                code="LEAD_NOT_FOUND",
                message=f"Lead com ID {lead_id} não encontrado",
                status_code=404,
                request_id=request_id
            )
        db.delete(obj)
        db.commit()
        return success_response(data={"deleted": True, "lead_id": lead_id}, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao deletar lead {lead_id}: {str(e)}", exc_info=True, extra={"request_id": request_id})
        db.rollback()
        return error_response(
            code="DELETE_ERROR",
            message=f"Erro ao deletar lead: {str(e)}",
            status_code=500,
            request_id=request_id
        )


# ──────────────────── Prospecção via IA ────────────────────

@router.post("/{lead_id}/prospect")
async def prospect_lead(
    request: Request,
    lead_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Inicia prospecção via IA: gera mensagem com OpenAI e envia via WhatsApp.
    Usa o primeiro agente ativo com conexão WhatsApp configurada.
    """
    request_id = getattr(request.state, "request_id", None)
    logger.info(f"[PROSPECT] Iniciando prospecção para lead {lead_id}")

    try:
        # 1) Buscar lead
        lead = db.query(Lead).filter(Lead.id == lead_id).first()
        if not lead:
            return error_response(code="LEAD_NOT_FOUND", message="Lead não encontrado", status_code=404, request_id=request_id)

        phone = lead.whatsapp or lead.telefone
        if not phone:
            return error_response(
                code="NO_PHONE",
                message="O lead não possui WhatsApp ou telefone cadastrado.",
                status_code=400,
                request_id=request_id,
            )
        # Se o lead não tem whatsapp preenchido, preenche com o telefone usado
        if not lead.whatsapp and lead.telefone:
            lead.whatsapp = lead.telefone
            logger.info(f"[PROSPECT] Campo whatsapp do lead preenchido automaticamente: {lead.telefone}")
        logger.info(f"[PROSPECT] Lead: {lead.nome} | whatsapp: {lead.whatsapp} | telefone: {lead.telefone}")

        # 2) Buscar agente ativo com WhatsApp
        agent = (
            db.query(AIAgent)
            .filter(AIAgent.is_active == True, AIAgent.whatsapp_connection_id.isnot(None))
            .first()
        )
        if not agent:
            return error_response(
                code="NO_AGENT",
                message="Nenhum agente de IA ativo com conexão WhatsApp encontrado. Configure um agente em Agentes de IA.",
                status_code=400,
                request_id=request_id,
            )
        logger.info(f"[PROSPECT] Agente: {agent.name} (model={agent.model})")

        # 3) Buscar conexão WhatsApp
        wa_conn = db.query(WhatsAppConnection).filter(WhatsAppConnection.id == agent.whatsapp_connection_id).first()
        if not wa_conn or wa_conn.status != "connected":
            return error_response(
                code="WA_NOT_CONNECTED",
                message="A conexão WhatsApp do agente não está conectada.",
                status_code=400,
                request_id=request_id,
            )
        logger.info(f"[PROSPECT] WhatsApp: {wa_conn.name} (instância={wa_conn.instance_name})")

        # 4) Gerar mensagem com OpenAI
        openai_key = settings.OPENAI_API_KEY or ""
        if not openai_key:
            return error_response(code="CONFIG_ERROR", message="OPENAI_API_KEY não configurada.", status_code=500, request_id=request_id)

        lead_context = (
            f"Dados do lead para prospecção:\n"
            f"- Nome: {lead.nome}\n"
            f"- Empresa: {lead.empresa or 'Não informada'}\n"
            f"- Cargo: {lead.cargo or 'Não informado'}\n"
            f"- Cidade: {lead.cidade or 'Não informada'}, {lead.estado or ''}\n"
            f"- Interesse: {lead.interesse or 'Não informado'}\n"
            f"- Necessidade: {lead.necessidade or 'Não informada'}\n"
            f"- Origem: {lead.origem or 'Não informada'}\n\n"
            f"Gere uma mensagem inicial de prospecção para enviar via WhatsApp. "
            f"Seja profissional, educado e direto. A mensagem deve ser curta (máximo 3 parágrafos)."
        )

        svc_ai = OpenAIAgentService(api_key=openai_key)
        ai_result = await svc_ai.create_chat_completion(
            system_prompt=agent.system_prompt,
            messages=[{"role": "user", "content": lead_context}],
            model=agent.model,
            temperature=agent.temperature,
            max_tokens=agent.max_tokens,
        )
        message_text = ai_result["response"]
        logger.info(f"[PROSPECT] Mensagem gerada ({len(message_text)} chars): {message_text[:100]}...")

        # 5) Enviar via WhatsApp
        svc_wa = EvolutionAPIService(api_url=wa_conn.api_url, api_key=wa_conn.api_key)

        # Verificar se já existe uma conversa ativa com este lead - reutilizar (como WhatsApp real)
        existing_conv = (
            db.query(LeadConversation)
            .filter(
                LeadConversation.lead_id == lead_id,
                LeadConversation.status == "active",
            )
            .first()
        )

        # Se existe conversa ativa, usar o remote_jid (LID) salvo para enviar
        send_to = phone
        if existing_conv and existing_conv.remote_jid:
            send_to = existing_conv.remote_jid
            logger.info(f"[PROSPECT] Usando remote_jid da conversa existente: {send_to}")

        wa_result = await svc_wa.send_message(
            instance_name=wa_conn.instance_name,
            phone=send_to,
            text=message_text,
        )
        wa_msg_id = wa_result.get("key", {}).get("id")
        wa_remote_jid = wa_result.get("key", {}).get("remoteJid", "")
        logger.info(f"[PROSPECT] Mensagem enviada! msg_id={wa_msg_id}, remoteJid={wa_remote_jid}")
        logger.info(f"[PROSPECT] wa_result completo: {wa_result}")

        # 6) Reutilizar conversa existente ou criar nova
        if existing_conv:
            conversation = existing_conv
            conversation.agent_id = agent.id
            conversation.whatsapp_connection_id = wa_conn.id
            # Atualizar remote_jid se veio um novo (ex: LID da Meta)
            if wa_remote_jid:
                conversation.remote_jid = wa_remote_jid
                logger.info(f"[PROSPECT] remote_jid atualizado: {wa_remote_jid}")
            logger.info(f"[PROSPECT] Reutilizando conversa existente: {conversation.id}")
        else:
            conversation = LeadConversation(
                lead_id=lead_id,
                agent_id=agent.id,
                whatsapp_connection_id=wa_conn.id,
                remote_jid=wa_remote_jid or None,
                status="active",
            )
            db.add(conversation)
            db.flush()
            logger.info(f"[PROSPECT] Nova conversa criada: {conversation.id}, remote_jid={wa_remote_jid}")

        msg = LeadMessage(
            conversation_id=conversation.id,
            role="agent",
            content=message_text,
            sent_via="whatsapp",
            whatsapp_message_id=wa_msg_id,
        )
        db.add(msg)

        # 7) Atualizar lead
        lead.status = "contatado"
        lead.ultimo_contato = datetime.now(timezone.utc)

        db.commit()
        logger.info(f"[PROSPECT] Conversa {conversation.id} atualizada. Lead atualizado para 'contatado'.")

        return success_response(
            data={
                "conversation_id": str(conversation.id),
                "agent_name": agent.name,
                "message_sent": message_text,
                "phone": phone,
                "whatsapp_message_id": wa_msg_id,
            },
            request_id=request_id,
        )

    except Exception as e:
        logger.error(f"[PROSPECT] Erro na prospecção do lead {lead_id}: {e}", exc_info=True)
        db.rollback()
        return error_response(code="PROSPECT_ERROR", message=str(e), status_code=500, request_id=request_id)


# ──────────────────── Conversas do Lead ────────────────────

@router.get("/{lead_id}/conversations")
def list_lead_conversations(
    request: Request,
    lead_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Lista todas as conversas de prospecção de um lead, com mensagens."""
    request_id = getattr(request.state, "request_id", None)
    try:
        conversations = (
            db.query(LeadConversation)
            .filter(LeadConversation.lead_id == lead_id)
            .order_by(desc(LeadConversation.started_at))
            .all()
        )

        result = []
        for conv in conversations:
            conv_data = serialize_data(conv)
            # Buscar mensagens
            messages = (
                db.query(LeadMessage)
                .filter(LeadMessage.conversation_id == conv.id)
                .order_by(LeadMessage.created_at)
                .all()
            )
            conv_data["messages"] = [serialize_data(m) for m in messages]
            # Nome do agente
            if conv.agent:
                conv_data["agent_name"] = conv.agent.name
            else:
                conv_data["agent_name"] = None
            result.append(conv_data)

        return success_response(data=result, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao listar conversas do lead {lead_id}: {e}", exc_info=True)
        return success_response(data=[], request_id=request_id)
