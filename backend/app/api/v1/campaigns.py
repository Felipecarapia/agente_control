import asyncio
import uuid
import logging
from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Request, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc

from app.api.deps import get_current_user
from app.core.database import get_db, SessionLocal
from app.core.response import success_response, error_response, serialize_data
from app.models.campaign import (
    Campaign, CampaignLead, CampaignLeadConversation, CampaignLeadMessage,
)
from app.models.lead import Lead
from app.models.agent import AIAgent
from app.models.whatsapp import WhatsAppConnection
from app.models.usuario import Usuario
from app.schemas.campaign import (
    CampaignCreate,
    CampaignUpdate,
    StartOutreachRequest,
)
from app.services.google_search import GoogleSearchService
from app.services.evolution_api import EvolutionAPIService
from app.services.openai_agent import OpenAIAgentService
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/campaigns", tags=["campaigns"])


# ──────────────────── CRUD ────────────────────

@router.get("")
def list_campaigns(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
    campaign_type: Optional[str] = Query(None, alias="type"),
    campaign_status: Optional[str] = Query(None, alias="status"),
):
    """Lista todas as campanhas."""
    request_id = getattr(request.state, "request_id", None)
    try:
        q = db.query(Campaign).order_by(desc(Campaign.created_at))
        if campaign_type:
            q = q.filter(Campaign.type == campaign_type)
        if campaign_status:
            q = q.filter(Campaign.status == campaign_status)
        campaigns = q.all()
        data = [serialize_data(c) for c in campaigns]
        return success_response(data=data, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao listar campanhas: {e}", exc_info=True)
        return success_response(data=[], request_id=request_id)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_campaign(
    request: Request,
    data: CampaignCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Cria uma nova campanha."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = Campaign(
            **data.model_dump(),
            created_by_user_id=current_user.id,
        )
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return success_response(data=serialize_data(obj), request_id=request_id, status_code=201)
    except Exception as e:
        logger.error(f"Erro ao criar campanha: {e}", exc_info=True)
        db.rollback()
        return error_response(code="CREATE_ERROR", message=str(e), status_code=500, request_id=request_id)


@router.get("/{campaign_id}")
def get_campaign(
    request: Request,
    campaign_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Busca uma campanha pelo ID, com resumo de leads."""
    request_id = getattr(request.state, "request_id", None)
    obj = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not obj:
        return error_response(code="NOT_FOUND", message="Campanha não encontrada", status_code=404, request_id=request_id)

    campaign_data = serialize_data(obj)
    campaign_data["total_leads_found"] = (
        db.query(CampaignLead).filter(CampaignLead.campaign_id == campaign_id).count()
    )
    return success_response(data=campaign_data, request_id=request_id)


@router.put("/{campaign_id}")
def update_campaign(
    request: Request,
    campaign_id: uuid.UUID,
    data: CampaignUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Atualiza uma campanha."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not obj:
            return error_response(code="NOT_FOUND", message="Campanha não encontrada", status_code=404, request_id=request_id)
        update_data = data.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        return success_response(data=serialize_data(obj), request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao atualizar campanha: {e}", exc_info=True)
        db.rollback()
        return error_response(code="UPDATE_ERROR", message=str(e), status_code=500, request_id=request_id)


@router.delete("/{campaign_id}")
def delete_campaign(
    request: Request,
    campaign_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Deleta uma campanha e seus leads."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not obj:
            return error_response(code="NOT_FOUND", message="Campanha não encontrada", status_code=404, request_id=request_id)
        db.delete(obj)
        db.commit()
        return success_response(data={"deleted": True}, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao deletar campanha: {e}", exc_info=True)
        db.rollback()
        return error_response(code="DELETE_ERROR", message=str(e), status_code=500, request_id=request_id)


# ──────────────────── Prospecção ────────────────────

@router.post("/{campaign_id}/run")
async def run_prospecting(
    request: Request,
    campaign_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Executa a prospecção da campanha: busca leads no Google Places."""
    request_id = getattr(request.state, "request_id", None)
    logger.info(f"[PROSPECÇÃO] Iniciando prospecção para campanha {campaign_id}")
    try:
        obj = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not obj:
            logger.warning(f"[PROSPECÇÃO] Campanha {campaign_id} não encontrada")
            return error_response(code="NOT_FOUND", message="Campanha não encontrada", status_code=404, request_id=request_id)

        if obj.type != "prospecting":
            logger.warning(f"[PROSPECÇÃO] Campanha {campaign_id} não é do tipo prospecting (tipo={obj.type})")
            return error_response(
                code="INVALID_TYPE",
                message="Apenas campanhas do tipo 'prospecting' podem ser executadas.",
                status_code=400,
                request_id=request_id,
            )

        google_key = settings.GOOGLE_PLACES_API_KEY or ""
        logger.info(f"[PROSPECÇÃO] GOOGLE_PLACES_API_KEY configurada: {'SIM' if google_key else 'NÃO'} (len={len(google_key)})")
        if not google_key:
            return error_response(
                code="CONFIG_ERROR",
                message="GOOGLE_PLACES_API_KEY não configurada no servidor",
                status_code=500,
                request_id=request_id,
            )

        config = obj.config_json or {}
        city = config.get("city", "")
        activity = config.get("activity", "")
        state = config.get("state")
        max_results = config.get("max_results", 50)

        logger.info(f"[PROSPECÇÃO] Parâmetros: cidade={city}, atividade={activity}, estado={state}, max={max_results}")
        logger.info(f"[PROSPECÇÃO] config_json completo: {config}")

        if not city or not activity:
            logger.warning(f"[PROSPECÇÃO] Parâmetros incompletos: city={city!r}, activity={activity!r}")
            return error_response(
                code="INVALID_CONFIG",
                message="A campanha precisa ter 'city' e 'activity' configurados.",
                status_code=400,
                request_id=request_id,
            )

        obj.status = "running"
        db.commit()
        logger.info(f"[PROSPECÇÃO] Status atualizado para 'running'. Iniciando busca no Google Places...")

        svc = GoogleSearchService(api_key=google_key)
        leads_data = await svc.run_prospecting(
            city=city,
            activity=activity,
            state=state,
            max_results=max_results,
        )

        logger.info(f"[PROSPECÇÃO] Google Places retornou {len(leads_data)} leads")
        for i, ld in enumerate(leads_data[:5]):
            logger.info(f"[PROSPECÇÃO]   Lead {i+1}: {ld.get('business_name')} | tel={ld.get('phone')} | {ld.get('city')}")

        new_leads_count = 0
        for ld in leads_data:
            # Verifica se já existe lead com mesmo telefone nesta campanha
            existing = None
            if ld.get("phone"):
                existing = (
                    db.query(CampaignLead)
                    .filter(
                        CampaignLead.campaign_id == campaign_id,
                        CampaignLead.phone == ld["phone"],
                    )
                    .first()
                )
            if not existing:
                lead = CampaignLead(
                    campaign_id=campaign_id,
                    business_name=ld.get("business_name", "Sem nome"),
                    phone=ld.get("phone"),
                    email=ld.get("email"),
                    website=ld.get("website"),
                    address=ld.get("address"),
                    city=ld.get("city", city),
                    state=ld.get("state", state),
                    category=ld.get("category"),
                    rating=ld.get("rating"),
                    source="google_maps",
                    status="found",
                    metadata_json={
                        "place_id": ld.get("place_id"),
                        "google_maps_url": ld.get("google_maps_url"),
                    },
                )
                db.add(lead)
                new_leads_count += 1

        obj.status = "completed"
        obj.total_leads_found = (
            db.query(CampaignLead).filter(CampaignLead.campaign_id == campaign_id).count()
            + new_leads_count
        )
        db.commit()

        logger.info(f"[PROSPECÇÃO] ✅ Concluída! {new_leads_count} novos leads salvos na tabela campaign_leads (total na campanha: {obj.total_leads_found})")

        return success_response(
            data={
                "campaign_id": str(campaign_id),
                "total_found": len(leads_data),
                "new_leads": new_leads_count,
                "message": f"Prospecção concluída: {new_leads_count} novos leads encontrados.",
            },
            request_id=request_id,
        )

    except Exception as e:
        logger.error(f"[PROSPECÇÃO] ❌ Erro na prospecção da campanha {campaign_id}: {e}", exc_info=True)
        logger.error(f"Erro ao executar prospecção: {e}", exc_info=True)
        # Marcar campanha como falha
        try:
            obj = db.query(Campaign).filter(Campaign.id == campaign_id).first()
            if obj:
                obj.status = "failed"
                db.commit()
        except Exception:
            pass
        return error_response(code="PROSPECTING_ERROR", message=str(e), status_code=500, request_id=request_id)


# ──────────────────── Leads da Campanha ────────────────────

@router.get("/{campaign_id}/leads")
def list_campaign_leads(
    request: Request,
    campaign_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
    lead_status: Optional[str] = Query(None, alias="status"),
):
    """Lista os leads encontrados por uma campanha."""
    request_id = getattr(request.state, "request_id", None)
    try:
        q = (
            db.query(CampaignLead)
            .filter(CampaignLead.campaign_id == campaign_id)
            .order_by(desc(CampaignLead.found_at))
        )
        if lead_status:
            q = q.filter(CampaignLead.status == lead_status)
        leads = q.all()
        data = [serialize_data(l) for l in leads]
        return success_response(data=data, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao listar leads da campanha: {e}", exc_info=True)
        return success_response(data=[], request_id=request_id)


@router.post("/{campaign_id}/leads/{lead_id}/convert")
def convert_lead_to_crm(
    request: Request,
    campaign_id: uuid.UUID,
    lead_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Converte um lead de campanha em um Lead do CRM."""
    request_id = getattr(request.state, "request_id", None)
    try:
        campaign_lead = (
            db.query(CampaignLead)
            .filter(CampaignLead.id == lead_id, CampaignLead.campaign_id == campaign_id)
            .first()
        )
        if not campaign_lead:
            return error_response(code="NOT_FOUND", message="Lead da campanha não encontrado", status_code=404, request_id=request_id)

        if campaign_lead.status == "converted":
            return error_response(code="ALREADY_CONVERTED", message="Lead já foi convertido", status_code=409, request_id=request_id)

        # Criar Lead no CRM
        crm_lead = Lead(
            nome=campaign_lead.business_name,
            email=campaign_lead.email,
            telefone=campaign_lead.phone,
            empresa=campaign_lead.business_name,
            cidade=campaign_lead.city,
            estado=campaign_lead.state,
            site=campaign_lead.website,
            origem="campanha",
            origem_detalhe=f"Campanha: {campaign_id}",
            status="novo",
            temperatura="morno",
            criado_por_id=current_user.id,
            responsavel_id=current_user.id,
        )
        db.add(crm_lead)

        campaign_lead.status = "converted"
        db.commit()
        db.refresh(crm_lead)

        return success_response(
            data={
                "campaign_lead_id": str(lead_id),
                "crm_lead_id": str(crm_lead.id),
                "message": "Lead convertido com sucesso!",
            },
            request_id=request_id,
        )

    except Exception as e:
        logger.error(f"Erro ao converter lead: {e}", exc_info=True)
        db.rollback()
        return error_response(code="CONVERT_ERROR", message=str(e), status_code=500, request_id=request_id)


# ──────────────────── Outreach IA ────────────────────

async def _start_single_conversation(
    campaign_id: uuid.UUID,
    campaign_lead_id: uuid.UUID,
    agent_id: uuid.UUID,
    wa_conn_id: uuid.UUID,
) -> dict:
    """Lógica interna para iniciar uma conversa com um campaign lead. Usa sessão própria."""
    db = SessionLocal()
    try:
        campaign_lead = db.query(CampaignLead).filter(CampaignLead.id == campaign_lead_id).first()
        if not campaign_lead or not campaign_lead.phone:
            return {"error": "Lead sem telefone"}

        agent = db.query(AIAgent).filter(AIAgent.id == agent_id).first()
        wa_conn = db.query(WhatsAppConnection).filter(WhatsAppConnection.id == wa_conn_id).first()
        if not agent or not wa_conn:
            return {"error": "Agente ou conexão não encontrados"}

        # Verificar se já existe conversa ativa
        existing = (
            db.query(CampaignLeadConversation)
            .filter(
                CampaignLeadConversation.campaign_lead_id == campaign_lead_id,
                CampaignLeadConversation.status == "active",
            )
            .first()
        )
        if existing:
            return {"error": "Já existe conversa ativa", "conversation_id": str(existing.id)}

        # Gerar mensagem com IA
        openai_key = settings.OPENAI_API_KEY or ""
        if not openai_key:
            return {"error": "OPENAI_API_KEY não configurada"}

        lead_context = (
            f"Dados do lead para prospecção:\n"
            f"- Nome do negócio: {campaign_lead.business_name}\n"
            f"- Categoria: {campaign_lead.category or 'Não informada'}\n"
            f"- Cidade: {campaign_lead.city or 'Não informada'}, {campaign_lead.state or ''}\n"
            f"- Telefone: {campaign_lead.phone}\n"
            f"- Website: {campaign_lead.website or 'Não informado'}\n\n"
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
        logger.info(f"[OUTREACH] Mensagem gerada para {campaign_lead.business_name}: {message_text[:80]}...")

        # Enviar via WhatsApp
        svc_wa = EvolutionAPIService(api_url=wa_conn.api_url, api_key=wa_conn.api_key)
        wa_result = await svc_wa.send_message(
            instance_name=wa_conn.instance_name,
            phone=campaign_lead.phone,
            text=message_text,
        )
        wa_msg_id = wa_result.get("key", {}).get("id")
        wa_remote_jid = wa_result.get("key", {}).get("remoteJid", "")
        logger.info(f"[OUTREACH] Enviado! msg_id={wa_msg_id}, remoteJid={wa_remote_jid}")

        # Criar conversa e mensagem
        conversation = CampaignLeadConversation(
            campaign_lead_id=campaign_lead_id,
            agent_id=agent_id,
            whatsapp_connection_id=wa_conn_id,
            remote_jid=wa_remote_jid or None,
            status="active",
            message_count=1,
        )
        db.add(conversation)
        db.flush()

        msg = CampaignLeadMessage(
            conversation_id=conversation.id,
            role="agent",
            content=message_text,
            sent_via="whatsapp",
            whatsapp_message_id=wa_msg_id,
        )
        db.add(msg)

        campaign_lead.status = "contacted"
        campaign_lead.contacted_at = datetime.now(timezone.utc)

        db.commit()
        logger.info(f"[OUTREACH] Conversa {conversation.id} criada para lead {campaign_lead.business_name}")
        return {"conversation_id": str(conversation.id), "business_name": campaign_lead.business_name}

    except Exception as e:
        logger.error(f"[OUTREACH] Erro ao iniciar conversa com lead {campaign_lead_id}: {e}", exc_info=True)
        db.rollback()
        return {"error": str(e)}
    finally:
        db.close()


@router.post("/{campaign_id}/leads/{lead_id}/start-conversation")
async def start_conversation(
    request: Request,
    campaign_id: uuid.UUID,
    lead_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Inicia uma conversa de outreach IA com um campaign lead individual."""
    request_id = getattr(request.state, "request_id", None)
    try:
        campaign_lead = (
            db.query(CampaignLead)
            .filter(CampaignLead.id == lead_id, CampaignLead.campaign_id == campaign_id)
            .first()
        )
        if not campaign_lead:
            return error_response(code="NOT_FOUND", message="Lead da campanha não encontrado", status_code=404, request_id=request_id)

        if not campaign_lead.phone:
            return error_response(code="NO_PHONE", message="Lead não possui telefone cadastrado", status_code=400, request_id=request_id)

        # Buscar campanha para pegar agente e conexão WhatsApp
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            return error_response(code="NOT_FOUND", message="Campanha não encontrada", status_code=404, request_id=request_id)

        # Priorizar agente da campanha, senão usar primeiro ativo
        agent = None
        if campaign.agent_id:
            agent = db.query(AIAgent).filter(AIAgent.id == campaign.agent_id).first()
        if not agent:
            agent = (
                db.query(AIAgent)
                .filter(AIAgent.is_active == True, AIAgent.whatsapp_connection_id.isnot(None))
                .first()
            )
        if not agent:
            return error_response(code="NO_AGENT", message="Nenhum agente de IA ativo encontrado.", status_code=400, request_id=request_id)

        # Priorizar conexão da campanha, senão do agente
        wa_conn_id = campaign.whatsapp_connection_id or agent.whatsapp_connection_id
        if not wa_conn_id:
            return error_response(code="NO_WA", message="Nenhuma conexão WhatsApp configurada.", status_code=400, request_id=request_id)

        wa_conn = db.query(WhatsAppConnection).filter(WhatsAppConnection.id == wa_conn_id).first()
        if not wa_conn or wa_conn.status != "connected":
            return error_response(code="WA_NOT_CONNECTED", message="Conexão WhatsApp não está conectada.", status_code=400, request_id=request_id)

        result = await _start_single_conversation(
            campaign_id=campaign_id,
            campaign_lead_id=lead_id,
            agent_id=agent.id,
            wa_conn_id=wa_conn.id,
        )

        if "error" in result:
            return error_response(code="OUTREACH_ERROR", message=result["error"], status_code=400, request_id=request_id)

        return success_response(data=result, request_id=request_id)

    except Exception as e:
        logger.error(f"[OUTREACH] Erro: {e}", exc_info=True)
        return error_response(code="OUTREACH_ERROR", message=str(e), status_code=500, request_id=request_id)


@router.get("/{campaign_id}/conversations")
def list_campaign_conversations(
    request: Request,
    campaign_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Lista todas as conversas de outreach de uma campanha, com mensagens."""
    request_id = getattr(request.state, "request_id", None)
    try:
        # Buscar campaign leads desta campanha
        lead_ids = [
            cl.id for cl in
            db.query(CampaignLead.id).filter(CampaignLead.campaign_id == campaign_id).all()
        ]
        if not lead_ids:
            return success_response(data=[], request_id=request_id)

        conversations = (
            db.query(CampaignLeadConversation)
            .options(joinedload(CampaignLeadConversation.messages), joinedload(CampaignLeadConversation.campaign_lead))
            .filter(CampaignLeadConversation.campaign_lead_id.in_(lead_ids))
            .order_by(desc(CampaignLeadConversation.started_at))
            .all()
        )

        result = []
        for conv in conversations:
            conv_data = serialize_data(conv)
            conv_data["messages"] = [serialize_data(m) for m in conv.messages]
            conv_data["business_name"] = conv.campaign_lead.business_name if conv.campaign_lead else None
            conv_data["phone"] = conv.campaign_lead.phone if conv.campaign_lead else None
            conv_data["lead_status"] = conv.campaign_lead.status if conv.campaign_lead else None
            result.append(conv_data)

        return success_response(data=result, request_id=request_id)

    except Exception as e:
        logger.error(f"Erro ao listar conversas da campanha: {e}", exc_info=True)
        return success_response(data=[], request_id=request_id)


async def _batch_outreach(
    campaign_id: uuid.UUID,
    agent_id: uuid.UUID,
    wa_conn_id: uuid.UUID,
    lead_ids: list,
    delay_seconds: int,
):
    """Background task: envia mensagens em lote com delay entre cada envio."""
    for i, lead_id in enumerate(lead_ids):
        logger.info(f"[BATCH_OUTREACH] Processando lead {i+1}/{len(lead_ids)}: {lead_id}")
        try:
            result = await _start_single_conversation(
                campaign_id=campaign_id,
                campaign_lead_id=lead_id,
                agent_id=agent_id,
                wa_conn_id=wa_conn_id,
            )
            if "error" in result:
                logger.warning(f"[BATCH_OUTREACH] Erro no lead {lead_id}: {result['error']}")
            else:
                logger.info(f"[BATCH_OUTREACH] ✅ {result.get('business_name')} OK")
        except Exception as e:
            logger.error(f"[BATCH_OUTREACH] Erro no lead {lead_id}: {e}", exc_info=True)

        # Aguardar delay entre mensagens (exceto na última)
        if i < len(lead_ids) - 1:
            logger.info(f"[BATCH_OUTREACH] Aguardando {delay_seconds}s...")
            await asyncio.sleep(delay_seconds)

    logger.info(f"[BATCH_OUTREACH] ✅ Lote concluído! {len(lead_ids)} leads processados")


@router.post("/{campaign_id}/start-outreach")
async def start_outreach(
    request: Request,
    campaign_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
    background_tasks: BackgroundTasks = None,
    data: Optional[StartOutreachRequest] = None,
):
    """Inicia outreach em lote: envia mensagens para leads com status 'found', um por vez com delay."""
    request_id = getattr(request.state, "request_id", None)
    try:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            return error_response(code="NOT_FOUND", message="Campanha não encontrada", status_code=404, request_id=request_id)

        # Buscar agente
        agent = None
        if campaign.agent_id:
            agent = db.query(AIAgent).filter(AIAgent.id == campaign.agent_id).first()
        if not agent:
            agent = (
                db.query(AIAgent)
                .filter(AIAgent.is_active == True, AIAgent.whatsapp_connection_id.isnot(None))
                .first()
            )
        if not agent:
            return error_response(code="NO_AGENT", message="Nenhum agente de IA ativo encontrado.", status_code=400, request_id=request_id)

        wa_conn_id = campaign.whatsapp_connection_id or agent.whatsapp_connection_id
        if not wa_conn_id:
            return error_response(code="NO_WA", message="Nenhuma conexão WhatsApp configurada.", status_code=400, request_id=request_id)

        wa_conn = db.query(WhatsAppConnection).filter(WhatsAppConnection.id == wa_conn_id).first()
        if not wa_conn or wa_conn.status != "connected":
            return error_response(code="WA_NOT_CONNECTED", message="Conexão WhatsApp não está conectada.", status_code=400, request_id=request_id)

        # Buscar leads com status "found" que ainda não têm conversa
        found_leads = (
            db.query(CampaignLead)
            .filter(
                CampaignLead.campaign_id == campaign_id,
                CampaignLead.status == "found",
                CampaignLead.phone.isnot(None),
                CampaignLead.phone != "",
            )
            .all()
        )

        # Filtrar os que não têm conversa ativa
        lead_ids_to_contact = []
        for lead in found_leads:
            has_conv = (
                db.query(CampaignLeadConversation)
                .filter(CampaignLeadConversation.campaign_lead_id == lead.id)
                .first()
            )
            if not has_conv:
                lead_ids_to_contact.append(lead.id)

        if not lead_ids_to_contact:
            return success_response(
                data={"queued": 0, "message": "Nenhum lead novo para contactar."},
                request_id=request_id,
            )

        delay_seconds = data.delay_seconds if data else 15

        # Iniciar em background
        asyncio.ensure_future(
            _batch_outreach(
                campaign_id=campaign_id,
                agent_id=agent.id,
                wa_conn_id=wa_conn.id,
                lead_ids=lead_ids_to_contact,
                delay_seconds=delay_seconds,
            )
        )

        return success_response(
            data={
                "queued": len(lead_ids_to_contact),
                "message": f"Outreach iniciado! {len(lead_ids_to_contact)} leads serão contatados com intervalo de {delay_seconds}s.",
            },
            request_id=request_id,
        )

    except Exception as e:
        logger.error(f"[OUTREACH] Erro ao iniciar outreach: {e}", exc_info=True)
        return error_response(code="OUTREACH_ERROR", message=str(e), status_code=500, request_id=request_id)
