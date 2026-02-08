import logging
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.rbac import require_any_role, ROLE_ADMIN, ROLE_PROJECT_MANAGER, ROLE_MARKETING_MANAGER, ROLE_TRAFFIC_MANAGER, ROLE_MARKETING
from app.models.usuario import Usuario
from app.models.pre_proposta import PreProposta, PrePropostaAnswer, PrePropostaTemplate
from app.models.cliente import Cliente
from app.models.pipeline import Deal
from app.models.mensagem import AuditEvent
from app.schemas.pre_proposta import (
    PrePropostaCreate, PrePropostaUpdate, PrePropostaResponse, PrePropostaAnswerCreate,
    PrePropostaAnswerResponse, PrePropostaSubmitResponse, PrePropostaConvertRequest
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pre-propostas", tags=["pre-propostas"])

# Roles que podem criar/editar pré-propostas
CAN_MANAGE_PRE_PROPOSALS = [ROLE_ADMIN, ROLE_PROJECT_MANAGER, ROLE_MARKETING_MANAGER, ROLE_TRAFFIC_MANAGER, ROLE_MARKETING]


def calculate_score(answers: list[PrePropostaAnswer]) -> tuple[int, str]:
    """
    Calcula score total (0-100) e temperatura (cold/warm/hot) baseado nas respostas.
    Regras:
    - Clareza de objetivo (0-5, peso 2)
    - Fit de orçamento (0-5, peso 3)
    - Urgência (0-5, peso 2)
    - Maturidade (0-5, peso 1)
    - Autoridade (0-5, peso 2)
    """
    total_weighted_score = 0
    total_weight = 0
    
    for answer in answers:
        if answer.weight and answer.score is not None:
            total_weighted_score += answer.score * answer.weight
            total_weight += answer.weight
    
    if total_weight == 0:
        return 0, "cold"
    
    score_total = int((total_weighted_score / total_weight) * 4)  # Normalizar para 0-100 (0-5 * 20)
    score_total = min(100, max(0, score_total))
    
    if score_total >= 75:
        temperature = "hot"
    elif score_total >= 45:
        temperature = "warm"
    else:
        temperature = "cold"
    
    return score_total, temperature


def generate_summary_and_recommendations(pre_proposal: PreProposta, answers: list[PrePropostaAnswer]) -> tuple[str, dict]:
    """Gera resumo e recomendações baseado no score e respostas."""
    score_total, temperature = calculate_score(answers)
    
    # Buscar respostas principais
    objetivo = next((a.answer_json.get("value") for a in answers if a.field_key == "objetivo_principal"), "Não informado")
    orcamento = next((a.answer_json.get("value") for a in answers if a.field_key == "orcamento_faixa"), "Não informado")
    prazo = next((a.answer_json.get("value") for a in answers if a.field_key == "prazo_desejado"), "Não informado")
    
    summary = f"Diagnóstico para {pre_proposal.client.nome}. Objetivo: {objetivo}. Orçamento: {orcamento}. Prazo: {prazo}. Score: {score_total}/100 ({temperature})."
    
    recommendations = {
        "temperature": temperature,
        "score": score_total,
        "actions": []
    }
    
    if temperature == "hot":
        recommendations["actions"] = [
            "Recomendar proposta completa imediatamente",
            "Agendar call de apresentação",
            "Priorizar este lead"
        ]
    elif temperature == "warm":
        recommendations["actions"] = [
            "Enviar proposta comercial",
            "Realizar diagnóstico mais profundo",
            "Manter nurturing ativo"
        ]
    else:
        recommendations["actions"] = [
            "Iniciar campanha de nurturing por e-mail",
            "Enviar checklist de qualificação",
            "Manter contato periódico"
        ]
    
    return summary, recommendations


@router.get("", response_model=list[PrePropostaResponse])
def list_pre_propostas(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_any_role(CAN_MANAGE_PRE_PROPOSALS))],
    status: Optional[str] = Query(None),
    client_id: Optional[int] = Query(None),
    deal_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
):
    """Lista pré-propostas com filtros."""
    query = db.query(PreProposta)
    
    if status:
        query = query.filter(PreProposta.status == status)
    if client_id:
        query = query.filter(PreProposta.client_id == client_id)
    if deal_id:
        query = query.filter(PreProposta.deal_id == deal_id)
    if search:
        query = query.join(Cliente).filter(
            or_(
                Cliente.nome.ilike(f"%{search}%"),
                PreProposta.summary.ilike(f"%{search}%")
            )
        )
    
    pre_proposals = query.order_by(PreProposta.created_at.desc()).all()
    
    result = []
    for pp in pre_proposals:
        answers = db.query(PrePropostaAnswer).filter(PrePropostaAnswer.pre_proposal_id == pp.id).all()
        result.append(PrePropostaResponse(
            id=pp.id,
            client_id=pp.client_id,
            deal_id=pp.deal_id,
            status=pp.status,
            score_total=pp.score_total,
            temperature=pp.temperature,
            summary=pp.summary,
            recommendations=pp.recommendations,
            created_by_user_id=pp.created_by_user_id,
            updated_by_user_id=pp.updated_by_user_id,
            created_at=pp.created_at,
            updated_at=pp.updated_at,
            answers=[PrePropostaAnswerResponse(
                id=a.id,
                pre_proposal_id=a.pre_proposal_id,
                step_key=a.step_key,
                field_key=a.field_key,
                answer_json=a.answer_json,
                weight=a.weight,
                score=a.score,
                created_at=a.created_at,
                updated_at=a.updated_at,
            ) for a in answers]
        ))
    
    return result


