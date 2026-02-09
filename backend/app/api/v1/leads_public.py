"""
Endpoint público para inserção de leads via sistemas externos.
Protegido por API Key no header: X-API-Key
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.lead import Lead

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/public/leads", tags=["leads-public"])


# ── Dependency: validar API Key ───────────────────────────────────────
def verify_api_key(x_api_key: str = Header(..., alias="X-API-Key")):
    """Valida o token enviado no header X-API-Key."""
    if x_api_key != settings.LEADS_API_KEY:
        logger.warning("Tentativa de acesso à API pública de leads com chave inválida")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API Key inválida ou ausente",
        )
    return x_api_key


# ── Schema de entrada ─────────────────────────────────────────────────
class LeadPublicCreate(BaseModel):
    """Payload para criação de lead via API pública."""
    # Obrigatório
    nome: str

    # Contato (pelo menos um recomendado)
    email: Optional[str] = None
    telefone: Optional[str] = None
    whatsapp: Optional[str] = None

    # Dados da empresa
    empresa: Optional[str] = None
    cargo: Optional[str] = None
    site: Optional[str] = None

    # Localização
    cidade: Optional[str] = None
    estado: Optional[str] = None

    # Classificação
    temperatura: Optional[str] = "frio"  # frio | morno | quente
    score: Optional[int] = None

    # Origem / Tracking
    origem: Optional[str] = None         # site | indicacao | google_ads | facebook_ads | instagram | linkedin | evento | cold_call | whatsapp | outro
    origem_detalhe: Optional[str] = None # ex: nome da campanha, quem indicou
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_term: Optional[str] = None
    utm_content: Optional[str] = None
    landing_page: Optional[str] = None
    referrer: Optional[str] = None

    # Interesse
    interesse: Optional[str] = None
    necessidade: Optional[str] = None
    orcamento_estimado: Optional[float] = None

    # Observações livres
    observacoes: Optional[str] = None


class LeadPublicResponse(BaseModel):
    """Resposta após criação do lead."""
    id: uuid.UUID
    nome: str
    email: Optional[str] = None
    telefone: Optional[str] = None
    whatsapp: Optional[str] = None
    empresa: Optional[str] = None
    temperatura: str
    status: str
    origem: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LeadPublicBatchItem(BaseModel):
    """Item individual para inserção em lote."""
    nome: str
    email: Optional[str] = None
    telefone: Optional[str] = None
    whatsapp: Optional[str] = None
    empresa: Optional[str] = None
    cargo: Optional[str] = None
    site: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    temperatura: Optional[str] = "frio"
    score: Optional[int] = None
    origem: Optional[str] = None
    origem_detalhe: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_term: Optional[str] = None
    utm_content: Optional[str] = None
    landing_page: Optional[str] = None
    referrer: Optional[str] = None
    interesse: Optional[str] = None
    necessidade: Optional[str] = None
    orcamento_estimado: Optional[float] = None
    observacoes: Optional[str] = None


class LeadPublicBatchPayload(BaseModel):
    leads: list[LeadPublicBatchItem]


class LeadPublicBatchResponse(BaseModel):
    inserted: int
    errors: int
    details: list[dict]


# ── Endpoints ─────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=LeadPublicResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Inserir um lead",
    description="Cria um novo lead no CRM. Requer X-API-Key no header.",
)
def create_lead_public(
    data: LeadPublicCreate,
    db: Session = Depends(get_db),
    _key: str = Depends(verify_api_key),
):
    logger.info(f"[leads-public] Novo lead recebido: {data.nome} | origem={data.origem}")

    valid_temps = {"frio", "morno", "quente", "cliente"}
    temp = data.temperatura if data.temperatura in valid_temps else "frio"

    valid_origens = {
        "site", "indicacao", "google_ads", "facebook_ads", "instagram",
        "linkedin", "evento", "cold_call", "whatsapp", "outro",
    }
    origem = data.origem if data.origem in valid_origens else (data.origem or None)

    obj = Lead(
        nome=data.nome,
        email=data.email,
        telefone=data.telefone,
        whatsapp=data.whatsapp,
        empresa=data.empresa,
        cargo=data.cargo,
        site=data.site,
        cidade=data.cidade,
        estado=data.estado,
        temperatura=temp,
        status="novo",
        score=data.score or 0,
        origem=origem,
        origem_detalhe=data.origem_detalhe,
        utm_source=data.utm_source,
        utm_medium=data.utm_medium,
        utm_campaign=data.utm_campaign,
        utm_term=data.utm_term,
        utm_content=data.utm_content,
        landing_page=data.landing_page,
        referrer=data.referrer,
        interesse=data.interesse,
        necessidade=data.necessidade,
        orcamento_estimado=data.orcamento_estimado,
        observacoes=data.observacoes,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    logger.info(f"[leads-public] Lead criado com id={obj.id}")
    return obj


@router.post(
    "/batch",
    response_model=LeadPublicBatchResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Inserir leads em lote",
    description="Cria vários leads de uma vez. Máximo 100 por requisição. Requer X-API-Key no header.",
)
def create_leads_batch(
    data: LeadPublicBatchPayload,
    db: Session = Depends(get_db),
    _key: str = Depends(verify_api_key),
):
    if len(data.leads) > 100:
        raise HTTPException(status_code=400, detail="Máximo de 100 leads por requisição")

    logger.info(f"[leads-public] Batch recebido com {len(data.leads)} leads")

    inserted = 0
    errors = 0
    details: list[dict] = []

    for i, item in enumerate(data.leads):
        try:
            obj = Lead(
                nome=item.nome,
                email=item.email,
                telefone=item.telefone,
                whatsapp=item.whatsapp,
                empresa=item.empresa,
                cargo=item.cargo,
                site=item.site,
                cidade=item.cidade,
                estado=item.estado,
                temperatura=item.temperatura or "frio",
                status="novo",
                score=item.score or 0,
                origem=item.origem,
                origem_detalhe=item.origem_detalhe,
                utm_source=item.utm_source,
                utm_medium=item.utm_medium,
                utm_campaign=item.utm_campaign,
                utm_term=item.utm_term,
                utm_content=item.utm_content,
                landing_page=item.landing_page,
                referrer=item.referrer,
                interesse=item.interesse,
                necessidade=item.necessidade,
                orcamento_estimado=item.orcamento_estimado,
                observacoes=item.observacoes,
            )
            db.add(obj)
            db.flush()
            inserted += 1
            details.append({"index": i, "id": obj.id, "status": "ok"})
        except Exception as e:
            errors += 1
            details.append({"index": i, "status": "error", "message": str(e)})
            db.rollback()

    if inserted > 0:
        db.commit()

    logger.info(f"[leads-public] Batch finalizado: {inserted} inseridos, {errors} erros")
    return LeadPublicBatchResponse(inserted=inserted, errors=errors, details=details)
