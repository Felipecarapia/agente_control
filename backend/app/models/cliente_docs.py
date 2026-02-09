import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class ClienteDocumentoRAG(Base):
    """Documentos para treinamento de bots (RAG)."""
    __tablename__ = "cliente_documentos_rag"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    cliente_id = Column(UUID(as_uuid=True), ForeignKey("clientes.id", ondelete="CASCADE"), nullable=False)

    nome_original = Column(String(500), nullable=False)
    nome_storage = Column(String(500), nullable=False)
    url = Column(String(1000), nullable=False)
    content_type = Column(String(100), nullable=True)
    tamanho_bytes = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    cliente = relationship("Cliente", back_populates="documentos_rag")


class ClienteImagem(Base):
    """Imagens gerais do cliente."""
    __tablename__ = "cliente_imagens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    cliente_id = Column(UUID(as_uuid=True), ForeignKey("clientes.id", ondelete="CASCADE"), nullable=False)

    nome_original = Column(String(500), nullable=False)
    nome_storage = Column(String(500), nullable=False)
    url = Column(String(1000), nullable=False)
    content_type = Column(String(100), nullable=True)
    tamanho_bytes = Column(Integer, nullable=True)
    descricao = Column(String(500), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    cliente = relationship("Cliente", back_populates="imagens")


class ClienteCronogramaEtapa(Base):
    """Etapas do cronograma operacional do projeto do cliente."""
    __tablename__ = "cliente_cronograma_etapas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    cliente_id = Column(UUID(as_uuid=True), ForeignKey("clientes.id", ondelete="CASCADE"), nullable=False)

    ordem = Column(Integer, nullable=False, default=0)
    titulo = Column(String(255), nullable=False)
    descricao = Column(Text, nullable=True)
    cor = Column(String(20), nullable=True, default="blue")  # cor do card

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    cliente = relationship("Cliente", back_populates="cronograma_etapas")
    itens = relationship("ClienteCronogramaItem", back_populates="etapa", cascade="all, delete-orphan", order_by="ClienteCronogramaItem.ordem")


class ClienteCronogramaItem(Base):
    """Itens individuais de checklist dentro de uma etapa."""
    __tablename__ = "cliente_cronograma_itens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    etapa_id = Column(UUID(as_uuid=True), ForeignKey("cliente_cronograma_etapas.id", ondelete="CASCADE"), nullable=False)

    ordem = Column(Integer, nullable=False, default=0)
    texto = Column(String(500), nullable=False)
    concluido = Column(Boolean, nullable=False, default=False)
    categoria = Column(String(100), nullable=True)  # "ação", "decisão", "resultado"

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    etapa = relationship("ClienteCronogramaEtapa", back_populates="itens")
