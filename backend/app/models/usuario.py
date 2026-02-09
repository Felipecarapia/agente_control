import uuid
from sqlalchemy import Boolean, Column, DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    nome = Column(String(255), nullable=False)
    ativo = Column(Boolean, default=True, nullable=False)
    # Campos de perfil
    avatar_url = Column(Text, nullable=True)
    bio = Column(Text, nullable=True)
    phone = Column(String(50), nullable=True)
    presence_status = Column(String(20), nullable=True)  # online, away, busy, offline
    notification_prefs = Column(JSONB, nullable=True)  # {toasts: true, sound: false, muteCategories: []}
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    clientes = relationship("Cliente", back_populates="criado_por_usuario")
    projetos = relationship("Projeto", back_populates="usuario")
    tarefas_responsavel = relationship("Tarefa", back_populates="responsavel", foreign_keys="Tarefa.responsavel_id")
    propostas = relationship("Proposta", back_populates="usuario", foreign_keys="Proposta.usuario_id")
    user_roles = relationship("UserRole", back_populates="user", cascade="all, delete-orphan")
