import uuid
import enum

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class WhatsAppProvider(str, enum.Enum):
    EVOLUTION = "evolution"
    OFFICIAL = "official"


class WhatsAppConnectionStatus(str, enum.Enum):
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"


class WhatsAppConnection(Base):
    """Conexão WhatsApp (Evolution API ou API Oficial Meta)"""
    __tablename__ = "whatsapp_connections"
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    tenant = relationship("Tenant")

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    phone_number = Column(String(20), nullable=True)
    provider = Column(
        SQLEnum(WhatsAppProvider, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20),
        nullable=False, default=WhatsAppProvider.EVOLUTION
    )
    api_url = Column(String(500), nullable=False)
    api_key = Column(String(500), nullable=False)
    instance_name = Column(String(255), nullable=True)  # Usado pela Evolution API
    status = Column(
        SQLEnum(WhatsAppConnectionStatus, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20),
        nullable=False, default=WhatsAppConnectionStatus.DISCONNECTED
    )
    webhook_url = Column(String(500), nullable=True)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    created_by = relationship("Usuario", foreign_keys=[created_by_user_id])
    agents = relationship("AIAgent", back_populates="whatsapp_connection")
