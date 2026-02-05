from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Proposta(Base):
    __tablename__ = "propostas"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(255), nullable=False)
    descricao = Column(Text, nullable=True)
    valor = Column(Numeric(15, 2), nullable=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    projeto_id = Column(Integer, ForeignKey("projetos.id"), nullable=True)
    status = Column(String(50), default="rascunho", nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    validade_ate = Column(Date, nullable=True)
    slug = Column(String(64), unique=True, nullable=True, index=True)
    landing_content = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    cliente = relationship("Cliente", back_populates="propostas")
    projeto = relationship("Projeto", back_populates="propostas")
    usuario = relationship("Usuario", back_populates="propostas")
    contratos = relationship("Contrato", back_populates="proposta")
    
    # Tracking
    tracking_sessions = relationship("ProposalSession", back_populates="proposta", cascade="all, delete-orphan")
    tracking_events = relationship("ProposalEvent", back_populates="proposta", cascade="all, delete-orphan")
    analytics_summaries = relationship("ProposalAnalyticsSummary", back_populates="proposta", cascade="all, delete-orphan")
