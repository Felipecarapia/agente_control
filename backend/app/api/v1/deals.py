import logging
from typing import Annotated, Optional
from decimal import Decimal
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, and_, text

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.response import success_response, error_response
from app.core.validators import IDValidator, PaginationValidator
from app.core.rbac import require_role, ROLE_ADMIN, has_role, has_any_role, ROLE_PROJECT_MANAGER
from app.models.usuario import Usuario
from app.models.pipeline import (
    Pipeline, PipelineStage, Deal, DealAssignee, DealTag, DealTagLink,
    DealActivity, DealNote, DealStageHistory, DealPriority, DealStatus, DealSource
)
from app.models.cliente import Cliente
from app.models.mensagem import AuditEvent
from app.schemas.pipeline import (
    DealCreate, DealUpdate, DealResponse, DealMoveRequest, DealKanbanResponse,
    StageWithDealsResponse, PipelineKanbanResponse, ClientListItem,
    PipelineResponse, PipelineStageResponse,
    DealActivityCreate, DealActivityUpdate, DealActivityResponse,
    DealNoteCreate, DealNoteResponse,
    DealBulkActionRequest
)

router = APIRouter(prefix="/deals", tags=["deals"])


def _can_edit_deal(db: Session, user: Usuario, deal: Deal) -> bool:
    """Verifica se usuário pode editar/mover um deal."""
    if has_role(db, user.id, ROLE_ADMIN) or has_role(db, user.id, ROLE_PROJECT_MANAGER):
        return True
    
    # Verificar se é responsável
    assignee = db.query(DealAssignee).filter(
        DealAssignee.deal_id == deal.id,
        DealAssignee.user_id == user.id
    ).first()
    return assignee is not None


def _format_deal_response(deal: Deal) -> DealResponse:
    """Formata deal com relacionamentos para resposta."""
    assignees = [
        {
            "id": da.id,
            "user_id": da.user_id,
            "user_nome": da.user.nome if da.user else None,
            "role": da.role
        }
        for da in deal.assignees
    ]
    
    tags = [
        {
            "id": dtl.id,
            "tag_id": dtl.tag_id,
            "tag_name": dtl.tag.name if dtl.tag else None,
            "tag_color": dtl.tag.color if dtl.tag else None
        }
        for dtl in deal.tag_links
    ]
    
    activities = [
        {
            "id": act.id,
            "type": act.type,
            "title": act.title,
            "due_at": act.due_at,
            "done_at": act.done_at,
            "created_by_user_id": act.created_by_user_id,
            "created_by_nome": act.created_by.nome if act.created_by else None,
            "created_at": act.created_at
        }
        for act in deal.activities
    ]
    
    notes = [
        {
            "id": note.id,
            "author_user_id": note.author_user_id,
            "author_nome": note.author.nome if note.author else None,
            "content": note.content,
            "created_at": note.created_at
        }
        for note in deal.notes
    ]
    
    history = [
        {
            "id": h.id,
            "from_stage_id": h.from_stage_id,
            "from_stage_name": h.from_stage.name if h.from_stage else None,
            "to_stage_id": h.to_stage_id,
            "to_stage_name": h.to_stage.name if h.to_stage else None,
            "moved_by_user_id": h.moved_by_user_id,
            "moved_by_nome": h.moved_by.nome if h.moved_by else None,
            "moved_at": h.moved_at,
            "reason": h.reason
        }
        for h in deal.stage_history
    ]
    
    return DealResponse(
        id=deal.id,
        pipeline_id=deal.pipeline_id,
        stage_id=deal.stage_id,
        title=deal.title,
        client_id=deal.client_id,
        value_cents=deal.value_cents,
        currency=deal.currency,
        probability=deal.probability,
        expected_close_date=deal.expected_close_date,
        priority=deal.priority,
        status=deal.status,
        source=deal.source,
        proposal_id=deal.proposal_id,
        contract_id=deal.contract_id,
        position_index=deal.position_index,
        created_by_user_id=deal.created_by_user_id,
        created_at=deal.created_at,
        updated_at=deal.updated_at,
        assigned_user_ids=[da.user_id for da in deal.assignees],
        tag_ids=[dtl.tag_id for dtl in deal.tag_links],
        assignees=assignees,
        tags=tags,
        activities=activities,
        notes=notes,
        stage_history=history
    )


