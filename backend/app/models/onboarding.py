import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class ClienteOnboarding(Base):
    """Informações de onboarding do cliente (landing page, materiais, resultado)."""
    __tablename__ = "cliente_onboarding"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    cliente_id = Column(UUID(as_uuid=True), ForeignKey("clientes.id", ondelete="CASCADE"), nullable=False, unique=True)

    # Informações para landing page
    quem_somos = Column(Text, nullable=True)
    o_que_vendemos = Column(Text, nullable=True)
    para_quem_vendemos = Column(Text, nullable=True)
    diferenciais = Column(Text, nullable=True)
    perguntas_frequentes = Column(Text, nullable=True)

    # Materiais
    logo_url = Column(String(500), nullable=True)
    fotos_urls = Column(Text, nullable=True)  # JSON array de URLs
    redes_sociais = Column(Text, nullable=True)  # JSON: {"instagram": "...", "facebook": "...", ...}

    # Resultado esperado
    conteudo_base_site = Column(Text, nullable=True)
    conteudo_reutilizavel_bot = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    cliente = relationship("Cliente", back_populates="onboarding")


class ClienteMetaWhatsapp(Base):
    """Configuração Meta WhatsApp Oficial do cliente."""
    __tablename__ = "cliente_meta_whatsapp"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    cliente_id = Column(UUID(as_uuid=True), ForeignKey("clientes.id", ondelete="CASCADE"), nullable=False, unique=True)

    nome_aplicativo = Column(String(255), nullable=True)
    numero_oficial = Column(String(50), nullable=True)
    token_acesso = Column(Text, nullable=True)
    business_manager_id = Column(String(100), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    cliente = relationship("Cliente", back_populates="meta_whatsapp")


class ClienteContatoOperacional(Base):
    """Contatos operacionais do cliente."""
    __tablename__ = "cliente_contatos_operacionais"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    cliente_id = Column(UUID(as_uuid=True), ForeignKey("clientes.id", ondelete="CASCADE"), nullable=False)

    nome = Column(String(255), nullable=False)
    cargo = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    telefone = Column(String(50), nullable=True)
    observacao = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    cliente = relationship("Cliente", back_populates="contatos_operacionais")
