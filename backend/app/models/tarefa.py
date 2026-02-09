import uuid

from sqlalchemy import Column, Date, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Tarefa(Base):
    __tablename__ = "tarefas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    titulo = Column(String(255), nullable=False)
    descricao = Column(Text, nullable=True)
    projeto_id = Column(UUID(as_uuid=True), ForeignKey("projetos.id"), nullable=False)
    status = Column(String(50), default="pendente", nullable=False)
    prioridade = Column(String(20), nullable=True)
    responsavel_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=True)
    data_vencimento = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    projeto = relationship("Projeto", back_populates="tarefas")
    responsavel = relationship("Usuario", back_populates="tarefas_responsavel")
