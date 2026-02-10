from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base

class TaskEvent(Base):
    __tablename__ = "task_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tarefas.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=True) # Quem fez a ação
    
    type = Column(String(50), nullable=False) # STATUS_CHANGE, COMMENT, ASSIGN, CREATE, BLOCK
    from_value = Column(String(255), nullable=True)
    to_value = Column(String(255), nullable=True)
    meta_json = Column(JSONB, nullable=True) # Detalhes extras
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relacionamentos
    task = relationship("Tarefa", backref="events")
    user = relationship("Usuario")
