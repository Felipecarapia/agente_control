import uuid
from datetime import date, datetime
from typing import List, Optional
from decimal import Decimal
from pydantic import BaseModel

from app.models.pipeline import DealPriority, DealStatus, DealSource, DealActivityType


# ============== PIPELINE ==============

class PipelineBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_default: bool = False


class PipelineCreate(PipelineBase):
    pass


class PipelineUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_default: Optional[bool] = None


class PipelineResponse(PipelineBase):
    id: uuid.UUID
    created_by_user_id: Optional[uuid.UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============== PIPELINE STAGE ==============

class PipelineStageBase(BaseModel):
    name: str
    key: Optional[str] = None
    order_index: int
    wip_limit: Optional[int] = None
    color: Optional[str] = None


class PipelineStageCreate(PipelineStageBase):
    pass


class PipelineStageUpdate(BaseModel):
    name: Optional[str] = None
    key: Optional[str] = None
    order_index: Optional[int] = None
    wip_limit: Optional[int] = None
    color: Optional[str] = None


class PipelineStageResponse(PipelineStageBase):
    id: uuid.UUID
    pipeline_id: uuid.UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PipelineStageReorderRequest(BaseModel):
    stages: List[dict]  # [{stageId: uuid, orderIndex: int}]


# ============== DEAL TAG ==============

class DealTagBase(BaseModel):
    name: str
    color: Optional[str] = None


class DealTagCreate(DealTagBase):
    pass


class DealTagResponse(DealTagBase):
    id: uuid.UUID
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============== DEAL ==============

class DealBase(BaseModel):
    title: str
    client_id: uuid.UUID
    value_cents: Optional[int] = None
    currency: str = "BRL"
    probability: int = 0  # 0-100
    expected_close_date: Optional[date] = None
    priority: DealPriority = DealPriority.NORMAL
    status: DealStatus = DealStatus.OPEN
    source: Optional[DealSource] = None
    proposal_id: Optional[uuid.UUID] = None
    contract_id: Optional[uuid.UUID] = None
    assigned_user_ids: List[uuid.UUID] = []
    tag_ids: List[uuid.UUID] = []


class DealCreate(DealBase):
    pipeline_id: uuid.UUID
    stage_id: uuid.UUID


class DealCreateFromClient(BaseModel):
    """Schema para criar deal a partir de cliente arrastado"""
    client_id: uuid.UUID
    pipeline_id: Optional[uuid.UUID] = None
    stage_id: Optional[uuid.UUID] = None
    title: str
    value_cents: Optional[int] = None
    currency: str = "BRL"
    probability: int = 0
    expected_close_date: Optional[date] = None
    priority: DealPriority = DealPriority.NORMAL
    source: Optional[DealSource] = None
    assigned_user_ids: List[uuid.UUID] = []
    tag_ids: List[uuid.UUID] = []
    initial_note: Optional[str] = None
    create_followup_activity: bool = False
    followup_due_at: Optional[datetime] = None


class DealUpdate(BaseModel):
    title: Optional[str] = None
    client_id: Optional[uuid.UUID] = None
    value_cents: Optional[int] = None
    currency: Optional[str] = None
    probability: Optional[int] = None
    expected_close_date: Optional[date] = None
    priority: Optional[DealPriority] = None
    status: Optional[DealStatus] = None
    source: Optional[DealSource] = None
    proposal_id: Optional[uuid.UUID] = None
    contract_id: Optional[uuid.UUID] = None
    assigned_user_ids: Optional[List[uuid.UUID]] = None
    tag_ids: Optional[List[uuid.UUID]] = None


class DealMoveRequest(BaseModel):
    to_stage_id: uuid.UUID
    to_position_index: Optional[Decimal] = None
    before_deal_id: Optional[uuid.UUID] = None
    after_deal_id: Optional[uuid.UUID] = None
    reason: Optional[str] = None


class DealAssigneeResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    user_nome: Optional[str] = None
    role: str

    class Config:
        from_attributes = True


class DealTagLinkResponse(BaseModel):
    id: uuid.UUID
    tag_id: uuid.UUID
    tag_name: Optional[str] = None
    tag_color: Optional[str] = None

    class Config:
        from_attributes = True


class DealActivityResponse(BaseModel):
    id: uuid.UUID
    type: DealActivityType
    title: str
    due_at: Optional[datetime] = None
    done_at: Optional[datetime] = None
    created_by_user_id: Optional[uuid.UUID] = None
    created_by_nome: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DealNoteResponse(BaseModel):
    id: uuid.UUID
    author_user_id: Optional[uuid.UUID] = None
    author_nome: Optional[str] = None
    content: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DealStageHistoryResponse(BaseModel):
    id: uuid.UUID
    from_stage_id: Optional[uuid.UUID] = None
    from_stage_name: Optional[str] = None
    to_stage_id: uuid.UUID
    to_stage_name: Optional[str] = None
    moved_by_user_id: Optional[uuid.UUID] = None
    moved_by_nome: Optional[str] = None
    moved_at: Optional[datetime] = None
    reason: Optional[str] = None

    class Config:
        from_attributes = True


class DealResponse(DealBase):
    id: uuid.UUID
    pipeline_id: uuid.UUID
    stage_id: uuid.UUID
    position_index: Decimal
    created_by_user_id: Optional[uuid.UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Relacionamentos
    assignees: List[DealAssigneeResponse] = []
    tags: List[DealTagLinkResponse] = []
    activities: List[DealActivityResponse] = []
    notes: List[DealNoteResponse] = []
    stage_history: List[DealStageHistoryResponse] = []

    class Config:
        from_attributes = True


class DealKanbanResponse(BaseModel):
    """Resposta otimizada para o Kanban board"""
    id: uuid.UUID
    title: str
    client_id: uuid.UUID
    client_nome: Optional[str] = None
    value_cents: Optional[int] = None
    currency: str
    probability: int
    expected_close_date: Optional[date] = None
    priority: DealPriority
    status: DealStatus
    position_index: float  # Convertido de Decimal para float para serialização JSON
    assignees: List[DealAssigneeResponse] = []
    tags: List[DealTagLinkResponse] = []
    has_pending_activity: bool = False

    class Config:
        from_attributes = True


class StageWithDealsResponse(BaseModel):
    """Stage com seus deals para o Kanban"""
    stage: PipelineStageResponse
    deals: List[DealKanbanResponse] = []
    total_value_cents: int = 0
    deal_count: int = 0


class ClientListItem(BaseModel):
    """Item da lista de clientes para o Kanban"""
    id: uuid.UUID
    nome: str
    razao_social: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    celular: Optional[str] = None
    has_open_deal: bool = False  # Se já tem deal OPEN neste pipeline

    class Config:
        from_attributes = True


class PipelineKanbanResponse(BaseModel):
    """Pipeline completo com stages e deals agrupados"""
    pipeline: PipelineResponse
    stages: List[StageWithDealsResponse] = []
    clients: List[ClientListItem] = []  # Lista de clientes para arrastar
    clients_total: int = 0  # Total de clientes (para paginação)
    clients_page: int = 1
    clients_page_size: int = 20


# ============== DEAL ACTIVITY ==============

class DealActivityCreate(BaseModel):
    type: DealActivityType
    title: str
    due_at: Optional[datetime] = None


class DealActivityUpdate(BaseModel):
    title: Optional[str] = None
    due_at: Optional[datetime] = None
    done_at: Optional[datetime] = None


# ============== DEAL NOTE ==============

class DealNoteCreate(BaseModel):
    content: str


# ============== BULK ACTIONS ==============

class DealBulkActionRequest(BaseModel):
    deal_ids: List[uuid.UUID]
    action: str  # move_stage, assign_user, add_tag, set_priority
    params: dict  # Parâmetros específicos da ação
