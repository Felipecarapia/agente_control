import uuid
from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Tarefa(Base):
    __tablename__ = "tarefas"
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    tenant = relationship("Tenant")

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    titulo = Column(String(255), nullable=False)
    descricao = Column(Text, nullable=True)
    projeto_id = Column(UUID(as_uuid=True), ForeignKey("projetos.id"), nullable=True)
    status = Column(String(50), default="pendente", nullable=False)
    prioridade = Column(String(20), nullable=True)
    responsavel_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=True)
    data_vencimento = Column(Date, nullable=True)
    
    # Campos de recorrência
    is_recurring = Column(Boolean, default=False, nullable=False)
    recurrence_type = Column(String(20), nullable=True)  # diaria, semanal, mensal
    recurrence_interval = Column(Integer, nullable=True)  # a cada X dias/semanas/meses
    recurrence_end_date = Column(Date, nullable=True)  # até quando gerar tarefas
    parent_task_id = Column(UUID(as_uuid=True), ForeignKey("tarefas.id"), nullable=True)  # tarefa original que gerou esta
    
    # Novos campos para sistema Notion
    task_database_id = Column(UUID(as_uuid=True), ForeignKey("task_databases.id", ondelete="SET NULL"), nullable=True, index=True)
    context_type = Column(String(50), nullable=True)  # CLIENT, PROJECT, DEAL
    context_id = Column(UUID(as_uuid=True), nullable=True)  # ID do contexto - pode ser client/project/deal (UUID)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    completed_by_user_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    projeto = relationship("Projeto", back_populates="tarefas")
    responsavel = relationship("Usuario", back_populates="tarefas_responsavel", foreign_keys=[responsavel_id])
    parent_task = relationship("Tarefa", remote_side=[id], backref="child_tasks")
    assignees = relationship("TarefaAssignee", back_populates="tarefa", cascade="all, delete-orphan")
    
    # Novos relacionamentos Notion
    task_database = relationship("TaskDatabase", back_populates="tasks", foreign_keys=[task_database_id])
    property_values = relationship("TaskPropertyValue", back_populates="task", cascade="all, delete-orphan")
    blocks = relationship("TaskBlock", back_populates="task", cascade="all, delete-orphan", order_by="TaskBlock.order_index")
    comments = relationship("TaskComment", back_populates="task", cascade="all, delete-orphan", order_by="TaskComment.created_at")
    mentions = relationship("TaskMention", back_populates="task", cascade="all, delete-orphan")
    attachments = relationship("TaskAttachment", back_populates="task", cascade="all, delete-orphan")
    completed_by = relationship("Usuario", foreign_keys=[completed_by_user_id])


class TarefaAssignee(Base):
    """Tabela para atribuir múltiplos usuários a uma tarefa"""
    __tablename__ = "tarefa_assignees"
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    tenant = relationship("Tenant")

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tarefa_id = Column(UUID(as_uuid=True), ForeignKey("tarefas.id", ondelete="CASCADE"), nullable=False, index=True)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tarefa = relationship("Tarefa", back_populates="assignees")
    usuario = relationship("Usuario")

    __table_args__ = (
        {"comment": "Permite atribuir múltiplos usuários a uma tarefa"}
    )
