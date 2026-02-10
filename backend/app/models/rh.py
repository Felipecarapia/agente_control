import uuid
import enum

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Numeric, String, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class TipoContrato(str, enum.Enum):
    CLT = "clt"
    PJ = "pj"
    ESTAGIARIO = "estagiario"
    TEMPORARIO = "temporario"


class Funcionario(Base):
    """Funcionários / colaboradores da empresa."""
    __tablename__ = "funcionarios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    nome = Column(String(255), nullable=False)
    cpf = Column(String(14), nullable=True, unique=True)
    email = Column(String(255), nullable=True)
    telefone = Column(String(20), nullable=True)
    cargo = Column(String(255), nullable=True)
    departamento = Column(String(255), nullable=True)
    data_admissao = Column(Date, nullable=True)
    data_demissao = Column(Date, nullable=True)
    tipo_contrato = Column(
        SQLEnum(TipoContrato, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20),
        nullable=False, default=TipoContrato.CLT
    )
    salario_bruto = Column(Numeric(15, 2), nullable=False, default=0)
    vale_transporte = Column(Numeric(15, 2), nullable=True, default=0)
    vale_refeicao = Column(Numeric(15, 2), nullable=True, default=0)
    plano_saude = Column(Numeric(15, 2), nullable=True, default=0)
    outros_beneficios = Column(Numeric(15, 2), nullable=True, default=0)
    centro_custo_id = Column(UUID(as_uuid=True), ForeignKey("centros_custo.id", ondelete="SET NULL"), nullable=True)
    ativo = Column(Boolean, default=True, nullable=False)
    observacoes = Column(Text, nullable=True)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    centro_custo = relationship("CentroCusto")
    created_by = relationship("Usuario", foreign_keys=[created_by_user_id])
