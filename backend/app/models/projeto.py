from sqlalchemy import BigInteger, Column, Date, DateTime, ForeignKey, Numeric, String, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.core.database import Base

class ExpenseCategory(str, enum.Enum):
    DOMAIN = "DOMAIN"
    ADS = "ADS"
    TOOLS = "TOOLS"
    HUMAN_RESOURCES = "HUMAN_RESOURCES"
    OTHER = "OTHER"

class ProjectExpense(Base):
    __tablename__ = "project_expenses"
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    tenant = relationship("Tenant")

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projetos.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    category = Column(SQLEnum(ExpenseCategory, native_enum=False), nullable=False, default=ExpenseCategory.OTHER, index=True)
    amount_cents = Column(BigInteger, nullable=False)
    occurred_at = Column(Date, nullable=False, default=func.now(), index=True)
    vendor = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    project = relationship("Projeto", back_populates="expenses")
    created_by = relationship("Usuario")

class Projeto(Base):
    __tablename__ = "projetos"
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    tenant = relationship("Tenant")

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tipo = Column(String(50), default="desenvolvimento_software", nullable=False)  # desenvolvimento_software, marketing, infoproduto, lancamento
    nome = Column(String(255), nullable=False)
    descricao = Column(Text, nullable=True)
    cliente_id = Column(UUID(as_uuid=True), ForeignKey("clientes.id"), nullable=False)
    status = Column(String(50), default="ativo", nullable=False)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=True)
    data_inicio = Column(Date, nullable=True)
    data_fim = Column(Date, nullable=True)
    
    # Financeiro (Legacy fields kept for compatibility)
    valor_orcado = Column(Numeric(15, 2), nullable=True)
    valor_realizado = Column(Numeric(15, 2), nullable=True)
    moeda = Column(String(3), default="BRL", nullable=False)
    observacoes_financeiras = Column(Text, nullable=True)

    # New Financial Fields
    budget_cents = Column(BigInteger, default=0, nullable=False)
    # expected_revenue_cents = Column(BigInteger, default=0, nullable=False) # Optional per prompt, but ROI needs it
    expected_revenue_cents = Column(BigInteger, default=0, nullable=False)
    actual_revenue_cents = Column(BigInteger, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    cliente = relationship("Cliente", back_populates="projetos")
    usuario = relationship("Usuario", back_populates="projetos")
    tarefas = relationship("Tarefa", back_populates="projeto")
    propostas = relationship("Proposta", back_populates="projeto")
    contratos = relationship("Contrato", back_populates="projeto")
    expenses = relationship("ProjectExpense", back_populates="project", cascade="all, delete-orphan")
