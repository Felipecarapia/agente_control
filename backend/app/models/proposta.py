import uuid
from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSON, JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Proposta(Base):
    __tablename__ = "propostas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    titulo = Column(String(255), nullable=False)
    descricao = Column(Text, nullable=True)
    valor = Column(Numeric(15, 2), nullable=True)
    cliente_id = Column(UUID(as_uuid=True), ForeignKey("clientes.id"), nullable=False)
    projeto_id = Column(UUID(as_uuid=True), ForeignKey("projetos.id"), nullable=True)
    deal_id = Column(Integer, ForeignKey("deals.id", ondelete="SET NULL"), nullable=True, index=True)
    from_pre_proposal_id = Column(Integer, ForeignKey("pre_proposals.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(String(50), default="rascunho", nullable=False)  # draft, sent, viewed, accepted, rejected, expired
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=True)
    updated_by_user_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    validade_ate = Column(Date, nullable=True)
    slug = Column(String(64), unique=True, nullable=True, index=True)
    landing_content = Column(JSON, nullable=True)
    # Novos campos para proposta aprimorada
    currency = Column(String(3), default="BRL", nullable=False)
    total_value_cents = Column(Integer, nullable=True)  # Valor total em centavos
    public_token = Column(String(64), unique=True, nullable=True, index=True)  # Token para aceite público
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    accepted_by_name = Column(String(255), nullable=True)
    accepted_ip = Column(String(45), nullable=True)
    accepted_user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    cliente = relationship("Cliente", back_populates="propostas")
    projeto = relationship("Projeto", back_populates="propostas")
    deal = relationship("Deal", foreign_keys=[deal_id])
    from_pre_proposal = relationship("PreProposta", foreign_keys=[from_pre_proposal_id], back_populates="converted_proposals")
    usuario = relationship("Usuario", foreign_keys=[usuario_id], back_populates="propostas")
    updated_by = relationship("Usuario", foreign_keys=[updated_by_user_id])
    contratos = relationship("Contrato", back_populates="proposta")
    
    # Novos relacionamentos
    sections = relationship("ProposalSection", back_populates="proposal", cascade="all, delete-orphan", order_by="ProposalSection.order_index")
    pricing_plans = relationship("ProposalPricingPlan", back_populates="proposal", cascade="all, delete-orphan")
    status_events = relationship("ProposalStatusEvent", back_populates="proposal", cascade="all, delete-orphan", order_by="ProposalStatusEvent.created_at.desc()")
    
    # Tracking
    tracking_sessions = relationship("ProposalSession", back_populates="proposta", cascade="all, delete-orphan")
    # Note: ProposalEvent do tracking.py existe separadamente
    analytics_summaries = relationship("ProposalAnalyticsSummary", back_populates="proposta", cascade="all, delete-orphan")


class ProposalSection(Base):
    """Seções editáveis da proposta"""
    __tablename__ = "proposal_sections"

    id = Column(Integer, primary_key=True, index=True)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("propostas.id", ondelete="CASCADE"), nullable=False, index=True)
    section_key = Column(String(50), nullable=False)  # Ex: "resumo_executivo", "escopo_trabalho"
    title = Column(String(255), nullable=False)
    content_json = Column(JSONB, nullable=False)  # Conteúdo rico (paragraphs, bullets, tables)
    order_index = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    proposal = relationship("Proposta", back_populates="sections")

    __table_args__ = (
        {"comment": "Seções editáveis da proposta comercial"}
    )


class ProposalPricingPlan(Base):
    """Planos de preço da proposta"""
    __tablename__ = "proposal_pricing_plans"

    id = Column(Integer, primary_key=True, index=True)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("propostas.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_name = Column(String(255), nullable=False)  # Ex: "Essencial", "Profissional", "Premium"
    plan_summary = Column(Text, nullable=True)
    includes_json = Column(JSONB, nullable=False)  # Lista de itens incluídos
    timeline_text = Column(Text, nullable=True)  # Prazo estimado
    price_cents = Column(Integer, nullable=False)  # Preço em centavos
    payment_terms_text = Column(Text, nullable=True)  # Condições de pagamento
    is_recommended = Column(String(20), nullable=False, server_default="false")
    is_selected_default = Column(String(20), nullable=False, server_default="false")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    proposal = relationship("Proposta", back_populates="pricing_plans")

    __table_args__ = (
        {"comment": "Planos de preço da proposta"}
    )


class ProposalStatusEvent(Base):
    """Eventos de status da proposta (CREATED, SENT, VIEWED, ACCEPTED, etc)"""
    __tablename__ = "proposal_status_events"

    id = Column(Integer, primary_key=True, index=True)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("propostas.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False, index=True)  # CREATED, UPDATED, SENT, VIEWED, ACCEPTED, REJECTED, EXPORTED_PDF
    payload_json = Column(JSONB, nullable=True)  # Dados extras do evento
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    proposal = relationship("Proposta", back_populates="status_events")

    __table_args__ = (
        {"comment": "Eventos de tracking da proposta"}
    )


class EmailOutbox(Base):
    """Fila de e-mails para envio transacional"""
    __tablename__ = "email_outbox"

    id = Column(Integer, primary_key=True, index=True)
    to_email = Column(String(255), nullable=False, index=True)
    subject = Column(String(500), nullable=False)
    html_body = Column(Text, nullable=False)
    status = Column(String(50), nullable=False, default="queued")  # queued, sent, failed
    provider_message_id = Column(String(255), nullable=True)
    error_text = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    sent_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        {"comment": "Fila de e-mails para envio transacional"}
    )