@router.post("", response_model=PrePropostaResponse, status_code=status.HTTP_201_CREATED)
def create_pre_proposta(
    data: PrePropostaCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_any_role(CAN_MANAGE_PRE_PROPOSALS))],
):
    """Cria uma nova pré-proposta (draft)."""
    # Verificar se cliente existe
    client = db.query(Cliente).filter(Cliente.id == data.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    # Verificar deal se fornecido
    if data.deal_id:
        deal = db.query(Deal).filter(Deal.id == data.deal_id).first()
        if not deal:
            raise HTTPException(status_code=404, detail="Deal não encontrado")
    
    pre_proposal = PreProposta(
        client_id=data.client_id,
        deal_id=data.deal_id,
        status="draft",
        created_by_user_id=current_user.id,
        updated_by_user_id=current_user.id,
    )
    db.add(pre_proposal)
    db.commit()
    db.refresh(pre_proposal)
    
    # Registrar auditoria
    try:
        audit = AuditEvent(
            event_type="PRE_PROPOSAL_CREATED",
            actor_user_id=current_user.id,
            context_type="PRE_PROPOSAL",
            context_id=str(pre_proposal.id),
            payload=f'{{"client_id": {data.client_id}, "deal_id": {data.deal_id or "null"}}}',
        )
        db.add(audit)
        db.commit()
    except Exception as e:
        logger.warning(f"Erro ao registrar auditoria: {e}")
    
    return PrePropostaResponse(
        id=pre_proposal.id,
        client_id=pre_proposal.client_id,
        deal_id=pre_proposal.deal_id,
        status=pre_proposal.status,
        score_total=pre_proposal.score_total,
        temperature=pre_proposal.temperature,
        summary=pre_proposal.summary,
        recommendations=pre_proposal.recommendations,
        created_by_user_id=pre_proposal.created_by_user_id,
        updated_by_user_id=pre_proposal.updated_by_user_id,
        created_at=pre_proposal.created_at,
        updated_at=pre_proposal.updated_at,
        answers=[],
    )


@router.get("/{pre_proposta_id}", response_model=PrePropostaResponse)
def get_pre_proposta(
    pre_proposta_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_any_role(CAN_MANAGE_PRE_PROPOSALS))],
):
    """Retorna detalhes de uma pré-proposta."""
    pre_proposal = db.query(PreProposta).filter(PreProposta.id == pre_proposta_id).first()
    if not pre_proposal:
        raise HTTPException(status_code=404, detail="Pré-proposta não encontrada")
    
    answers = db.query(PrePropostaAnswer).filter(PrePropostaAnswer.pre_proposal_id == pre_proposal.id).all()
    
    return PrePropostaResponse(
        id=pre_proposal.id,
        client_id=pre_proposal.client_id,
        deal_id=pre_proposal.deal_id,
        status=pre_proposal.status,
        score_total=pre_proposal.score_total,
        temperature=pre_proposal.temperature,
        summary=pre_proposal.summary,
        recommendations=pre_proposal.recommendations,
        created_by_user_id=pre_proposal.created_by_user_id,
        updated_by_user_id=pre_proposal.updated_by_user_id,
        created_at=pre_proposal.created_at,
        updated_at=pre_proposal.updated_at,
        answers=[PrePropostaAnswerResponse(
            id=a.id,
            pre_proposal_id=a.pre_proposal_id,
            step_key=a.step_key,
            field_key=a.field_key,
            answer_json=a.answer_json,
            weight=a.weight,
            score=a.score,
            created_at=a.created_at,
            updated_at=a.updated_at,
        ) for a in answers]
    )


