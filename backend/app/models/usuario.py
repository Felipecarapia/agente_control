from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    nome = Column(String(255), nullable=False)
    ativo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    clientes = relationship("Cliente", back_populates="criado_por_usuario")
    projetos = relationship("Projeto", back_populates="usuario")
    tarefas_responsavel = relationship("Tarefa", back_populates="responsavel")
    propostas = relationship("Proposta", back_populates="usuario")
