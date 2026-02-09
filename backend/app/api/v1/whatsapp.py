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
from app.models.agent import AIAgent
from app.models.usuario import Usuario
from app.schemas.whatsapp import (
    WhatsAppConnectionCreate,
    WhatsAppConnectionUpdate,
    WhatsAppConnectionResponse,
)
from app.services.evolution_api import EvolutionAPIService
from app.services.openai_agent import OpenAIAgentService
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


# ──────────────────── CRUD ────────────────────

@router.get("/connections")
def list_connections(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Lista todas as conexões WhatsApp."""
    request_id = getattr(request.state, "request_id", None)
    try:
        connections = db.query(WhatsAppConnection).order_by(WhatsAppConnection.created_at.desc()).all()
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
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Cria uma nova conexão WhatsApp."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = WhatsAppConnection(
            **data.model_dump(),
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
    obj = db.query(WhatsAppConnection).filter(WhatsAppConnection.id == connection_id).first()
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
        obj = db.query(WhatsAppConnection).filter(WhatsAppConnection.id == connection_id).first()
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
        obj = db.query(WhatsAppConnection).filter(WhatsAppConnection.id == connection_id).first()
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
        obj = db.query(WhatsAppConnection).filter(WhatsAppConnection.id == connection_id).first()
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
        obj = db.query(WhatsAppConnection).filter(WhatsAppConnection.id == connection_id).first()
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
        obj = db.query(WhatsAppConnection).filter(WhatsAppConnection.id == connection_id).first()
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

        elif event in ("messages.upsert", "MESSAGES_UPSERT", "messages.update"):
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
                # Estratégia 1: Match por LID/remoteJid (mais confiável com Meta Cloud API)
                conversation = None

                if remote_jid:
                    conversation = (
                        db.query(LeadConversation)
                        .filter(
                            LeadConversation.status == "active",
                            LeadConversation.remote_jid == remote_jid,
                        )
                        .first()
                    )
                    if conversation:
                        logger.info(f"[WEBHOOK] ✅ Match por LID/remoteJid: {remote_jid} -> conv={conversation.id}, lead={conversation.lead.nome}")

                # Estratégia 2: Match por telefone (fallback para Baileys/número direto)
                if not conversation:
                    all_active_convs = (
                        db.query(LeadConversation)
                        .join(Lead, Lead.id == LeadConversation.lead_id)
                        .filter(LeadConversation.status == "active")
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
                        logger.info(f"[WEBHOOK]   Conv {conv.id}: lead={lead.nome}, wa_tail={lead_wa_tail}, tel_tail={lead_tel_tail}, remote_jid={conv.remote_jid}")

                        if sender_tail and (
                            (lead_wa_tail and lead_wa_tail == sender_tail)
                            or (lead_tel_tail and lead_tel_tail == sender_tail)
                        ):
                            conversation = conv
                            logger.info(f"[WEBHOOK] ✅ Match por telefone! lead={lead.nome}")
                            break

                if conversation:
                    logger.info(f"[WEBHOOK] Conversa ativa encontrada: {conversation.id} (lead={conversation.lead_id})")

                    # Salvar o remote_jid (LID ou JID) na conversa para usar nas respostas
                    if remote_jid and not conversation.remote_jid:
                        conversation.remote_jid = remote_jid
                        logger.info(f"[WEBHOOK] remote_jid salvo na conversa: {remote_jid}")

                    # Salvar mensagem do lead
                    lead_msg = LeadMessage(
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
                        openai_key = settings.OPENAI_API_KEY or ""
                        if openai_key:
                            try:
                                # Montar histórico de mensagens
                                prev_messages = (
                                    db.query(LeadMessage)
                                    .filter(LeadMessage.conversation_id == conversation.id)
                                    .order_by(LeadMessage.created_at)
                                    .all()
                                )
                                history = []
                                for pm in prev_messages:
                                    role = "assistant" if pm.role == "agent" else "user"
                                    history.append({"role": role, "content": pm.content})

                                svc_ai = OpenAIAgentService(api_key=openai_key)
                                ai_result = await svc_ai.create_chat_completion(
                                    system_prompt=agent.system_prompt,
                                    messages=history,
                                    model=agent.model,
                                    temperature=agent.temperature,
                                    max_tokens=agent.max_tokens,
                                )
                                reply_text = ai_result["response"]
                                logger.info(f"[WEBHOOK] IA respondeu ({len(reply_text)} chars): {reply_text[:100]}...")

                                # Enviar resposta via WhatsApp
                                # Usa o remote_jid (LID) se disponível, senão usa o telefone
                                wa_conn = conversation.whatsapp_connection
                                if wa_conn and wa_conn.instance_name:
                                    reply_to = conversation.remote_jid or sender_phone
                                    logger.info(f"[WEBHOOK] Enviando resposta para: {reply_to}")

                                    svc_wa = EvolutionAPIService(api_url=wa_conn.api_url, api_key=wa_conn.api_key)
                                    wa_result = await svc_wa.send_message(
                                        instance_name=wa_conn.instance_name,
                                        phone=reply_to,
                                        text=reply_text,
                                    )
                                    wa_msg_id = wa_result.get("key", {}).get("id")

                                    # Salvar resposta do agente
                                    agent_msg = LeadMessage(
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
                    logger.info(f"[WEBHOOK] Nenhuma conversa ativa para o telefone {sender_phone} (verificados {len(all_active_convs)} conversas ativas)")

        else:
            logger.info(f"[WEBHOOK] Evento não tratado: {event}")

        return success_response(data={"received": True})

    except Exception as e:
        logger.error(f"[WEBHOOK] ERRO GERAL: {e}", exc_info=True)
        return success_response(data={"received": True})  # Sempre 200 para o webhook
