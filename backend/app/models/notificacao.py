from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.core.database import Base


class NotificationType(str, enum.Enum):
    PROJECT_NUDGE = "PROJECT_NUDGE"
    TASK_NUDGE = "TASK_NUDGE"  # Cobrança de tarefas
    DIRECT_MESSAGE = "DIRECT_MESSAGE"
    SYSTEM = "SYSTEM"
    TASK_MENTION = "TASK_MENTION"
    PROPOSAL_UPDATE = "PROPOSAL_UPDATE"
    CONTRACT_UPDATE = "CONTRACT_UPDATE"


class NotificationPriority(str, enum.Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    type = Column(SQLEnum(NotificationType, native_enum=False, length=50), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    priority = Column(SQLEnum(NotificationPriority, native_enum=False, length=20), default=NotificationPriority.NORMAL.value, nullable=False)
    author_user_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    context_type = Column(String(50), nullable=True, index=True)  # PROJECT, TASK, PROPOSAL, CONTRACT
    context_id = Column(String(255), nullable=True, index=True)
    action_url = Column(Text, nullable=True)  # Deep link interno
    extra_data = Column(JSONB, nullable=True)  # Dados extras (metadata é palavra reservada)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    author = relationship("Usuario", foreign_keys=[author_user_id])
    recipients = relationship("NotificationRecipient", back_populates="notification", cascade="all, delete-orphan")


class NotificationRecipient(Base):
    __tablename__ = "notification_recipients"

    id = Column(Integer, primary_key=True, index=True)
    notification_id = Column(UUID(as_uuid=True), ForeignKey("notifications.id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_user_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    delivered_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True, index=True)
    archived_at = Column(DateTime(timezone=True), nullable=True)
    pinned_at = Column(DateTime(timezone=True), nullable=True)
    muted = Column(Boolean, default=False, nullable=False)

    notification = relationship("Notification", back_populates="recipients")
    recipient = relationship("Usuario", foreign_keys=[recipient_user_id])

    __table_args__ = (
        {"comment": "Inbox por usuário: cada notificação pode ter múltiplos destinatários"}
    )