def _format_deal_kanban(deal: Deal) -> DealKanbanResponse:
    """Formata deal para resposta otimizada do Kanban."""
    has_pending = any(
        act.due_at and act.done_at is None and act.due_at < datetime.now()
        for act in deal.activities
    )
    
    # Converter Decimal para float para serialização JSON
    position_index = float(deal.position_index) if deal.position_index else 0.0
    
    return DealKanbanResponse(
        id=deal.id,
        title=deal.title,
        client_id=deal.client_id,
        client_nome=deal.client.nome if deal.client else None,
        value_cents=deal.value_cents,
        currency=deal.currency,
        probability=deal.probability,
        expected_close_date=deal.expected_close_date,
        priority=deal.priority,
        status=deal.status,
        position_index=position_index,
        assignees=[
            {
                "id": da.id,
                "user_id": da.user_id,
                "user_nome": da.user.nome if da.user else None,
                "role": da.role
            }
            for da in deal.assignees
        ],
        tags=[
            {
                "id": dtl.id,
                "tag_id": dtl.tag_id,
                "tag_name": dtl.tag.name if dtl.tag else None,
                "tag_color": dtl.tag.color if dtl.tag else None
            }
            for dtl in deal.tag_links
        ],
        has_pending_activity=has_pending
    )


@router.get("", response_model=list[DealResponse])
def list_deals(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
    pipeline_id: Optional[int] = Query(None),
    stage_id: Optional[int] = Query(None),
    client_id: Optional[int] = Query(None),
    assignee_id: Optional[int] = Query(None),
    status: Optional[DealStatus] = Query(None),
    search: Optional[str] = Query(None),
    min_value: Optional[int] = Query(None),
    max_value: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    """Lista deals com filtros."""
    q = db.query(Deal).options(
        joinedload(Deal.client),
        joinedload(Deal.assignees).joinedload(DealAssignee.user),
        joinedload(Deal.tag_links).joinedload(DealTagLink.tag),
        joinedload(Deal.activities).joinedload(DealActivity.created_by),
        joinedload(Deal.notes).joinedload(DealNote.author),
        joinedload(Deal.stage_history).joinedload(DealStageHistory.moved_by),
        joinedload(Deal.stage_history).joinedload(DealStageHistory.from_stage),
        joinedload(Deal.stage_history).joinedload(DealStageHistory.to_stage),
    )
    
    # Filtros
    if pipeline_id:
        q = q.filter(Deal.pipeline_id == pipeline_id)
    if stage_id:
        q = q.filter(Deal.stage_id == stage_id)
    if client_id:
        q = q.filter(Deal.client_id == client_id)
    if assignee_id:
        q = q.join(DealAssignee).filter(DealAssignee.user_id == assignee_id)
    if status:
        q = q.filter(Deal.status == status)
    if search:
        q = q.filter(or_(
            Deal.title.ilike(f"%{search}%"),
            Cliente.nome.ilike(f"%{search}%")
        ))
    if min_value:
        q = q.filter(Deal.value_cents >= min_value)
    if max_value:
        q = q.filter(Deal.value_cents <= max_value)
    
    # Paginação
    total = q.count()
    deals = q.order_by(Deal.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    formatted_deals = [_format_deal_response(d) for d in deals]
    return success_response(
        data=formatted_deals,
        meta={
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size
        }
    )


@router.get("/kanban")
def get_kanban(
    pipelineId: Optional[int] = Query(None, description="ID do pipeline"),
    clientSearch: Optional[str] = Query(None, description="Busca de clientes"),
    clientPage: int = Query(1, ge=1, description="Página de clientes"),
    clientPageSize: int = Query(20, ge=1, le=100, description="Tamanho da página de clientes"),
    db: Annotated[Session, Depends(get_db)] = None,
    current_user: Annotated[Usuario, Depends(get_current_user)] = None,
):
    """
    Retorna dados otimizados para o Kanban board.
    REGRA: Falta de pipeline NÃO é erro - é estado inicial.
    Se pipelineId não for enviado OU pipeline não existir:
    - retornar 200 com { ok: true, data: { columns: [], cards: [] }, meta: { requiresSetup: true } }
    Jamais retornar 500.
    """
    # Normalizar parâmetros (aceitar camelCase do frontend)
    pipeline_id = pipelineId
    client_search = clientSearch
    client_page = clientPage
    client_page_size = clientPageSize
    
    # Stages padrão do funil (sempre retornar, mesmo sem pipeline)
    default_stages_data = [
        {"id": 1, "name": "Leads", "key": "LEADS", "order_index": 0, "color": None},
        {"id": 2, "name": "Contato feito", "key": "CONTACT_MADE", "order_index": 1, "color": None},
        {"id": 3, "name": "Diagnóstico", "key": "DIAGNOSIS", "order_index": 2, "color": None},
        {"id": 4, "name": "Proposta enviada", "key": "PROPOSAL_SENT", "order_index": 3, "color": None},
        {"id": 5, "name": "Negociação", "key": "NEGOTIATION", "order_index": 4, "color": None},
        {"id": 6, "name": "Fechado - Ganho", "key": "WON", "order_index": 5, "color": "#10B981"},
        {"id": 7, "name": "Fechado - Perdido", "key": "LOST", "order_index": 6, "color": "#EF4444"},
    ]
    
    from app.schemas.pipeline import PipelineStageResponse
    
    # Tentar buscar pipeline padrão ou primeiro pipeline
    pipeline = None
    stages = []
    deals = []
    
    try:
        if pipeline_id:
            pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
        else:
            # Buscar pipeline padrão ou primeiro pipeline disponível
            pipeline = db.query(Pipeline).filter(Pipeline.is_default == True).first()
            if not pipeline:
                pipeline = db.query(Pipeline).first()
        
        if pipeline:
            # Buscar stages reais do pipeline
            stages = db.query(PipelineStage).filter(
                PipelineStage.pipeline_id == pipeline.id
            ).order_by(PipelineStage.order_index).all()
            
            # Buscar deals com relacionamentos mínimos
            deals = db.query(Deal).options(
                joinedload(Deal.client),
                joinedload(Deal.assignees).joinedload(DealAssignee.user),
                joinedload(Deal.tag_links).joinedload(DealTagLink.tag),
                joinedload(Deal.activities),
            ).filter(
                Deal.pipeline_id == pipeline.id,
                text("deals.status = 'open'")
            ).order_by(Deal.position_index).all()
        else:
            # Não há pipeline - usar stages padrão e não buscar deals
            stages = []
            deals = []
    except Exception as e:
        logger.error(f"Erro ao buscar pipeline/stages: {str(e)}", exc_info=True)
        # Continuar com stages padrão mesmo em caso de erro
        stages = []
        deals = []
    
    # Se não há stages do banco, usar stages padrão
    if not stages:
        stages = [
            PipelineStageResponse(
                id=s["id"],
                pipeline_id=0,
                name=s["name"],
                key=s["key"],
                order_index=s["order_index"],
                wip_limit=None,
                color=s["color"],
                created_at=None,
                updated_at=None
            )
            for s in default_stages_data
        ]
    
    # Agrupar deals por stage
    stages_with_deals = []
    for stage in stages:
        # Se stage é do tipo PipelineStageResponse (schema), usar diretamente
        # Se é do tipo PipelineStage (model), converter
        if hasattr(stage, 'pipeline_id') and not hasattr(stage, '__table__'):
            # Já é PipelineStageResponse (schema)
            stage_obj = stage
            stage_id = stage.id
        elif hasattr(stage, '__table__'):
            # É PipelineStage (model), converter para schema
            stage_obj = PipelineStageResponse(
                id=stage.id,
                pipeline_id=getattr(stage, 'pipeline_id', 0),
                name=stage.name,
                key=getattr(stage, 'key', None),
                order_index=getattr(stage, 'order_index', 0),
                wip_limit=getattr(stage, 'wip_limit', None),
                color=getattr(stage, 'color', None),
                created_at=getattr(stage, 'created_at', None),
                updated_at=getattr(stage, 'updated_at', None)
            )
            stage_id = stage.id
        else:
            # Já é PipelineStageResponse
            stage_obj = stage
            stage_id = stage.id
        
        # Buscar deals desta stage (só funciona se houver pipeline real)
        # Se não houver pipeline, deals ficam vazios (estado inicial)
        stage_deals = [d for d in deals if d.stage_id == stage_id] if pipeline else []
        total_value = sum(d.value_cents or 0 for d in stage_deals)
        
        stages_with_deals.append(StageWithDealsResponse(
            stage=stage_obj,
            deals=[_format_deal_kanban(d) for d in stage_deals],
            total_value_cents=total_value,
            deal_count=len(stage_deals)
        ))
    
    # Buscar clientes com paginação
    client_query = db.query(Cliente)
    if client_search:
        client_query = client_query.filter(
            or_(
                Cliente.nome.ilike(f"%{client_search}%"),
                Cliente.razao_social.ilike(f"%{client_search}%"),
                Cliente.email.ilike(f"%{client_search}%")
            )
        )
    
    clients_total = client_query.count()
    clients_list = client_query.order_by(Cliente.nome).offset(
        (client_page - 1) * client_page_size
    ).limit(client_page_size).all()
    
    # Verificar quais clientes já têm deal OPEN neste pipeline
    client_ids_with_deals = {d.client_id for d in deals}
    
    clients_response = []
    for client in clients_list:
        clients_response.append(ClientListItem(
            id=client.id,
            nome=client.nome,
            razao_social=client.razao_social,
            email=client.email,
            telefone=client.telefone,
            celular=client.celular,
            has_open_deal=client.id in client_ids_with_deals
        ))
    
    # Criar pipeline response (pode ser None se não houver pipeline)
    pipeline_response = None
    if pipeline:
        from app.schemas.pipeline import PipelineResponse
        pipeline_response = PipelineResponse(
            id=pipeline.id,
            name=pipeline.name,
            description=pipeline.description,
            is_default=pipeline.is_default,
            created_by_user_id=pipeline.created_by_user_id,
            created_at=pipeline.created_at,
            updated_at=pipeline.updated_at
        )
    else:
        # Pipeline padrão fictício para manter estrutura
        from app.schemas.pipeline import PipelineResponse
        pipeline_response = PipelineResponse(
            id=0,
            name="Funil de Vendas",
            description="Pipeline padrão",
            is_default=True,
            created_by_user_id=None,
            created_at=None,
            updated_at=None
        )
    
    return success_response(
        data=PipelineKanbanResponse(
            pipeline=pipeline_response,
            stages=stages_with_deals,
            clients=clients_response,
            clients_total=clients_total,
            clients_page=client_page,
            clients_page_size=client_page_size
        )
    )


@router.get("/{deal_id}", response_model=DealResponse)
def get_deal(
    deal_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Obtém um deal completo."""
    # Validar ID
    if deal_id <= 0:
        return error_response(
            code="INVALID_ID",
            message="ID do deal deve ser maior que 0",
            status_code=400
        )
    
    deal = db.query(Deal).options(
        joinedload(Deal.client),
        joinedload(Deal.assignees).joinedload(DealAssignee.user),
        joinedload(Deal.tag_links).joinedload(DealTagLink.tag),
        joinedload(Deal.activities).joinedload(DealActivity.created_by),
        joinedload(Deal.notes).joinedload(DealNote.author),
        joinedload(Deal.stage_history).joinedload(DealStageHistory.moved_by),
        joinedload(Deal.stage_history).joinedload(DealStageHistory.from_stage),
        joinedload(Deal.stage_history).joinedload(DealStageHistory.to_stage),
    ).filter(Deal.id == deal_id).first()
    
    if not deal:
        return error_response(
            code="DEAL_NOT_FOUND",
            message="Deal não encontrado",
            status_code=404
        )
    
    return success_response(data=_format_deal_response(deal))


@router.post("", response_model=DealResponse, status_code=status.HTTP_201_CREATED)
def create_deal(
    data: DealCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Cria um novo deal."""
    # Verificar se pipeline e stage existem
    pipeline = db.query(Pipeline).filter(Pipeline.id == data.pipeline_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline não encontrado")
    
    stage = db.query(PipelineStage).filter(
        PipelineStage.id == data.stage_id,
        PipelineStage.pipeline_id == data.pipeline_id
    ).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage não encontrada ou não pertence ao pipeline")
    
    # Verificar se cliente existe
    client = db.query(Cliente).filter(Cliente.id == data.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    # Calcular position_index (colocar no final da coluna)
    max_position = db.query(func.max(Deal.position_index)).filter(
        Deal.stage_id == data.stage_id
    ).scalar() or Decimal("0")
    position_index = max_position + Decimal("1")
    
    # Criar deal
    deal = Deal(
        pipeline_id=data.pipeline_id,
        stage_id=data.stage_id,
        client_id=data.client_id,
        title=data.title,
        value_cents=data.value_cents,
        currency=data.currency,
        probability=data.probability,
        expected_close_date=data.expected_close_date,
        priority=data.priority,
        status=data.status,
        source=data.source,
        proposal_id=data.proposal_id,
        contract_id=data.contract_id,
        position_index=position_index,
        created_by_user_id=current_user.id
    )
    db.add(deal)
    db.flush()
    
    # Adicionar assignees
    for user_id in data.assigned_user_ids:
        assignee = DealAssignee(deal_id=deal.id, user_id=user_id, role="collab")
        db.add(assignee)
    
    # Adicionar tags
    for tag_id in data.tag_ids:
        tag = db.query(DealTag).filter(DealTag.id == tag_id).first()
        if tag:
            tag_link = DealTagLink(deal_id=deal.id, tag_id=tag_id)
            db.add(tag_link)
    
    db.commit()
    db.refresh(deal)
    
    # Registrar auditoria
    audit = AuditEvent(
        event_type="DEAL_CREATED",
        actor_user_id=current_user.id,
        context_type="DEAL",
        context_id=str(deal.id),
        payload=f'{{"deal_id": {deal.id}, "title": "{deal.title}"}}'
    )
    db.add(audit)
    db.commit()
    
    # Carregar relacionamentos
    deal = db.query(Deal).options(
        joinedload(Deal.client),
        joinedload(Deal.assignees).joinedload(DealAssignee.user),
        joinedload(Deal.tag_links).joinedload(DealTagLink.tag),
        joinedload(Deal.activities),
        joinedload(Deal.notes),
        joinedload(Deal.stage_history),
    ).filter(Deal.id == deal.id).first()
    
    return success_response(data=_format_deal_response(deal), status_code=201)


@router.post("/from-client", response_model=DealResponse, status_code=status.HTTP_201_CREATED)
def create_deal_from_client(
    data: DealCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Cria um deal a partir de um cliente arrastado para uma coluna."""
    # Verificar se cliente existe
    client = db.query(Cliente).filter(Cliente.id == data.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    # Buscar pipeline padrão ou primeiro pipeline disponível
    pipeline = None
    if data.pipeline_id:
        pipeline = db.query(Pipeline).filter(Pipeline.id == data.pipeline_id).first()
    
    if not pipeline:
        pipeline = db.query(Pipeline).filter(Pipeline.is_default == True).first()
        if not pipeline:
            pipeline = db.query(Pipeline).first()
    
    if not pipeline:
        # Se não há pipeline, criar um padrão automaticamente
        from app.core.bootstrap import ensure_default_pipeline
        ensure_default_pipeline(db)
        pipeline = db.query(Pipeline).filter(Pipeline.is_default == True).first()
        if not pipeline:
            return error_response(
                code="NO_PIPELINE",
                message="Nenhum pipeline encontrado. Um pipeline padrão será criado automaticamente.",
                status_code=500
            )
    
    # Verificar se stage existe (pode ser stage padrão ou stage do pipeline)
    stage = None
    if data.stage_id:
        stage = db.query(PipelineStage).filter(
            PipelineStage.id == data.stage_id,
            PipelineStage.pipeline_id == pipeline.id
        ).first()
    
    if not stage:
        # Buscar primeira stage do pipeline
        stage = db.query(PipelineStage).filter(
            PipelineStage.pipeline_id == pipeline.id
        ).order_by(PipelineStage.order_index).first()
    
    if not stage:
        return error_response(
            code="NO_STAGE",
            message="Nenhuma etapa encontrada no pipeline.",
            status_code=404
        )
    
    # Verificar se já existe deal OPEN para este cliente neste pipeline
    existing_deal = db.query(Deal).filter(
        Deal.client_id == data.client_id,
        Deal.pipeline_id == pipeline.id,
        text("deals.status = 'open'")  # Usar text() para garantir string literal "open"
    ).first()
    if existing_deal:
        raise HTTPException(
            status_code=400,
            detail=f"Cliente já possui um deal aberto neste pipeline (Deal #{existing_deal.id})"
        )
    
    # Calcular position_index (colocar no topo da coluna)
    min_position = db.query(func.min(Deal.position_index)).filter(
        Deal.stage_id == stage.id
    ).scalar()
    if min_position is not None:
        position_index = Decimal(str(min_position)) - Decimal("1")
    else:
        position_index = Decimal("0")
    
    # Criar deal
    deal = Deal(
        pipeline_id=pipeline.id,
        stage_id=stage.id,
        client_id=data.client_id,
        title=data.title,
        value_cents=data.value_cents,
        currency=data.currency,
        probability=data.probability,
        expected_close_date=data.expected_close_date,
        priority=data.priority,
            status=DealStatus.OPEN.value,  # Usar .value para obter "open" (minúsculas)
        source=data.source,
        position_index=position_index,
        created_by_user_id=current_user.id
    )
    db.add(deal)
    db.flush()
    
    # Adicionar assignees (default: usuário atual se não especificado)
    assigned_ids = data.assigned_user_ids if data.assigned_user_ids else [current_user.id]
    for user_id in assigned_ids:
        assignee = DealAssignee(deal_id=deal.id, user_id=user_id, role="collab")
        db.add(assignee)
    
    # Adicionar tags
    for tag_id in data.tag_ids:
        tag = db.query(DealTag).filter(DealTag.id == tag_id).first()
        if tag:
            tag_link = DealTagLink(deal_id=deal.id, tag_id=tag_id)
            db.add(tag_link)
    
    # Adicionar nota inicial se fornecida
    if data.initial_note:
        note = DealNote(
            deal_id=deal.id,
            author_user_id=current_user.id,
            content=data.initial_note
        )
        db.add(note)
    
    # Criar atividade de follow-up se solicitado
    if data.create_followup_activity and data.followup_due_at:
        activity = DealActivity(
            deal_id=deal.id,
            type=DealActivityType.CUSTOM,
            title="Follow-up inicial",
            due_at=data.followup_due_at,
            created_by_user_id=current_user.id
        )
        db.add(activity)
    
    # Registrar histórico
    history = DealStageHistory(
        deal_id=deal.id,
        from_stage_id=None,  # Criado diretamente nesta stage
        to_stage_id=data.stage_id,
        moved_by_user_id=current_user.id,
        reason="Criado a partir de cliente arrastado",
        extra_metadata='{"source": "client_drag", "client_id": ' + str(data.client_id) + '}'
    )
    db.add(history)
    
    # Auditoria
    audit = AuditEvent(
        event_type="DEAL_CREATED_FROM_CLIENT",
        actor_user_id=current_user.id,
        context_type="DEAL",
        context_id=str(deal.id),
        payload=f'{{"deal_id": {deal.id}, "client_id": {data.client_id}, "title": "{deal.title}"}}'
    )
    db.add(audit)
    
    db.commit()
    db.refresh(deal)
    
    # Carregar relacionamentos
    deal = db.query(Deal).options(
        joinedload(Deal.client),
        joinedload(Deal.assignees).joinedload(DealAssignee.user),
        joinedload(Deal.tag_links).joinedload(DealTagLink.tag),
        joinedload(Deal.activities).joinedload(DealActivity.created_by),
        joinedload(Deal.notes).joinedload(DealNote.author),
        joinedload(Deal.stage_history).joinedload(DealStageHistory.moved_by),
        joinedload(Deal.stage_history).joinedload(DealStageHistory.from_stage),
        joinedload(Deal.stage_history).joinedload(DealStageHistory.to_stage),
    ).filter(Deal.id == deal.id).first()
    
    return _format_deal_response(deal)

# Endpoint move_deal para adicionar em deals.py
# Adicionar após a função create_deal_from_client

@router.post("/{deal_id}/move", response_model=DealResponse)
def move_deal(
    deal_id: int,
    data: DealMoveRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Move um deal para uma nova etapa (stage)."""
    # Validar ID
    if deal_id <= 0:
        return error_response(
            code="INVALID_ID",
            message="ID do deal deve ser maior que 0",
            status_code=400
        )
    
    # Buscar deal
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        return error_response(
            code="DEAL_NOT_FOUND",
            message="Deal não encontrado",
            status_code=404
        )
    
    # Verificar permissão
    if not _can_edit_deal(db, current_user, deal):
        return error_response(
            code="FORBIDDEN",
            message="Você não tem permissão para mover este deal",
            status_code=403
        )
    
    # Verificar se stage existe e pertence ao mesmo pipeline
    new_stage = db.query(PipelineStage).filter(
        PipelineStage.id == data.to_stage_id,
        PipelineStage.pipeline_id == deal.pipeline_id
    ).first()
    
    if not new_stage:
        return error_response(
            code="STAGE_NOT_FOUND",
            message="Stage não encontrada ou não pertence ao pipeline deste deal",
            status_code=404
        )
    
    # Se já está na mesma stage, retornar sem mudanças
    if deal.stage_id == data.to_stage_id:
        deal = db.query(Deal).options(
            joinedload(Deal.client),
            joinedload(Deal.assignees).joinedload(DealAssignee.user),
            joinedload(Deal.tag_links).joinedload(DealTagLink.tag),
            joinedload(Deal.activities).joinedload(DealActivity.created_by),
            joinedload(Deal.notes).joinedload(DealNote.author),
            joinedload(Deal.stage_history).joinedload(DealStageHistory.moved_by),
        ).filter(Deal.id == deal_id).first()
        return success_response(data=_format_deal_response(deal))
    
    # Calcular nova posição (topo da coluna)
    min_position = db.query(func.min(Deal.position_index)).filter(
        Deal.stage_id == data.to_stage_id
    ).scalar()
    if min_position is not None:
        new_position = Decimal(str(min_position)) - Decimal("1")
    else:
        new_position = Decimal("0")
    
    # Registrar histórico
    old_stage_id = deal.stage_id
    history = DealStageHistory(
        deal_id=deal.id,
        from_stage_id=old_stage_id,
        to_stage_id=data.to_stage_id,
        moved_by_user_id=current_user.id,
        reason=data.reason or "Movido via drag & drop",
        extra_metadata='{"source": "kanban_drag"}'
    )
    db.add(history)
    
    # Atualizar deal
    deal.stage_id = data.to_stage_id
    deal.position_index = new_position
    deal.updated_at = datetime.now()
    
    # Auditoria
    audit = AuditEvent(
        event_type="DEAL_MOVED",
        actor_user_id=current_user.id,
        context_type="DEAL",
        context_id=str(deal.id),
        payload=f'{{"deal_id": {deal.id}, "from_stage_id": {old_stage_id}, "to_stage_id": {data.to_stage_id}}}'
    )
    db.add(audit)
    
    db.commit()
    db.refresh(deal)
    
    # Carregar relacionamentos
    deal = db.query(Deal).options(
        joinedload(Deal.client),
        joinedload(Deal.assignees).joinedload(DealAssignee.user),
        joinedload(Deal.tag_links).joinedload(DealTagLink.tag),
        joinedload(Deal.activities).joinedload(DealActivity.created_by),
        joinedload(Deal.notes).joinedload(DealNote.author),
        joinedload(Deal.stage_history).joinedload(DealStageHistory.moved_by),
        joinedload(Deal.stage_history).joinedload(DealStageHistory.from_stage),
        joinedload(Deal.stage_history).joinedload(DealStageHistory.to_stage),
    ).filter(Deal.id == deal_id).first()
    
    return success_response(data=_format_deal_response(deal))

