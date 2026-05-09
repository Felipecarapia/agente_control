import json
import re
import uuid
import logging
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.response import success_response, error_response, serialize_data
from app.models.whatsapp import WhatsAppConnection
from app.models.lead import Lead, LeadConversation, LeadMessage
from app.models.campaign import CampaignLead, CampaignLeadConversation, CampaignLeadMessage
from app.models.agent import AIAgent
from app.models.usuario import Usuario
from app.models.tenant import Tenant
from app.schemas.whatsapp import (
    WhatsAppConnectionCreate,
    WhatsAppConnectionUpdate,
    WhatsAppConnectionResponse,
)
from app.services.evolution_api import EvolutionAPIService
from app.services.openai_agent import OpenAIAgentService
from app.core.config import settings
from app.core.rbac import require_feature
from app.core.plans import PLAN_LIMITS, PLAN_FEATURES

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


# ──────────────────── CRUD ────────────────────

@router.get("/module-info")
def whatsapp_module_info(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Retorna status do módulo WhatsApp para o tenant (feature, limite e uso atual)."""
    request_id = getattr(request.state, "request_id", None)
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        return error_response(code="TENANT_NOT_FOUND", message="Tenant não encontrado", status_code=404, request_id=request_id)

    plan_key = str(tenant.plano)
    features = PLAN_FEATURES.get(plan_key, set())
    limits = PLAN_LIMITS.get(plan_key, {})
    current_connections = db.query(WhatsAppConnection).filter(WhatsAppConnection.tenant_id == current_user.tenant_id).count()
    max_connections = limits.get("whatsapp_connections", 0)

    return success_response(
        data={
            "enabled": "whatsapp_automation" in features,
            "plan": plan_key,
            "limits": {"whatsapp_connections": max_connections},
            "usage": {"whatsapp_connections": current_connections},
        },
        request_id=request_id,
    )

@router.get("/connections")
def list_connections(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Lista todas as conexões WhatsApp."""
    request_id = getattr(request.state, "request_id", None)
    try:
        tenant_id = current_user.tenant_id
        connections = db.query(WhatsAppConnection).filter(WhatsAppConnection.tenant_id == tenant_id).order_by(WhatsAppConnection.created_at.desc()).all()
        data = [serialize_data(c) for c in connections]
        return success_response(data=data, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao listar conexões WhatsApp: {e}", exc_info=True)
        return success_response(data=[], request_id=request_id)


@router.post("/connections", status_code=status.HTTP_201_CREATED)
def create_connection(
    request: Request,
    data: WhatsAppConnectionCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_feature("whatsapp_automation"))],
):
    """Cria uma nova conexão WhatsApp."""
    request_id = getattr(request.state, "request_id", None)
    try:
        tenant_id = current_user.tenant_id
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        limits = PLAN_LIMITS.get(str(tenant.plano), {})
        max_connections = limits.get("whatsapp_connections", 0)
        current_connections = db.query(WhatsAppConnection).filter(WhatsAppConnection.tenant_id == tenant_id).count()
        if current_connections >= max_connections:
            return error_response(
                code="PLAN_LIMIT",
                message=f"Limite de conexões WhatsApp do plano atingido ({max_connections})",
                status_code=403,
                request_id=request_id,
            )

        obj = WhatsAppConnection(
            **data.model_dump(),
            tenant_id=tenant_id,
            created_by_user_id=current_user.id,
        )
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return success_response(data=serialize_data(obj), request_id=request_id, status_code=201)
    except Exception as e:
        logger.error(f"Erro ao criar conexão WhatsApp: {e}", exc_info=True)
        db.rollback()
        return error_response(
            code="CREATE_ERROR",
            message=f"Erro ao criar conexão: {str(e)}",
            status_code=500,
            request_id=request_id,
        )


