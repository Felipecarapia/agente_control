import uuid
import logging
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Request, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.response import success_response, error_response, serialize_data
from app.models.campaign import Campaign, CampaignLead
from app.models.lead import Lead
from app.models.usuario import Usuario
from app.schemas.campaign import (
    CampaignCreate,
    CampaignUpdate,
)
from app.services.google_search import GoogleSearchService
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