@router.patch("/{pre_proposta_id}", response_model=PrePropostaResponse)
def update_pre_proposta(
    pre_proposta_id: int,
    data: PrePropostaUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_any_role(CAN_MANAGE_PRE_PROPOSALS))],
):
    """Atualiza uma pré-proposta (apenas campos básicos)."""
    pre_proposal = db.query(PreProposta).filter(PreProposta.id == pre_proposta_id).first()
    if not pre_proposal:
        raise HTTPException(status_code=404, detail="Pré-proposta não encontrada")
    
    if pre_proposal.status == "submitted" and current_user.id != pre_proposal.created_by_user_id:
        # Apenas ADMIN pode editar após submit
        from app.core.rbac import has_any_role
        if not has_any_role(db, current_user.id, [ROLE_ADMIN]):
            raise HTTPException(status_code=403, detail="Não é possível editar pré-proposta finalizada")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(pre_proposal, key, value)
    
    pre_proposal.updated_by_user_id = current_user.id
    db.add(pre_proposal)
    db.commit()
    db.refresh(pre_proposal)
    
    # Registrar auditoria
    try:
        audit = AuditEvent(
            event_type="PRE_PROPOSAL_UPDATED",
            actor_user_id=current_user.id,
            context_type="PRE_PROPOSAL",
            context_id=str(pre_proposal.id),
            payload=f'{{"updated_fields": {list(update_data.keys())}}}',
        )
        db.add(audit)
        db.commit()
    except Exception as e:
        logger.warning(f"Erro ao registrar auditoria: {e}")
    
    answers = db.query(PrePropostaAnswer).filter(PrePropostaAnswer.pre_proposal_id == pre_proposal.id).all()
    
    return PrePropostaResponse(
        id=pre_proposal.id,
        client_id=pre_proposal.client_id,
        deal_id=pre_proposal.deal_id,
        status=pre_proposal.status,
        score_total=pre_proposal.score_total,
        temperature=pre_proposal.temperature,
        summary=pre_proposal.summary,
        recommendations=pre_proposal.recommendations,
        created_by_user_id=pre_proposal.created_by_user_id,
        updated_by_user_id=pre_proposal.updated_by_user_id,
        created_at=pre_proposal.created_at,
        updated_at=pre_proposal.updated_at,
        answers=[PrePropostaAnswerResponse(
            id=a.id,
            pre_proposal_id=a.pre_proposal_id,
            step_key=a.step_key,
            field_key=a.field_key,
            answer_json=a.answer_json,
            weight=a.weight,
            score=a.score,
            created_at=a.created_at,
            updated_at=a.updated_at,
        ) for a in answers]
    )


@router.put("/{pre_proposta_id}/answers")
def upsert_answers(
    pre_proposta_id: int,
    answers: list[PrePropostaAnswerCreate],
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_any_role(CAN_MANAGE_PRE_PROPOSALS))],
):
    """Upsert em massa das respostas do diagnóstico."""
    pre_proposal = db.query(PreProposta).filter(PreProposta.id == pre_proposta_id).first()
    if not pre_proposal:
        raise HTTPException(status_code=404, detail="Pré-proposta não encontrada")
    
    if pre_proposal.status == "submitted":
        raise HTTPException(status_code=400, detail="Não é possível editar respostas de pré-proposta finalizada")
    
    # Upsert: atualizar existentes ou criar novos
    for answer_data in answers:
        existing = db.query(PrePropostaAnswer).filter(
            PrePropostaAnswer.pre_proposal_id == pre_proposta_id,
            PrePropostaAnswer.field_key == answer_data.field_key
        ).first()
        
        if existing:
            existing.step_key = answer_data.step_key
            existing.answer_json = answer_data.answer_json
            existing.weight = answer_data.weight
            existing.score = answer_data.score
        else:
            new_answer = PrePropostaAnswer(
                pre_proposal_id=pre_proposta_id,
                step_key=answer_data.step_key,
                field_key=answer_data.field_key,
                answer_json=answer_data.answer_json,
                weight=answer_data.weight,
                score=answer_data.score,
            )
            db.add(new_answer)
    
    pre_proposal.updated_by_user_id = current_user.id
    db.commit()
    
    return {"success": True, "message": "Respostas salvas com sucesso"}


