import logging
import secrets
from datetime import datetime, timezone
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.rbac import require_any_role, ROLE_ADMIN, ROLE_PROJECT_MANAGER, ROLE_MARKETING_MANAGER, ROLE_TRAFFIC_MANAGER
from app.models.usuario import Usuario
from app.models.proposta import Proposta, ProposalSection, ProposalPricingPlan, ProposalStatusEvent, EmailOutbox
from app.models.cliente import Cliente
from app.models.pipeline import Deal
from app.models.mensagem import AuditEvent
from app.schemas.proposta_enhanced import (
    ProposalEnhancedCreate, ProposalEnhancedUpdate, ProposalEnhancedResponse,
    ProposalSectionCreate, ProposalSectionUpdate, ProposalSectionResponse,
    ProposalPricingPlanCreate, ProposalPricingPlanUpdate, ProposalPricingPlanResponse,
    ProposalPublicAcceptRequest, ProposalPublicAcceptResponse, ProposalSendEmailRequest
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/propostas-enhanced", tags=["propostas-enhanced"])

# Roles que podem gerenciar propostas
CAN_MANAGE_PROPOSALS = [ROLE_ADMIN, ROLE_PROJECT_MANAGER, ROLE_MARKETING_MANAGER, ROLE_TRAFFIC_MANAGER]


def generate_public_token() -> str:
    """Gera token único para acesso público."""
    return secrets.token_urlsafe(32)


@router.get("", response_model=list[ProposalEnhancedResponse])
def list_propostas_enhanced(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_any_role(CAN_MANAGE_PROPOSALS))],
    status: Optional[str] = Query(None),
    client_id: Optional[int] = Query(None),
    deal_id: Optional[int] = Query(None),
    from_pre_proposal_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
):
    """Lista propostas com filtros."""
    query = db.query(Proposta)
    
    if status:
        query = query.filter(Proposta.status == status)
    if client_id:
        query = query.filter(Proposta.cliente_id == client_id)
    if deal_id:
        query = query.filter(Proposta.deal_id == deal_id)
    if from_pre_proposal_id:
        query = query.filter(Proposta.from_pre_proposal_id == from_pre_proposal_id)
    if search:
        query = query.join(Cliente).filter(
            or_(
                Cliente.nome.ilike(f"%{search}%"),
                Proposta.titulo.ilike(f"%{search}%")
            )
        )
    
    proposals = query.order_by(Proposta.created_at.desc()).all()
    
    result = []
    for prop in proposals:
        sections = db.query(ProposalSection).filter(ProposalSection.proposal_id == prop.id).order_by(ProposalSection.order_index).all()
        plans = db.query(ProposalPricingPlan).filter(ProposalPricingPlan.proposal_id == prop.id).all()
        
        result.append(ProposalEnhancedResponse(
            id=prop.id,
            titulo=prop.titulo,
            descricao=prop.descricao,
            cliente_id=prop.cliente_id,
            projeto_id=prop.projeto_id,
            deal_id=prop.deal_id,
            from_pre_proposal_id=prop.from_pre_proposal_id,
            validade_ate=prop.validade_ate,
            currency=prop.currency or "BRL",
            total_value_cents=prop.total_value_cents,
            status=prop.status,
            public_token=prop.public_token,
            accepted_at=prop.accepted_at,
            accepted_by_name=prop.accepted_by_name,
            usuario_id=prop.usuario_id,
            updated_by_user_id=prop.updated_by_user_id,
            created_at=prop.created_at,
            updated_at=prop.updated_at,
            sections=[ProposalSectionResponse(
                id=s.id,
                proposal_id=s.proposal_id,
                section_key=s.section_key,
                title=s.title,
                content_json=s.content_json,
                order_index=s.order_index,
                created_at=s.created_at,
                updated_at=s.updated_at,
            ) for s in sections],
            pricing_plans=[ProposalPricingPlanResponse(
                id=p.id,
                proposal_id=p.proposal_id,
                plan_name=p.plan_name,
                plan_summary=p.plan_summary,
                includes_json=p.includes_json,
                timeline_text=p.timeline_text,
                price_cents=p.price_cents,
                payment_terms_text=p.payment_terms_text,
                is_recommended=p.is_recommended == "true" if isinstance(p.is_recommended, str) else bool(p.is_recommended),
                is_selected_default=p.is_selected_default == "true" if isinstance(p.is_selected_default, str) else bool(p.is_selected_default),
                created_at=p.created_at,
                updated_at=p.updated_at,
            ) for p in plans],
        ))
    
    return result


