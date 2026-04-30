import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Cliente(Base):
    __tablename__ = "clientes"
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    tenant = relationship("Tenant")

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tipo = Column(String(2), nullable=False, default="pf")  # pf | pj
    nome = Column(String(255), nullable=False)  # nome completo (PF) ou nome fantasia (PJ)
    razao_social = Column(String(255), nullable=True)  # PJ
    cpf = Column(String(14), nullable=True)  # PF
    cnpj = Column(String(18), nullable=True)  # PJ
    rg = Column(String(20), nullable=True)  # PF
    inscricao_estadual = Column(String(20), nullable=True)  # PJ
    email = Column(String(255), nullable=True)
    telefone = Column(String(50), nullable=True)
    celular = Column(String(50), nullable=True)
    cep = Column(String(9), nullable=True)
    endereco = Column(String(255), nullable=True)  # logradouro
    numero = Column(String(20), nullable=True)
    complemento = Column(String(100), nullable=True)
    bairro = Column(String(100), nullable=True)
    cidade = Column(String(100), nullable=True)
    estado = Column(String(2), nullable=True)
    logo_url = Column(String(1000), nullable=True)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    criado_por_usuario = relationship("Usuario", back_populates="clientes")
    projetos = relationship("Projeto", back_populates="cliente")
    propostas = relationship("Proposta", back_populates="cliente")
    contratos = relationship("Contrato", back_populates="cliente")

    # Onboarding
    onboarding = relationship("ClienteOnboarding", back_populates="cliente", uselist=False, cascade="all, delete-orphan")
    meta_whatsapp = relationship("ClienteMetaWhatsapp", back_populates="cliente", uselist=False, cascade="all, delete-orphan")
    contatos_operacionais = relationship("ClienteContatoOperacional", back_populates="cliente", cascade="all, delete-orphan")

    # Documentos, Imagens e Cronograma
    documentos_rag = relationship("ClienteDocumentoRAG", back_populates="cliente", cascade="all, delete-orphan")
    imagens = relationship("ClienteImagem", back_populates="cliente", cascade="all, delete-orphan")
    cronograma_etapas = relationship("ClienteCronogramaEtapa", back_populates="cliente", cascade="all, delete-orphan", order_by="ClienteCronogramaEtapa.ordem")