@router.post("/{pre_proposta_id}/submit", response_model=PrePropostaSubmitResponse)
def submit_pre_proposta(
    pre_proposta_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_any_role(CAN_MANAGE_PRE_PROPOSALS))],
):
    """Finaliza o diagnóstico, calcula score e gera summary/recommendations."""
    pre_proposal = db.query(PreProposta).filter(PreProposta.id == pre_proposta_id).first()
    if not pre_proposal:
        raise HTTPException(status_code=404, detail="Pré-proposta não encontrada")
    
    if pre_proposal.status == "submitted":
        raise HTTPException(status_code=400, detail="Pré-proposta já foi finalizada")
    
    # Buscar todas as respostas
    answers = db.query(PrePropostaAnswer).filter(PrePropostaAnswer.pre_proposal_id == pre_proposta_id).all()
    
    # Calcular score e temperatura
    score_total, temperature = calculate_score(answers)
    
    # Gerar summary e recommendations
    summary, recommendations = generate_summary_and_recommendations(pre_proposal, answers)
    
    # Atualizar pré-proposta
    pre_proposal.status = "submitted"
    pre_proposal.score_total = score_total
    pre_proposal.temperature = temperature
    pre_proposal.summary = summary
    pre_proposal.recommendations = recommendations
    pre_proposal.updated_by_user_id = current_user.id
    db.add(pre_proposal)
    db.commit()
    db.refresh(pre_proposal)
    
    # Registrar auditoria
    try:
        audit = AuditEvent(
            event_type="PRE_PROPOSAL_SUBMITTED",
            actor_user_id=current_user.id,
            context_type="PRE_PROPOSAL",
            context_id=str(pre_proposal.id),
            payload=f'{{"score": {score_total}, "temperature": "{temperature}"}}',
        )
        db.add(audit)
        db.commit()
    except Exception as e:
        logger.warning(f"Erro ao registrar auditoria: {e}")
    
    # TODO: Enviar notificação para responsável/gerente
    
    return PrePropostaSubmitResponse(
        id=pre_proposal.id,
        status=pre_proposal.status,
        score_total=score_total,
        temperature=temperature,
        summary=summary,
        recommendations=recommendations,
    )


@router.post("/{pre_proposta_id}/convert-to-proposal")
def convert_to_proposal(
    pre_proposta_id: int,
    data: PrePropostaConvertRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_any_role(CAN_MANAGE_PRE_PROPOSALS))],
):
    """Converte pré-proposta em proposta comercial."""
    from app.models.proposta import Proposta
    from app.schemas.proposta_enhanced import ProposalEnhancedCreate
    
    pre_proposal = db.query(PreProposta).filter(PreProposta.id == pre_proposta_id).first()
    if not pre_proposal:
        raise HTTPException(status_code=404, detail="Pré-proposta não encontrada")
    
    if pre_proposal.status != "submitted":
        raise HTTPException(status_code=400, detail="Pré-proposta deve estar finalizada para ser convertida")
    
    # Criar proposta
    proposal_title = data.proposal_title or f"Proposta - {pre_proposal.client.nome}"
    
    proposal = Proposta(
        titulo=proposal_title,
        descricao=pre_proposal.summary or "",
        cliente_id=pre_proposal.client_id,
        deal_id=pre_proposal.deal_id,
        from_pre_proposal_id=pre_proposal.id,
        status="rascunho",
        usuario_id=current_user.id,
        updated_by_user_id=current_user.id,
        currency="BRL",
    )
    db.add(proposal)
    db.commit()
    db.refresh(proposal)
    
    # Marcar pré-proposta como convertida
    pre_proposal.status = "converted"
    pre_proposal.updated_by_user_id = current_user.id
    db.add(pre_proposal)
    db.commit()
    
    # Registrar auditoria
    try:
        audit = AuditEvent(
            event_type="PRE_PROPOSAL_CONVERTED",
            actor_user_id=current_user.id,
            context_type="PRE_PROPOSAL",
            context_id=str(pre_proposal.id),
            payload=f'{{"proposal_id": {proposal.id}}}',
        )
        db.add(audit)
        db.commit()
    except Exception as e:
        logger.warning(f"Erro ao registrar auditoria: {e}")
    
    return {
        "success": True,
        "proposal_id": proposal.id,
        "message": "Pré-proposta convertida em proposta com sucesso"
    }