@router.post("", response_model=ProposalEnhancedResponse, status_code=status.HTTP_201_CREATED)
def create_proposta_enhanced(
    data: ProposalEnhancedCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_any_role(CAN_MANAGE_PROPOSALS))],
):
    """Cria uma nova proposta (com seções e planos)."""
    # Verificar cliente
    client = db.query(Cliente).filter(Cliente.id == data.cliente_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    # Verificar deal se fornecido
    if data.deal_id:
        deal = db.query(Deal).filter(Deal.id == data.deal_id).first()
        if not deal:
            raise HTTPException(status_code=404, detail="Deal não encontrado")
    
    # Criar proposta
    proposal = Proposta(
        titulo=data.titulo,
        descricao=data.descricao,
        cliente_id=data.cliente_id,
        projeto_id=data.projeto_id,
        deal_id=data.deal_id,
        from_pre_proposal_id=data.from_pre_proposal_id,
        validade_ate=data.validade_ate,
        currency=data.currency,
        total_value_cents=data.total_value_cents,
        status="rascunho",
        usuario_id=current_user.id,
        updated_by_user_id=current_user.id,
    )
    db.add(proposal)
    db.commit()
    db.refresh(proposal)
    
    # Criar seções se fornecidas
    if data.sections:
        for idx, section_data in enumerate(data.sections):
            section = ProposalSection(
                proposal_id=proposal.id,
                section_key=section_data.section_key,
                title=section_data.title,
                content_json=section_data.content_json,
                order_index=section_data.order_index if section_data.order_index is not None else idx,
            )
            db.add(section)
    
    # Criar planos se fornecidos
    if data.pricing_plans:
        for plan_data in data.pricing_plans:
            plan = ProposalPricingPlan(
                proposal_id=proposal.id,
                plan_name=plan_data.plan_name,
                plan_summary=plan_data.plan_summary,
                includes_json=plan_data.includes_json,
                timeline_text=plan_data.timeline_text,
                price_cents=plan_data.price_cents,
                payment_terms_text=plan_data.payment_terms_text,
                is_recommended="true" if plan_data.is_recommended else "false",
                is_selected_default="true" if plan_data.is_selected_default else "false",
            )
            db.add(plan)
    
    db.commit()
    db.refresh(proposal)
    
    # Registrar evento
    try:
        event = ProposalStatusEvent(
            proposal_id=proposal.id,
            event_type="CREATED",
            payload_json={"created_by": current_user.id},
        )
        db.add(event)
        db.commit()
    except Exception as e:
        logger.warning(f"Erro ao registrar evento: {e}")
    
    # Registrar auditoria
    try:
        audit = AuditEvent(
            event_type="PROPOSAL_CREATED",
            actor_user_id=current_user.id,
            context_type="PROPOSAL",
            context_id=str(proposal.id),
            payload=f'{{"client_id": {data.cliente_id}, "deal_id": {data.deal_id or "null"}}}',
        )
        db.add(audit)
        db.commit()
    except Exception as e:
        logger.warning(f"Erro ao registrar auditoria: {e}")
    
    # Retornar resposta completa
    sections = db.query(ProposalSection).filter(ProposalSection.proposal_id == proposal.id).order_by(ProposalSection.order_index).all()
    plans = db.query(ProposalPricingPlan).filter(ProposalPricingPlan.proposal_id == proposal.id).all()
    
    return ProposalEnhancedResponse(
        id=proposal.id,
        titulo=proposal.titulo,
        descricao=proposal.descricao,
        cliente_id=proposal.cliente_id,
        projeto_id=proposal.projeto_id,
        deal_id=proposal.deal_id,
        from_pre_proposal_id=proposal.from_pre_proposal_id,
        validade_ate=proposal.validade_ate,
        currency=proposal.currency or "BRL",
        total_value_cents=proposal.total_value_cents,
        status=proposal.status,
        public_token=proposal.public_token,
        accepted_at=proposal.accepted_at,
        accepted_by_name=proposal.accepted_by_name,
        usuario_id=proposal.usuario_id,
        updated_by_user_id=proposal.updated_by_user_id,
        created_at=proposal.created_at,
        updated_at=proposal.updated_at,
        sections=[ProposalSectionResponse(
            id=s.id,
            proposal_id=s.proposal_id,
            section_key=s.section_key,
            title=s.title,
            content_json=s.content_json,
            order_index=s.order_index,
            created_at=s.created_at,
            updated_at=s.updated_at,
        ) for s in sections],
        pricing_plans=[ProposalPricingPlanResponse(
            id=p.id,
            proposal_id=p.proposal_id,
            plan_name=p.plan_name,
            plan_summary=p.plan_summary,
            includes_json=p.includes_json,
            timeline_text=p.timeline_text,
            price_cents=p.price_cents,
            payment_terms_text=p.payment_terms_text,
            is_recommended=p.is_recommended == "true" if isinstance(p.is_recommended, str) else bool(p.is_recommended),
            is_selected_default=p.is_selected_default == "true" if isinstance(p.is_selected_default, str) else bool(p.is_selected_default),
            created_at=p.created_at,
            updated_at=p.updated_at,
        ) for p in plans],
    )


@router.get("/{proposta_id}", response_model=ProposalEnhancedResponse)
def get_proposta_enhanced(
    proposta_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_any_role(CAN_MANAGE_PROPOSALS))],
):
    """Retorna detalhes completos de uma proposta."""
    proposal = db.query(Proposta).filter(Proposta.id == proposta_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    
    sections = db.query(ProposalSection).filter(ProposalSection.proposal_id == proposal.id).order_by(ProposalSection.order_index).all()
    plans = db.query(ProposalPricingPlan).filter(ProposalPricingPlan.proposal_id == proposal.id).all()
    
    return ProposalEnhancedResponse(
        id=proposal.id,
        titulo=proposal.titulo,
        descricao=proposal.descricao,
        cliente_id=proposal.cliente_id,
        projeto_id=proposal.projeto_id,
        deal_id=proposal.deal_id,
        from_pre_proposal_id=proposal.from_pre_proposal_id,
        validade_ate=proposal.validade_ate,
        currency=proposal.currency or "BRL",
        total_value_cents=proposal.total_value_cents,
        status=proposal.status,
        public_token=proposal.public_token,
        accepted_at=proposal.accepted_at,
        accepted_by_name=proposal.accepted_by_name,
        usuario_id=proposal.usuario_id,
        updated_by_user_id=proposal.updated_by_user_id,
        created_at=proposal.created_at,
        updated_at=proposal.updated_at,
        sections=[ProposalSectionResponse(
            id=s.id,
            proposal_id=s.proposal_id,
            section_key=s.section_key,
            title=s.title,
            content_json=s.content_json,
            order_index=s.order_index,
            created_at=s.created_at,
            updated_at=s.updated_at,
        ) for s in sections],
        pricing_plans=[ProposalPricingPlanResponse(
            id=p.id,
            proposal_id=p.proposal_id,
            plan_name=p.plan_name,
            plan_summary=p.plan_summary,
            includes_json=p.includes_json,
            timeline_text=p.timeline_text,
            price_cents=p.price_cents,
            payment_terms_text=p.payment_terms_text,
            is_recommended=p.is_recommended == "true" if isinstance(p.is_recommended, str) else bool(p.is_recommended),
            is_selected_default=p.is_selected_default == "true" if isinstance(p.is_selected_default, str) else bool(p.is_selected_default),
            created_at=p.created_at,
            updated_at=p.updated_at,
        ) for p in plans],
    )


@router.patch("/{proposta_id}", response_model=ProposalEnhancedResponse)
def update_proposta_enhanced(
    proposta_id: int,
    data: ProposalEnhancedUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_any_role(CAN_MANAGE_PROPOSALS))],
):
    """Atualiza uma proposta."""
    proposal = db.query(Proposta).filter(Proposta.id == proposta_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(proposal, key, value)
    
    proposal.updated_by_user_id = current_user.id
    db.add(proposal)
    db.commit()
    db.refresh(proposal)
    
    # Registrar evento
    try:
        event = ProposalStatusEvent(
            proposal_id=proposal.id,
            event_type="UPDATED",
            payload_json={"updated_by": current_user.id, "updated_fields": list(update_data.keys())},
        )
        db.add(event)
        db.commit()
    except Exception as e:
        logger.warning(f"Erro ao registrar evento: {e}")
    
    sections = db.query(ProposalSection).filter(ProposalSection.proposal_id == proposal.id).order_by(ProposalSection.order_index).all()
    plans = db.query(ProposalPricingPlan).filter(ProposalPricingPlan.proposal_id == proposal.id).all()
    
    return ProposalEnhancedResponse(
        id=proposal.id,
        titulo=proposal.titulo,
        descricao=proposal.descricao,
        cliente_id=proposal.cliente_id,
        projeto_id=proposal.projeto_id,
        deal_id=proposal.deal_id,
        from_pre_proposal_id=proposal.from_pre_proposal_id,
        validade_ate=proposal.validade_ate,
        currency=proposal.currency or "BRL",
        total_value_cents=proposal.total_value_cents,
        status=proposal.status,
        public_token=proposal.public_token,
        accepted_at=proposal.accepted_at,
        accepted_by_name=proposal.accepted_by_name,
        usuario_id=proposal.usuario_id,
        updated_by_user_id=proposal.updated_by_user_id,
        created_at=proposal.created_at,
        updated_at=proposal.updated_at,
        sections=[ProposalSectionResponse(
            id=s.id,
            proposal_id=s.proposal_id,
            section_key=s.section_key,
            title=s.title,
            content_json=s.content_json,
            order_index=s.order_index,
            created_at=s.created_at,
            updated_at=s.updated_at,
        ) for s in sections],
        pricing_plans=[ProposalPricingPlanResponse(
            id=p.id,
            proposal_id=p.proposal_id,
            plan_name=p.plan_name,
            plan_summary=p.plan_summary,
            includes_json=p.includes_json,
            timeline_text=p.timeline_text,
            price_cents=p.price_cents,
            payment_terms_text=p.payment_terms_text,
            is_recommended=p.is_recommended == "true" if isinstance(p.is_recommended, str) else bool(p.is_recommended),
            is_selected_default=p.is_selected_default == "true" if isinstance(p.is_selected_default, str) else bool(p.is_selected_default),
            created_at=p.created_at,
            updated_at=p.updated_at,
        ) for p in plans],
    )


@router.post("/{proposta_id}/sections", response_model=ProposalSectionResponse)
def create_section(
    proposta_id: int,
    data: ProposalSectionCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_any_role(CAN_MANAGE_PROPOSALS))],
):
    """Cria uma nova seção na proposta."""
    proposal = db.query(Proposta).filter(Proposta.id == proposta_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    
    section = ProposalSection(
        proposal_id=proposta_id,
        section_key=data.section_key,
        title=data.title,
        content_json=data.content_json,
        order_index=data.order_index,
    )
    db.add(section)
    db.commit()
    db.refresh(section)
    
    return ProposalSectionResponse(
        id=section.id,
        proposal_id=section.proposal_id,
        section_key=section.section_key,
        title=section.title,
        content_json=section.content_json,
        order_index=section.order_index,
        created_at=section.created_at,
        updated_at=section.updated_at,
    )


@router.patch("/{proposta_id}/sections/{section_id}", response_model=ProposalSectionResponse)
def update_section(
    proposta_id: int,
    section_id: int,
    data: ProposalSectionUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_any_role(CAN_MANAGE_PROPOSALS))],
):
    """Atualiza uma seção."""
    section = db.query(ProposalSection).filter(
        ProposalSection.id == section_id,
        ProposalSection.proposal_id == proposta_id
    ).first()
    if not section:
        raise HTTPException(status_code=404, detail="Seção não encontrada")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(section, key, value)
    
    db.add(section)
    db.commit()
    db.refresh(section)
    
    return ProposalSectionResponse(
        id=section.id,
        proposal_id=section.proposal_id,
        section_key=section.section_key,
        title=section.title,
        content_json=section.content_json,
        order_index=section.order_index,
        created_at=section.created_at,
        updated_at=section.updated_at,
    )


