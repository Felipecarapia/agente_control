import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Boolean, Numeric, Date, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.core.database import Base


class Pipeline(Base):
    """Pipeline de vendas (ex: Vendas, Parcerias, Retenção)"""
    __tablename__ = "pipelines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_default = Column(Boolean, default=False, nullable=False)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    created_by = relationship("Usuario", foreign_keys=[created_by_user_id])
    stages = relationship("PipelineStage", back_populates="pipeline", cascade="all, delete-orphan", order_by="PipelineStage.order_index")
    deals = relationship("Deal", back_populates="pipeline", cascade="all, delete-orphan")


class PipelineStage(Base):
    """Etapas/Colunas do pipeline (ex: Lead, Contato, Proposta, Negociação)"""
    __tablename__ = "pipeline_stages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    pipeline_id = Column(UUID(as_uuid=True), ForeignKey("pipelines.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    key = Column(String(50), nullable=True)  # Ex: PROPOSAL_SENT, WON, LOST
    order_index = Column(Integer, nullable=False)
    wip_limit = Column(Integer, nullable=True)  # Limite de cards na coluna
    color = Column(String(20), nullable=True)  # Ex: #3B82F6
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    pipeline = relationship("Pipeline", back_populates="stages")
    deals = relationship("Deal", back_populates="stage", cascade="all, delete-orphan")

    __table_args__ = (
        {"comment": "Etapas do pipeline de vendas"}
    )


class DealPriority(str, enum.Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class DealStatus(str, enum.Enum):
    OPEN = "open"
    WON = "won"
    LOST = "lost"


class DealSource(str, enum.Enum):
    INBOUND = "inbound"
    OUTBOUND = "outbound"
    INDICACAO = "indicacao"
    EVENTO = "evento"
    REDE_SOCIAL = "rede_social"
    OUTRO = "outro"


class Deal(Base):
    """Oportunidade/Deal (card do Kanban)"""
    __tablename__ = "deals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    pipeline_id = Column(UUID(as_uuid=True), ForeignKey("pipelines.id", ondelete="CASCADE"), nullable=False, index=True)
    stage_id = Column(UUID(as_uuid=True), ForeignKey("pipeline_stages.id", ondelete="RESTRICT"), nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clientes.id", ondelete="RESTRICT"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    value_cents = Column(Integer, nullable=True)  # Valor em centavos (ex: 100000 = R$ 1.000,00)
    currency = Column(String(3), default="BRL", nullable=False)
    probability = Column(Integer, default=0, nullable=False)  # 0-100
    expected_close_date = Column(Date, nullable=True)
    priority = Column(SQLEnum(DealPriority, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20), default=DealPriority.NORMAL, nullable=False)
    status = Column(SQLEnum(DealStatus, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20), default=DealStatus.OPEN, nullable=False)
    position_index = Column(Numeric(10, 2), nullable=False, default=0)  # Para ordenação manual
    source = Column(SQLEnum(DealSource, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20), nullable=True)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("propostas.id", ondelete="SET NULL"), nullable=True)  # Integração com Propostas
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contratos.id", ondelete="SET NULL"), nullable=True)  # Integração com Contratos
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    pipeline = relationship("Pipeline", back_populates="deals")
    stage = relationship("PipelineStage", back_populates="deals")
    client = relationship("Cliente")
    proposal = relationship("Proposta", foreign_keys=[proposal_id])
    contract = relationship("Contrato", foreign_keys=[contract_id])
    created_by = relationship("Usuario", foreign_keys=[created_by_user_id])
    assignees = relationship("DealAssignee", back_populates="deal", cascade="all, delete-orphan")
    tag_links = relationship("DealTagLink", back_populates="deal", cascade="all, delete-orphan")
    activities = relationship("DealActivity", back_populates="deal", cascade="all, delete-orphan", order_by="DealActivity.due_at")
    notes = relationship("DealNote", back_populates="deal", cascade="all, delete-orphan", order_by="DealNote.created_at.desc()")
    stage_history = relationship("DealStageHistory", back_populates="deal", cascade="all, delete-orphan", order_by="DealStageHistory.moved_at.desc()")


class DealAssignee(Base):
    """Responsáveis atribuídos a um Deal"""
    __tablename__ = "deal_assignees"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), default="collab", nullable=False)  # owner, collab
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    deal = relationship("Deal", back_populates="assignees")
    user = relationship("Usuario")

    __table_args__ = (
        {"comment": "Responsáveis atribuídos a deals"}
    )


class DealTag(Base):
    """Tags para categorizar deals"""
    __tablename__ = "deal_tags"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(100), nullable=False, unique=True)
    color = Column(String(20), nullable=True)  # Ex: #3B82F6
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    deal_links = relationship("DealTagLink", back_populates="tag", cascade="all, delete-orphan")


class DealTagLink(Base):
    """Relação entre Deal e Tag"""
    __tablename__ = "deal_tag_links"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id", ondelete="CASCADE"), nullable=False, index=True)
    tag_id = Column(UUID(as_uuid=True), ForeignKey("deal_tags.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    deal = relationship("Deal", back_populates="tag_links")
    tag = relationship("DealTag", back_populates="deal_links")


class DealActivityType(str, enum.Enum):
    CALL = "call"
    EMAIL = "email"
    MEETING = "meeting"
    WHATSAPP = "whatsapp"
    CUSTOM = "custom"


class DealActivity(Base):
    """Atividades/Tarefas de follow-up do Deal"""
    __tablename__ = "deal_activities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(SQLEnum(DealActivityType, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20), nullable=False)
    title = Column(String(255), nullable=False)
    due_at = Column(DateTime(timezone=True), nullable=True)
    done_at = Column(DateTime(timezone=True), nullable=True)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    deal = relationship("Deal", back_populates="activities")
    created_by = relationship("Usuario", foreign_keys=[created_by_user_id])


class DealNote(Base):
    """Comentários/Notas dentro do Deal"""
    __tablename__ = "deal_notes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id", ondelete="CASCADE"), nullable=False, index=True)
    author_user_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    deal = relationship("Deal", back_populates="notes")
    author = relationship("Usuario", foreign_keys=[author_user_id])


class DealStageHistory(Base):
    """Histórico de movimentação do Deal entre etapas (auditoria)"""
    __tablename__ = "deal_stage_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id", ondelete="CASCADE"), nullable=False, index=True)
    from_stage_id = Column(UUID(as_uuid=True), ForeignKey("pipeline_stages.id", ondelete="SET NULL"), nullable=True)
    to_stage_id = Column(UUID(as_uuid=True), ForeignKey("pipeline_stages.id", ondelete="RESTRICT"), nullable=False)
    moved_by_user_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    moved_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    reason = Column(Text, nullable=True)
    extra_metadata = Column(Text, nullable=True)  # JSON string com origem do movimento

    deal = relationship("Deal", back_populates="stage_history")
    from_stage = relationship("PipelineStage", foreign_keys=[from_stage_id])
    to_stage = relationship("PipelineStage", foreign_keys=[to_stage_id])
    moved_by = relationship("Usuario", foreign_keys=[moved_by_user_id])