@router.get("/connections/{connection_id}")
def get_connection(
    request: Request,
    connection_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Busca uma conexão pelo ID."""
    request_id = getattr(request.state, "request_id", None)
    tenant_id = current_user.tenant_id
    obj = db.query(WhatsAppConnection).filter(WhatsAppConnection.id == connection_id, WhatsAppConnection.tenant_id == tenant_id).first()
    if not obj:
        return error_response(code="NOT_FOUND", message="Conexão não encontrada", status_code=404, request_id=request_id)
    return success_response(data=serialize_data(obj), request_id=request_id)


@router.put("/connections/{connection_id}")
def update_connection(
    request: Request,
    connection_id: uuid.UUID,
    data: WhatsAppConnectionUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Atualiza uma conexão WhatsApp."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = db.query(WhatsAppConnection).filter(WhatsAppConnection.id == connection_id, WhatsAppConnection.tenant_id == current_user.tenant_id).first()
        if not obj:
            return error_response(code="NOT_FOUND", message="Conexão não encontrada", status_code=404, request_id=request_id)
        update_data = data.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        return success_response(data=serialize_data(obj), request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao atualizar conexão WhatsApp: {e}", exc_info=True)
        db.rollback()
        return error_response(code="UPDATE_ERROR", message=str(e), status_code=500, request_id=request_id)


@router.delete("/connections/{connection_id}")
def delete_connection(
    request: Request,
    connection_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Deleta uma conexão WhatsApp."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = db.query(WhatsAppConnection).filter(WhatsAppConnection.id == connection_id, WhatsAppConnection.tenant_id == current_user.tenant_id).first()
        if not obj:
            return error_response(code="NOT_FOUND", message="Conexão não encontrada", status_code=404, request_id=request_id)
        db.delete(obj)
        db.commit()
        return success_response(data={"deleted": True}, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao deletar conexão WhatsApp: {e}", exc_info=True)
        db.rollback()
        return error_response(code="DELETE_ERROR", message=str(e), status_code=500, request_id=request_id)


# ──────────────────── Ações (Connect / Status / Disconnect) ────────────────────

@router.post("/connections/{connection_id}/connect")
async def connect_instance(
    request: Request,
    connection_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Inicia conexão com a instância WhatsApp — retorna QR Code."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = db.query(WhatsAppConnection).filter(WhatsAppConnection.id == connection_id, WhatsAppConnection.tenant_id == current_user.tenant_id).first()
        if not obj:
            return error_response(code="NOT_FOUND", message="Conexão não encontrada", status_code=404, request_id=request_id)

        if obj.provider == "evolution":
            svc = EvolutionAPIService(api_url=obj.api_url, api_key=obj.api_key)
            instance_name = obj.instance_name or f"crm_{obj.id.hex[:8]}"

            # Cria instância se necessário
            try:
                await svc.create_instance(instance_name, obj.phone_number)
            except Exception:
                pass  # instância pode já existir

            # Configura webhook se houver
            if obj.webhook_url:
                try:
                    await svc.set_webhook(instance_name, obj.webhook_url)
                except Exception as wh_err:
                    logger.warning(f"Falha ao configurar webhook: {wh_err}")

            # Obtém QR Code
            qr_data = await svc.get_qrcode(instance_name)

            obj.instance_name = instance_name
            obj.status = "connecting"
            db.commit()
            db.refresh(obj)

            return success_response(
                data={
                    "qr_code": qr_data.get("base64") or qr_data.get("qrcode", {}).get("base64"),
                    "status": "connecting",
                    "instance_name": instance_name,
                },
                request_id=request_id,
            )
        else:
            # API Oficial — não usa QR code; conexão configurada via Meta Business
            obj.status = "connected"
            db.commit()
            return success_response(
                data={"status": "connected", "message": "API Oficial conectada via configuração Meta Business."},
                request_id=request_id,
            )

    except Exception as e:
        logger.error(f"Erro ao conectar instância WhatsApp: {e}", exc_info=True)
        return error_response(code="CONNECT_ERROR", message=str(e), status_code=500, request_id=request_id)


@router.get("/connections/{connection_id}/status")
async def connection_status(
    request: Request,
    connection_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Verifica status em tempo real da conexão WhatsApp."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = db.query(WhatsAppConnection).filter(WhatsAppConnection.id == connection_id, WhatsAppConnection.tenant_id == current_user.tenant_id).first()
        if not obj:
            return error_response(code="NOT_FOUND", message="Conexão não encontrada", status_code=404, request_id=request_id)

        if obj.provider == "evolution" and obj.instance_name:
            svc = EvolutionAPIService(api_url=obj.api_url, api_key=obj.api_key)
            status_data = await svc.get_connection_status(obj.instance_name)
            state = status_data.get("state") or status_data.get("instance", {}).get("state", "unknown")

            status_map = {"open": "connected", "close": "disconnected", "connecting": "connecting"}
            new_status = status_map.get(state, obj.status)
            if new_status != obj.status:
                obj.status = new_status
                db.commit()

            return success_response(
                data={"id": str(obj.id), "status": new_status, "instance_name": obj.instance_name, "phone_number": obj.phone_number},
                request_id=request_id,
            )
        else:
            return success_response(
                data={"id": str(obj.id), "status": obj.status, "phone_number": obj.phone_number},
                request_id=request_id,
            )

    except Exception as e:
        logger.error(f"Erro ao verificar status: {e}", exc_info=True)
        return error_response(code="STATUS_ERROR", message=str(e), status_code=500, request_id=request_id)


@router.post("/connections/{connection_id}/disconnect")
async def disconnect_instance(
    request: Request,
    connection_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Desconecta a instância WhatsApp."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = db.query(WhatsAppConnection).filter(WhatsAppConnection.id == connection_id, WhatsAppConnection.tenant_id == current_user.tenant_id).first()
        if not obj:
            return error_response(code="NOT_FOUND", message="Conexão não encontrada", status_code=404, request_id=request_id)

        if obj.provider == "evolution" and obj.instance_name:
            svc = EvolutionAPIService(api_url=obj.api_url, api_key=obj.api_key)
            await svc.disconnect_instance(obj.instance_name)

        obj.status = "disconnected"
        db.commit()
        return success_response(data={"status": "disconnected"}, request_id=request_id)

    except Exception as e:
        logger.error(f"Erro ao desconectar: {e}", exc_info=True)
        return error_response(code="DISCONNECT_ERROR", message=str(e), status_code=500, request_id=request_id)


# ──────────────────── Webhook ────────────────────

@router.post("/webhook")
async def whatsapp_webhook(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
):
    """Recebe eventos do webhook da Evolution API ou API Oficial."""
    try:
        body = await request.json()
        logger.info(f"[WEBHOOK] ===== Payload completo: {json.dumps(body, default=str, ensure_ascii=False)[:2000]}")

        # Evolution API pode mandar o evento em diferentes campos
        event = body.get("event", "") or ""
        instance = body.get("instance", "") or ""

        # Algumas versões da Evolution API usam campos diferentes
        # A v2 pode usar "instance" como string ou objeto
        if isinstance(instance, dict):
            instance = instance.get("instanceName", "") or instance.get("instance", "")

        logger.info(f"[WEBHOOK] event={event}, instance={instance}")

        if event == "connection.update":
            state = body.get("data", {}).get("state", "")
            if instance:
                conn = db.query(WhatsAppConnection).filter(WhatsAppConnection.instance_name == instance).first()
                if conn:
                    status_map = {"open": "connected", "close": "disconnected", "connecting": "connecting"}
                    conn.status = status_map.get(state, conn.status)
                    db.commit()

        # Identificar o Tenant dono desta instância
        tenant = None
        if instance:
            tenant = db.query(Tenant).filter(Tenant.evolution_instance_name == instance).first()
        
        if not tenant:
            logger.warning(f"[WEBHOOK] Tenant não encontrado para instância: {instance}")
            return success_response(data={"received": True})

        tenant_id = tenant.id

        if event in ("messages.upsert", "MESSAGES_UPSERT", "messages.update"):
            # Evolution API v1 e v2 podem ter estruturas diferentes
            data = body.get("data", {})

            # v2: data pode ser um dict direto ou uma lista
            if isinstance(data, list):
                messages_list = data
            elif isinstance(data, dict):
                messages_list = [data]
            else:
                messages_list = []

            # Campo "sender" pode estar no nível raiz do body (Evolution API com Meta/Cloud API)
            # Formato: "5514981432821@s.whatsapp.net"
            root_sender = body.get("sender", "")

            for message_data in messages_list:
                # Extrair key - pode estar no nível superior ou aninhado
                key = message_data.get("key", {})
                remote_jid = key.get("remoteJid", "")
                from_me = key.get("fromMe", False)

                # Extrair texto - vários formatos possíveis
                msg_obj = message_data.get("message", {}) or {}
                msg_text = (
                    msg_obj.get("conversation")
                    or msg_obj.get("extendedTextMessage", {}).get("text")
                    or msg_obj.get("text")
                    or message_data.get("body", "")
                    or ""
                )

                logger.info(f"[WEBHOOK] Mensagem: instance={instance}, remoteJid={remote_jid}, sender={root_sender}, fromMe={from_me}, text='{msg_text[:100] if msg_text else ''}'")

                # Ignorar mensagens enviadas por nós (fromMe=true) ou vazias
                if from_me or not msg_text:
                    logger.info(f"[WEBHOOK] Ignorando: fromMe={from_me}, text vazio={not msg_text}")
                    continue

                # Extrair número do remetente
                # Quando a Meta WhatsApp Cloud API é usada, remoteJid vem como "@lid" (Lead ID)
                # Nesse caso, o telefone real vem no campo "sender" do payload raiz
                if "@lid" in remote_jid and root_sender:
                    sender_jid = root_sender
                    logger.info(f"[WEBHOOK] remoteJid é LID, usando campo sender: {sender_jid}")
                else:
                    sender_jid = remote_jid

                sender_phone = sender_jid.replace("@s.whatsapp.net", "").replace("@c.us", "").replace("@g.us", "").replace("@lid", "")
                logger.info(f"[WEBHOOK] Telefone remetente: {sender_phone}")

                # Normalizar para busca: extrair só dígitos finais (sem código do país)
                sender_digits = re.sub(r"\D", "", sender_phone)
                # Se começa com 55, pega sem o 55 para comparar
                sender_local = sender_digits[2:] if sender_digits.startswith("55") and len(sender_digits) > 10 else sender_digits
                logger.info(f"[WEBHOOK] Dígitos: full={sender_digits}, local={sender_local}")

                # Buscar conversa ativa
                conversation = None

                # Estratégia 1: Match por LID/remoteJid exato
                if remote_jid:
                    conversation = (
                        db.query(LeadConversation)
                        .filter(
                            LeadConversation.tenant_id == tenant_id,
                            LeadConversation.status == "active",
                            LeadConversation.remote_jid == remote_jid,
                        )
                        .first()
                    )
                    if conversation:
                        logger.info(f"[WEBHOOK] ✅ Match por LID/remoteJid: {remote_jid} -> conv={conversation.id}, lead={conversation.lead.nome}")

                # Estratégia 2: Match por telefone
                if not conversation:
                    all_active_convs = (
                        db.query(LeadConversation)
                        .join(Lead, Lead.id == LeadConversation.lead_id)
                        .filter(
                            LeadConversation.tenant_id == tenant_id,
                            LeadConversation.status == "active"
                        )
                        .all()
                    )

                    def last_n_digits(phone_str: str, n: int = 8) -> str:
                        digits = re.sub(r"\D", "", phone_str or "")
                        return digits[-n:] if len(digits) >= n else digits

                    sender_tail = last_n_digits(sender_phone, 8)
                    logger.info(f"[WEBHOOK] Sem match por LID, tentando por telefone: sender_tail={sender_tail}")

                    for conv in all_active_convs:
                        lead = conv.lead
                        lead_wa_tail = last_n_digits(lead.whatsapp, 8)
                        lead_tel_tail = last_n_digits(lead.telefone, 8)

                        if sender_tail and (
                            (lead_wa_tail and lead_wa_tail == sender_tail)
                            or (lead_tel_tail and lead_tel_tail == sender_tail)
                        ):
                            conversation = conv
                            logger.info(f"[WEBHOOK] ✅ Match por telefone! lead={lead.nome}")
                            break

                # Estratégia 3: Match por instância WhatsApp (Meta Cloud API converte phone -> LID)
                # Se a msg chegou na mesma instância que a conversa usa, e é a mais recente
                if not conversation and instance:
                    wa_conn = (
                        db.query(WhatsAppConnection)
                        .filter(WhatsAppConnection.instance_name == instance)
                        .first()
                    )
                    if wa_conn:
                        instance_conv = (
                            db.query(LeadConversation)
                            .filter(
                                LeadConversation.status == "active",
                                LeadConversation.whatsapp_connection_id == wa_conn.id,
                            )
                            .order_by(LeadConversation.started_at.desc())
                            .first()
                        )
                        if instance_conv:
                            conversation = instance_conv
                            logger.info(f"[WEBHOOK] ✅ Match por instância! instance={instance}, conv={conversation.id}, lead={conversation.lead.nome}")

                if conversation:
                    logger.info(f"[WEBHOOK] Conversa ativa encontrada: {conversation.id} (lead={conversation.lead_id})")

                    # Sempre atualizar o remote_jid com o LID mais recente
                    # A Meta pode mudar de phone JID para LID entre envio e recebimento
                    if remote_jid and conversation.remote_jid != remote_jid:
                        old_jid = conversation.remote_jid
                        conversation.remote_jid = remote_jid
                        logger.info(f"[WEBHOOK] remote_jid atualizado: {old_jid} -> {remote_jid}")

                    # Salvar mensagem do lead
                    lead_msg = LeadMessage(
                        tenant_id=tenant_id,
                        conversation_id=conversation.id,
                        role="lead",
                        content=msg_text,
                        sent_via="whatsapp",
                    )
                    db.add(lead_msg)
                    db.flush()
                    logger.info(f"[WEBHOOK] Mensagem do lead salva! id={lead_msg.id}")

                    # Gerar resposta da IA
                    agent = conversation.agent
                    if agent:
                        try:
                            from app.services.sofia_agent.executor import get_agent_executor
                            from langchain_community.callbacks.manager import get_openai_callback
                            from app.models.agent import AgentLog
                            
                            # Note: The 'msg_text' is already saved in the DB by whatsapp.py above.
                            # The executor will use this input to run the LangChain agent.
                            executor = await get_agent_executor(tenant, lead, conversation, db)
                            
                            logger.info(f"[WEBHOOK] Invocando Sofia Agent para msg: '{msg_text[:50]}...'")
                            with get_openai_callback() as cb:
                                ai_result = await executor.ainvoke({"input": msg_text})
                                tokens = cb.total_tokens
                            
                            reply_text = ai_result.get("output", "")
                            
                            # Salvar log do agente
                            agent_log = AgentLog(
                                tenant_id=tenant_id,
                                agent_id=agent.id,
                                lead_id=lead.id,
                                action="RESPOND_MESSAGE",
                                details=f"Input: {msg_text}\\nOutput: {reply_text}",
                                tokens_used=tokens
                            )
                            db.add(agent_log)
                            db.commit()
                            
                            logger.info(f"[WEBHOOK] Sofia Agent respondeu ({len(reply_text)} chars). Tokens: {tokens}")

                            # Enviar resposta via WhatsApp
                            # Tentar LID primeiro (remoteJid), fallback para telefone do lead
                            wa_conn = conversation.whatsapp_connection
                            if wa_conn and wa_conn.instance_name:
                                lead = conversation.lead
                                lead_phone = lead.whatsapp or lead.telefone or sender_phone
                                reply_to = remote_jid if ("@lid" in remote_jid) else lead_phone
                                logger.info(f"[WEBHOOK] Enviando resposta para: {reply_to} (lid={remote_jid}, lead_phone={lead_phone})")

                                svc_wa = EvolutionAPIService(api_url=wa_conn.api_url, api_key=wa_conn.api_key)
                                try:
                                    wa_result = await svc_wa.send_message(
                                        instance_name=wa_conn.instance_name,
                                        phone=reply_to,
                                        text=reply_text,
                                    )
                                except Exception as send_err:
                                    # Se LID falhou, tenta com telefone do lead
                                    if "@lid" in reply_to and lead_phone != reply_to:
                                        logger.warning(f"[WEBHOOK] Envio por LID falhou, tentando por telefone: {lead_phone}")
                                        wa_result = await svc_wa.send_message(
                                            instance_name=wa_conn.instance_name,
                                            phone=lead_phone,
                                            text=reply_text,
                                        )
                                    else:
                                        raise send_err
                                wa_msg_id = wa_result.get("key", {}).get("id")

                                # Salvar resposta do agente
                                agent_msg = LeadMessage(
                                    tenant_id=tenant_id,
                                    conversation_id=conversation.id,
                                    role="agent",
                                    content=reply_text,
                                    sent_via="whatsapp",
                                    whatsapp_message_id=wa_msg_id,
                                )
                                db.add(agent_msg)
                                logger.info(f"[WEBHOOK] Resposta do agente enviada e salva!")

                        except Exception as ai_err:
                            logger.error(f"[WEBHOOK] Erro ao processar IA: {ai_err}", exc_info=True)

                    db.commit()
                else:
                    # ── Verificar CampaignLeadConversation ──
                    campaign_conv = None

                    # Estratégia 1: Match por remote_jid
                    if remote_jid:
                        campaign_conv = (
                            db.query(CampaignLeadConversation)
                            .filter(
                                CampaignLeadConversation.tenant_id == tenant_id,
                                CampaignLeadConversation.status == "active",
                                CampaignLeadConversation.remote_jid == remote_jid,
                            )
                            .first()
                        )
                        if campaign_conv:
                            logger.info(f"[WEBHOOK] ✅ Campaign conv match por LID: {remote_jid} -> conv={campaign_conv.id}")

                    # Estratégia 2: Match por telefone do campaign lead
                    if not campaign_conv:
                        all_campaign_convs = (
                            db.query(CampaignLeadConversation)
                            .join(CampaignLead, CampaignLead.id == CampaignLeadConversation.campaign_lead_id)
                            .filter(
                                CampaignLeadConversation.tenant_id == tenant_id,
                                CampaignLeadConversation.status == "active"
                            )
                            .all()
                        )

                        def last_n_digits(phone_str: str, n: int = 8) -> str:
                            digits = re.sub(r"\D", "", phone_str or "")
                            return digits[-n:] if len(digits) >= n else digits

                        sender_tail = last_n_digits(sender_phone, 8)
                        for cconv in all_campaign_convs:
                            cl = cconv.campaign_lead
                            if cl and cl.phone:
                                cl_tail = last_n_digits(cl.phone, 8)
                                if sender_tail and cl_tail and cl_tail == sender_tail:
                                    campaign_conv = cconv
                                    logger.info(f"[WEBHOOK] ✅ Campaign conv match por telefone: {cl.business_name}")
                                    break

                    # Estratégia 3: Match por instância WhatsApp
                    if not campaign_conv and instance:
                        wa_conn = (
                            db.query(WhatsAppConnection)
                            .filter(WhatsAppConnection.instance_name == instance)
                            .first()
                        )
                        if wa_conn:
                            campaign_conv = (
                                db.query(CampaignLeadConversation)
                                .filter(
                                    CampaignLeadConversation.status == "active",
                                    CampaignLeadConversation.whatsapp_connection_id == wa_conn.id,
                                )
                                .order_by(CampaignLeadConversation.started_at.desc())
                                .first()
                            )
                            if campaign_conv:
                                logger.info(f"[WEBHOOK] ✅ Campaign conv match por instância: {instance}")

                    if campaign_conv:
                        logger.info(f"[WEBHOOK] Campaign conversa encontrada: {campaign_conv.id}")

                        # Atualizar remote_jid
                        if remote_jid and campaign_conv.remote_jid != remote_jid:
                            campaign_conv.remote_jid = remote_jid

                        # Salvar mensagem do lead
                        camp_msg = CampaignLeadMessage(
                            tenant_id=tenant_id,
                            conversation_id=campaign_conv.id,
                            role="lead",
                            content=msg_text,
                            sent_via="whatsapp",
                        )
                        db.add(camp_msg)
                        campaign_conv.message_count = (campaign_conv.message_count or 0) + 1
                        db.flush()

                        # Detectar interesse
                        INTEREST_KEYWORDS = ["sim", "quero", "interesse", "agendar", "orcamento", "orçamento", "gostaria", "preciso", "aceito"]
                        msg_lower = msg_text.lower()
                        if any(kw in msg_lower for kw in INTEREST_KEYWORDS):
                            campaign_conv.interest_detected = True
                            logger.info(f"[WEBHOOK] 🎯 Interesse detectado! msg='{msg_text[:50]}'")

                        # Auto-conversão: interest_detected + message_count >= 3
                        if campaign_conv.interest_detected and campaign_conv.message_count >= 3:
                            if campaign_conv.status != "converted":
                                campaign_conv.status = "converted"
                                cl = campaign_conv.campaign_lead
                                if cl and cl.status != "converted":
                                    from app.models.lead import Lead as CRMLead
                                    crm_lead = CRMLead(
                                        nome=cl.business_name,
                                        email=cl.email,
                                        telefone=cl.phone,
                                        whatsapp=cl.phone,
                                        empresa=cl.business_name,
                                        cidade=cl.city,
                                        estado=cl.state,
                                        site=cl.website,
                                        origem="campanha",
                                        origem_detalhe=f"Campanha outreach (auto-convertido)",
                                        status="novo",
                                        temperatura="quente",
                                    )
                                    db.add(crm_lead)
                                    cl.status = "converted"
                                    logger.info(f"[WEBHOOK] 🔄 Lead auto-convertido: {cl.business_name}")

                        # Gerar resposta IA
                        agent = campaign_conv.agent
                        if agent:
                            openai_key = tenant.openai_api_key or settings.OPENAI_API_KEY or ""
                            system_prompt = tenant.system_prompt or agent.system_prompt
                            if openai_key:
                                try:
                                    prev_msgs = (
                                        db.query(CampaignLeadMessage)
                                        .filter(CampaignLeadMessage.conversation_id == campaign_conv.id)
                                        .order_by(CampaignLeadMessage.created_at)
                                        .all()
                                    )
                                    history = []
                                    for pm in prev_msgs:
                                        role = "assistant" if pm.role == "agent" else "user"
                                        history.append({"role": role, "content": pm.content})

                                    svc_ai = OpenAIAgentService(api_key=openai_key)
                                    ai_result = await svc_ai.create_chat_completion(
                                        system_prompt=system_prompt,
                                        messages=history,
                                        model=agent.model,
                                        temperature=agent.temperature,
                                        max_tokens=agent.max_tokens,
                                    )
                                    reply_text = ai_result["response"]
                                    logger.info(f"[WEBHOOK] Campaign IA respondeu ({len(reply_text)} chars)")

                                    wa_conn = campaign_conv.whatsapp_connection
                                    if wa_conn and wa_conn.instance_name:
                                        cl = campaign_conv.campaign_lead
                                        cl_phone = cl.phone if cl else sender_phone
                                        reply_to = remote_jid if ("@lid" in remote_jid) else cl_phone
                                        logger.info(f"[WEBHOOK] Campaign enviando resposta para: {reply_to}")

                                        svc_wa = EvolutionAPIService(api_url=wa_conn.api_url, api_key=wa_conn.api_key)
                                        try:
                                            wa_result = await svc_wa.send_message(
                                                instance_name=wa_conn.instance_name,
                                                phone=reply_to,
                                                text=reply_text,
                                            )
                                        except Exception as send_err:
                                            if "@lid" in reply_to and cl_phone != reply_to:
                                                wa_result = await svc_wa.send_message(
                                                    instance_name=wa_conn.instance_name,
                                                    phone=cl_phone,
                                                    text=reply_text,
                                                )
                                            else:
                                                raise send_err

                                        wa_msg_id = wa_result.get("key", {}).get("id")
                                        agent_msg = CampaignLeadMessage(
                                            tenant_id=tenant_id,
                                            conversation_id=campaign_conv.id,
                                            role="agent",
                                            content=reply_text,
                                            sent_via="whatsapp",
                                            whatsapp_message_id=wa_msg_id,
                                        )
                                        db.add(agent_msg)
                                        campaign_conv.message_count = (campaign_conv.message_count or 0) + 1
                                        logger.info(f"[WEBHOOK] Campaign resposta enviada e salva!")

                                except Exception as ai_err:
                                    logger.error(f"[WEBHOOK] Campaign IA erro: {ai_err}", exc_info=True)

                        db.commit()
                    else:
                        logger.info(f"[WEBHOOK] Nenhuma conversa ativa (Lead ou Campaign) para o telefone {sender_phone}")

        else:
            logger.info(f"[WEBHOOK] Evento não tratado: {event}")

        return success_response(data={"received": True})

    except Exception as e:
        logger.error(f"[WEBHOOK] ERRO GERAL: {e}", exc_info=True)
        return success_response(data={"received": True})  # Sempre 200 para o webhook