@router.post("/{proposta_id}/pricing-plans", response_model=ProposalPricingPlanResponse)
def create_pricing_plan(
    proposta_id: int,
    data: ProposalPricingPlanCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_any_role(CAN_MANAGE_PROPOSALS))],
):
    """Cria um novo plano de preço."""
    proposal = db.query(Proposta).filter(Proposta.id == proposta_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    
    plan = ProposalPricingPlan(
        proposal_id=proposta_id,
        plan_name=data.plan_name,
        plan_summary=data.plan_summary,
        includes_json=data.includes_json,
        timeline_text=data.timeline_text,
        price_cents=data.price_cents,
        payment_terms_text=data.payment_terms_text,
        is_recommended="true" if data.is_recommended else "false",
        is_selected_default="true" if data.is_selected_default else "false",
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    
    return ProposalPricingPlanResponse(
        id=plan.id,
        proposal_id=plan.proposal_id,
        plan_name=plan.plan_name,
        plan_summary=plan.plan_summary,
        includes_json=plan.includes_json,
        timeline_text=plan.timeline_text,
        price_cents=plan.price_cents,
        payment_terms_text=plan.payment_terms_text,
        is_recommended=plan.is_recommended == "true" if isinstance(plan.is_recommended, str) else bool(plan.is_recommended),
        is_selected_default=plan.is_selected_default == "true" if isinstance(plan.is_selected_default, str) else bool(plan.is_selected_default),
        created_at=plan.created_at,
        updated_at=plan.updated_at,
    )


@router.post("/{proposta_id}/generate-token")
def generate_public_token_endpoint(
    proposta_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_any_role(CAN_MANAGE_PROPOSALS))],
):
    """Gera token público para a proposta."""
    proposal = db.query(Proposta).filter(Proposta.id == proposta_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    
    # Gerar token único
    for _ in range(10):
        token = generate_public_token()
        existing = db.query(Proposta).filter(Proposta.public_token == token).first()
        if not existing:
            proposal.public_token = token
            db.commit()
            db.refresh(proposal)
            return {"public_token": token, "public_url": f"/p/{token}"}
    
    raise HTTPException(status_code=500, detail="Não foi possível gerar token único")


@router.get("/public/{token}", response_model=ProposalEnhancedResponse)
def get_proposta_public(
    token: str,
    db: Annotated[Session, Depends(get_db)],
    request: Request,
):
    """Retorna proposta pública (sem autenticação, apenas token)."""
    proposal = db.query(Proposta).filter(Proposta.public_token == token).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    
    # Registrar evento VIEWED
    try:
        event = ProposalStatusEvent(
            proposal_id=proposal.id,
            event_type="VIEWED",
            payload_json={
                "ip": request.client.host if request.client else None,
                "user_agent": request.headers.get("user-agent"),
            },
        )
        db.add(event)
        
        # Atualizar status se ainda não foi visualizada
        if proposal.status == "sent":
            proposal.status = "viewed"
        
        db.commit()
    except Exception as e:
        logger.warning(f"Erro ao registrar evento: {e}")
    
    sections = db.query(ProposalSection).filter(ProposalSection.proposal_id == proposal.id).order_by(ProposalSection.order_index).all()
    plans = db.query(ProposalPricingPlan).filter(ProposalPricingPlan.proposal_id == proposal.id).all()
    
    return ProposalEnhancedResponse(
        id=proposal.id,
        titulo=proposal.titulo,
        descricao=proposal.descricao,
        cliente_id=proposal.cliente_id,
        projeto_id=proposal.projeto_id,
        deal_id=proposal.deal_id,
        from_pre_proposal_id=proposal.from_pre_proposal_id,
        validade_ate=proposal.validade_ate,
        currency=proposal.currency or "BRL",
        total_value_cents=proposal.total_value_cents,
        status=proposal.status,
        public_token=proposal.public_token,
        accepted_at=proposal.accepted_at,
        accepted_by_name=proposal.accepted_by_name,
        usuario_id=proposal.usuario_id,
        updated_by_user_id=proposal.updated_by_user_id,
        created_at=proposal.created_at,
        updated_at=proposal.updated_at,
        sections=[ProposalSectionResponse(
            id=s.id,
            proposal_id=s.proposal_id,
            section_key=s.section_key,
            title=s.title,
            content_json=s.content_json,
            order_index=s.order_index,
            created_at=s.created_at,
            updated_at=s.updated_at,
        ) for s in sections],
        pricing_plans=[ProposalPricingPlanResponse(
            id=p.id,
            proposal_id=p.proposal_id,
            plan_name=p.plan_name,
            plan_summary=p.plan_summary,
            includes_json=p.includes_json,
            timeline_text=p.timeline_text,
            price_cents=p.price_cents,
            payment_terms_text=p.payment_terms_text,
            is_recommended=p.is_recommended == "true" if isinstance(p.is_recommended, str) else bool(p.is_recommended),
            is_selected_default=p.is_selected_default == "true" if isinstance(p.is_selected_default, str) else bool(p.is_selected_default),
            created_at=p.created_at,
            updated_at=p.updated_at,
        ) for p in plans],
    )


@router.post("/public/{token}/accept", response_model=ProposalPublicAcceptResponse)
def accept_proposta_public(
    token: str,
    data: ProposalPublicAcceptRequest,
    db: Annotated[Session, Depends(get_db)],
    request: Request,
):
    """Aceita proposta pública (sem autenticação)."""
    if not data.accept_terms:
        raise HTTPException(status_code=400, detail="É necessário aceitar os termos")
    
    proposal = db.query(Proposta).filter(Proposta.public_token == token).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    
    if proposal.status == "accepted":
        raise HTTPException(status_code=400, detail="Proposta já foi aceita")
    
    if proposal.status == "rejected":
        raise HTTPException(status_code=400, detail="Proposta foi recusada e não pode ser aceita")
    
    # Atualizar proposta
    proposal.status = "accepted"
    proposal.accepted_at = datetime.now(timezone.utc)
    proposal.accepted_by_name = data.name
    proposal.accepted_ip = request.client.host if request.client else None
    proposal.accepted_user_agent = request.headers.get("user-agent")
    db.add(proposal)
    db.commit()
    
    # Registrar evento
    try:
        event = ProposalStatusEvent(
            proposal_id=proposal.id,
            event_type="ACCEPTED",
            payload_json={
                "accepted_by_name": data.name,
                "ip": proposal.accepted_ip,
                "user_agent": proposal.accepted_user_agent,
            },
        )
        db.add(event)
        db.commit()
    except Exception as e:
        logger.warning(f"Erro ao registrar evento: {e}")
    
    # Se houver deal vinculado, mover para etapa "Fechado - Ganho"
    if proposal.deal_id:
        try:
            deal = db.query(Deal).filter(Deal.id == proposal.deal_id).first()
            if deal:
                from app.models.pipeline import PipelineStage, DealStageHistory
                # Buscar etapa "Fechado - Ganho" ou criar se não existir
                won_stage = db.query(PipelineStage).filter(
                    PipelineStage.pipeline_id == deal.pipeline_id,
                    PipelineStage.key == "WON"
                ).first()
                
                if won_stage:
                    # Registrar histórico
                    history = DealStageHistory(
                        deal_id=deal.id,
                        from_stage_id=deal.stage_id,
                        to_stage_id=won_stage.id,
                        moved_by_user_id=None,  # Sistema
                        reason="Proposta aceita",
                        extra_metadata='{"source": "proposal_accepted"}',
                    )
                    db.add(history)
                    
                    deal.stage_id = won_stage.id
                    deal.status = "won"
                    db.add(deal)
                    db.commit()
        except Exception as e:
            logger.warning(f"Erro ao atualizar deal: {e}")
    
    # Registrar auditoria
    try:
        audit = AuditEvent(
            event_type="PROPOSAL_ACCEPTED",
            actor_user_id=None,  # Público
            context_type="PROPOSAL",
            context_id=str(proposal.id),
            payload=f'{{"accepted_by_name": "{data.name}", "ip": "{proposal.accepted_ip}"}}',
        )
        db.add(audit)
        db.commit()
    except Exception as e:
        logger.warning(f"Erro ao registrar auditoria: {e}")
    
    # TODO: Enviar notificação para responsável
    
    return ProposalPublicAcceptResponse(
        success=True,
        message="Proposta aceita com sucesso!",
        proposal_id=proposal.id,
    )


@router.post("/{proposta_id}/send-email")
def send_proposta_email(
    proposta_id: int,
    data: ProposalSendEmailRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_any_role(CAN_MANAGE_PROPOSALS))],
    request: Request,
):
    """Envia proposta por e-mail."""
    proposal = db.query(Proposta).filter(Proposta.id == proposta_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    
    # Gerar token se não existir
    if not proposal.public_token:
        for _ in range(10):
            token = generate_public_token()
            existing = db.query(Proposta).filter(Proposta.public_token == token).first()
            if not existing:
                proposal.public_token = token
                break
    
    # Determinar e-mail do destinatário
    to_email = data.to_email or proposal.cliente.email
    if not to_email:
        raise HTTPException(status_code=400, detail="E-mail do cliente não informado e nenhum e-mail fornecido")
    
    # Construir URL pública
    base_url = str(request.base_url).rstrip("/")
    public_url = f"{base_url}/p/{proposal.public_token}"
    
    # Construir HTML do e-mail
    subject = data.subject or f"Proposta Comercial - {proposal.titulo}"
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .button {{ display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Olá {proposal.cliente.nome},</h2>
            <p>Segue a proposta comercial conforme solicitado:</p>
            <h3>{proposal.titulo}</h3>
            {f'<p>{data.message}</p>' if data.message else ''}
            <a href="{public_url}" class="button">Ver Proposta</a>
            <p>Ou copie e cole este link no navegador:</p>
            <p><a href="{public_url}">{public_url}</a></p>
            <p>Atenciosamente,<br>Equipe Sistemaxi</p>
        </div>
    </body>
    </html>
    """
    
    # Criar registro na fila de e-mails
    email_record = EmailOutbox(
        to_email=to_email,
        subject=subject,
        html_body=html_body,
        status="queued",
    )
    db.add(email_record)
    
    # Atualizar status da proposta
    if proposal.status == "rascunho":
        proposal.status = "sent"
    
    db.commit()
    db.refresh(email_record)
    
    # TODO: Processar envio de e-mail (SMTP ou provedor HTTP)
    # Por enquanto, apenas marca como "sent" (em produção, usar celery/task queue)
    try:
        # Simulação: marcar como enviado
        email_record.status = "sent"
        email_record.sent_at = datetime.now(timezone.utc)
        db.commit()
    except Exception as e:
        logger.error(f"Erro ao enviar e-mail: {e}")
        email_record.status = "failed"
        email_record.error_text = str(e)
        db.commit()
    
    # Registrar evento
    try:
        event = ProposalStatusEvent(
            proposal_id=proposal.id,
            event_type="SENT",
            payload_json={"to_email": to_email, "email_id": email_record.id},
        )
        db.add(event)
        db.commit()
    except Exception as e:
        logger.warning(f"Erro ao registrar evento: {e}")
    
    return {
        "success": True,
        "message": "E-mail enviado com sucesso",
        "email_id": email_record.id,
        "public_url": public_url,
    }


@router.get("/{proposta_id}/export/pdf")
def export_proposta_pdf(
    proposta_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_any_role(CAN_MANAGE_PROPOSALS))],
):
    """Exporta proposta como HTML (para conversão em PDF no frontend)."""
    proposal = db.query(Proposta).filter(Proposta.id == proposta_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    
    sections = db.query(ProposalSection).filter(ProposalSection.proposal_id == proposal.id).order_by(ProposalSection.order_index).all()
    plans = db.query(ProposalPricingPlan).filter(ProposalPricingPlan.proposal_id == proposal.id).all()
    
    # Formatar data de validade
    validade_text = "Não especificada"
    if proposal.validade_ate:
        validade_text = proposal.validade_ate.strftime("%d/%m/%Y")
    
    # Construir tabela de planos
    plans_html = ""
    if plans:
        plan_rows = []
        for p in plans:
            includes_text = ", ".join(p.includes_json) if isinstance(p.includes_json, list) else str(p.includes_json)
            price_text = f"R$ {p.price_cents / 100:.2f}"
            timeline_text = p.timeline_text or "N/A"
            plan_rows.append(f"<tr><td>{p.plan_name}</td><td>{includes_text}</td><td>{timeline_text}</td><td class=\"price\">{price_text}</td></tr>")
        plans_html = f'<h2>Investimento</h2><table class="pricing-table"><thead><tr><th>Plano</th><th>Inclui</th><th>Prazo</th><th>Valor</th></tr></thead><tbody>{"".join(plan_rows)}</tbody></table>'
    
    # Construir HTML para PDF
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @media print {{
                @page {{ margin: 2cm; }}
            }}
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }}
            h1 {{ color: #1e40af; border-bottom: 2px solid #3B82F6; padding-bottom: 10px; }}
            h2 {{ color: #1e40af; margin-top: 30px; }}
            .section {{ margin: 20px 0; }}
            .pricing-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
            .pricing-table th, .pricing-table td {{ border: 1px solid #ddd; padding: 12px; text-align: left; }}
            .pricing-table th {{ background-color: #f3f4f6; }}
            .price {{ font-size: 1.5em; font-weight: bold; color: #059669; }}
        </style>
    </head>
    <body>
        <h1>{proposal.titulo}</h1>
        {f'<p>{proposal.descricao}</p>' if proposal.descricao else ''}
        
        {''.join([f'<div class="section"><h2>{s.title}</h2><div>{_format_content_json(s.content_json)}</div></div>' for s in sections])}
        
        {plans_html}
        
        {f'<p><strong>Validade:</strong> {validade_text}</p>' if proposal.validade_ate else ''}
    </body>
    </html>
    """
    
    # Registrar evento
    try:
        event = ProposalStatusEvent(
            proposal_id=proposal.id,
            event_type="EXPORTED_PDF",
            payload_json={"exported_by": current_user.id},
        )
        db.add(event)
        db.commit()
    except Exception as e:
        logger.warning(f"Erro ao registrar evento: {e}")
    
    return HTMLResponse(content=html_content)


def _format_content_json(content: dict) -> str:
    """Formata content_json em HTML."""
    if isinstance(content, dict):
        if "type" in content:
            if content["type"] == "paragraph":
                return f'<p>{content.get("text", "")}</p>'
            elif content["type"] == "list":
                items = content.get("items", [])
                return f'<ul>{"".join([f"<li>{item}</li>" for item in items])}</ul>'
        # Fallback: converter dict para HTML simples
        return str(content)
    elif isinstance(content, list):
        return "".join([_format_content_json(item) for item in content])
    else:
        return str(content)

