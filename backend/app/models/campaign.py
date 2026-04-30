import uuid
import enum

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class CampaignType(str, enum.Enum):
    PROSPECTING = "prospecting"
    WHATSAPP_BLAST = "whatsapp_blast"
    EMAIL = "email"
    CUSTOM = "custom"


class CampaignStatus(str, enum.Enum):
    DRAFT = "draft"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"


class CampaignLeadSource(str, enum.Enum):
    GOOGLE_SEARCH = "google_search"
    GOOGLE_MAPS = "google_maps"
    MANUAL = "manual"


class CampaignLeadStatus(str, enum.Enum):
    FOUND = "found"
    QUEUED = "queued"
    CONTACTED = "contacted"
    RESPONDED = "responded"
    CONVERTED = "converted"


class Campaign(Base):
    """Campanha de marketing/prospecção"""
    __tablename__ = "campaigns"
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    tenant = relationship("Tenant")

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(
        SQLEnum(CampaignType, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20),
        nullable=False, default=CampaignType.PROSPECTING
    )
    status = Column(
        SQLEnum(CampaignStatus, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20),
        nullable=False, default=CampaignStatus.DRAFT
    )
    config_json = Column(JSONB, nullable=True)  # {city, activity, radius_km, max_results, ...}
    agent_id = Column(UUID(as_uuid=True), ForeignKey("ai_agents.id", ondelete="SET NULL"), nullable=True)
    whatsapp_connection_id = Column(UUID(as_uuid=True), ForeignKey("whatsapp_connections.id", ondelete="SET NULL"), nullable=True)
    total_leads_found = Column(Integer, nullable=False, default=0)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    created_by = relationship("Usuario", foreign_keys=[created_by_user_id])
    agent = relationship("AIAgent", back_populates="campaigns")
    whatsapp_connection = relationship("WhatsAppConnection")
    leads = relationship("CampaignLead", back_populates="campaign", cascade="all, delete-orphan")


class CampaignLead(Base):
    """Lead encontrado por uma campanha de prospecção"""
    __tablename__ = "campaign_leads"
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    tenant = relationship("Tenant")

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, index=True)
    business_name = Column(String(500), nullable=False)
    phone = Column(String(30), nullable=True)
    email = Column(String(255), nullable=True)
    website = Column(String(500), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(255), nullable=True)
    state = Column(String(100), nullable=True)
    category = Column(String(255), nullable=True)
    rating = Column(Float, nullable=True)
    source = Column(
        SQLEnum(CampaignLeadSource, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20),
        nullable=False, default=CampaignLeadSource.GOOGLE_MAPS
    )
    status = Column(
        SQLEnum(CampaignLeadStatus, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20),
        nullable=False, default=CampaignLeadStatus.FOUND
    )
    metadata_json = Column(JSONB, nullable=True)  # Dados extras (place_id, fotos, reviews, etc)
    found_at = Column(DateTime(timezone=True), server_default=func.now())
    contacted_at = Column(DateTime(timezone=True), nullable=True)

    campaign = relationship("Campaign", back_populates="leads")
    conversations = relationship("CampaignLeadConversation", back_populates="campaign_lead", cascade="all, delete-orphan")


class CampaignConvStatus(str, enum.Enum):
    ACTIVE = "active"
    CLOSED = "closed"
    CONVERTED = "converted"


class CampaignMsgRole(str, enum.Enum):
    AGENT = "agent"
    LEAD = "lead"
    SYSTEM = "system"


class CampaignMsgChannel(str, enum.Enum):
    WHATSAPP = "whatsapp"
    WEB = "web"


class CampaignLeadConversation(Base):
    """Conversa de outreach IA com um campaign lead."""
    __tablename__ = "campaign_lead_conversations"
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    tenant = relationship("Tenant")

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    campaign_lead_id = Column(UUID(as_uuid=True), ForeignKey("campaign_leads.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("ai_agents.id", ondelete="SET NULL"), nullable=True)
    whatsapp_connection_id = Column(UUID(as_uuid=True), ForeignKey("whatsapp_connections.id", ondelete="SET NULL"), nullable=True)
    remote_jid = Column(String(255), nullable=True)
    status = Column(
        SQLEnum(CampaignConvStatus, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20),
        nullable=False, default=CampaignConvStatus.ACTIVE
    )
    message_count = Column(Integer, nullable=False, default=0)
    interest_detected = Column(Boolean, nullable=False, default=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)

    campaign_lead = relationship("CampaignLead", back_populates="conversations")
    agent = relationship("AIAgent")
    whatsapp_connection = relationship("WhatsAppConnection")
    messages = relationship("CampaignLeadMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="CampaignLeadMessage.created_at")


class CampaignLeadMessage(Base):
    """Mensagem individual dentro de uma conversa de outreach."""
    __tablename__ = "campaign_lead_messages"
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    tenant = relationship("Tenant")

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("campaign_lead_conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(
        SQLEnum(CampaignMsgRole, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20),
        nullable=False
    )
    content = Column(Text, nullable=False)
    sent_via = Column(
        SQLEnum(CampaignMsgChannel, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20),
        nullable=False, default=CampaignMsgChannel.WHATSAPP
    )
    whatsapp_message_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    conversation = relationship("CampaignLeadConversation", back_populates="messages")