import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class PreProposta(Base):
    """Pré-Proposta (Diagnóstico multi-etapas com score e qualificação)"""
    __tablename__ = "pre_proposals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clientes.id", ondelete="RESTRICT"), nullable=False, index=True)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(String(50), nullable=False, default="draft")  # draft, submitted, converted, archived
    score_total = Column(Integer, nullable=True)  # 0-100
    temperature = Column(String(20), nullable=True)  # cold, warm, hot
    summary = Column(Text, nullable=True)  # Resumo gerado automaticamente
    recommendations = Column(JSONB, nullable=True)  # Recomendações geradas
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    updated_by_user_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    client = relationship("Cliente")
    deal = relationship("Deal", foreign_keys=[deal_id])
    created_by = relationship("Usuario", foreign_keys=[created_by_user_id])
    updated_by = relationship("Usuario", foreign_keys=[updated_by_user_id])
    answers = relationship("PrePropostaAnswer", back_populates="pre_proposal", cascade="all, delete-orphan")
    converted_proposals = relationship("Proposta", foreign_keys="Proposta.from_pre_proposal_id", back_populates="from_pre_proposal")


class PrePropostaAnswer(Base):
    """Respostas do diagnóstico (por campo)"""
    __tablename__ = "pre_proposal_answers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    pre_proposal_id = Column(UUID(as_uuid=True), ForeignKey("pre_proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    step_key = Column(String(50), nullable=False)  # Ex: "step_1", "step_2"
    field_key = Column(String(100), nullable=False)  # Ex: "objetivo_principal", "orcamento_faixa"
    answer_json = Column(JSONB, nullable=False)  # Valor da resposta (pode ser string, number, array, object)
    weight = Column(Integer, nullable=True)  # Peso para cálculo de score (se aplicável)
    score = Column(Integer, nullable=True)  # Score individual (se aplicável)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    pre_proposal = relationship("PreProposta", back_populates="answers")

    __table_args__ = (
        {"comment": "Respostas do diagnóstico de pré-proposta"}
    )


class PrePropostaTemplate(Base):
    """Templates de diagnóstico (definição de steps/campos/validações/pesos)"""
    __tablename__ = "pre_proposal_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    schema_json = Column(JSONB, nullable=False)  # Definição completa do wizard
    is_default = Column(String(20), nullable=False, default="false")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        {"comment": "Templates de diagnóstico para pré-propostas"}
    )
