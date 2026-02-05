from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Tarefa(Base):
    __tablename__ = "tarefas"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(255), nullable=False)
    descricao = Column(Text, nullable=True)
    projeto_id = Column(Integer, ForeignKey("projetos.id"), nullable=False)
    status = Column(String(50), default="pendente", nullable=False)
    prioridade = Column(String(20), nullable=True)
    responsavel_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    data_vencimento = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    projeto = relationship("Projeto", back_populates="tarefas")
    responsavel = relationship("Usuario", back_populates="tarefas_responsavel")
