import uuid
import enum

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class AIAgentProvider(str, enum.Enum):
    OPENAI = "openai"
    GEMINI = "gemini"


class ConversationChannel(str, enum.Enum):
    WHATSAPP = "whatsapp"
    WEB = "web"


class ConversationStatus(str, enum.Enum):
    ACTIVE = "active"
    CLOSED = "closed"


class AIAgent(Base):
    """Agente de IA configurável para atendimento e automação"""
    __tablename__ = "ai_agents"
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    tenant = relationship("Tenant")

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    avatar_url = Column(Text, nullable=True)
    system_prompt = Column(Text, nullable=False)
    provider = Column(
        SQLEnum(AIAgentProvider, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20),
        nullable=False, default=AIAgentProvider.OPENAI
    )
    model = Column(String(100), nullable=False, default="gpt-4o-mini")
    temperature = Column(Float, nullable=False, default=0.7)
    max_tokens = Column(Integer, nullable=True, default=1024)
    tools_json = Column(JSONB, nullable=True)  # Ferramentas disponíveis para o agente
    knowledge_base_json = Column(JSONB, nullable=True)  # Documentos/contexto do agente
    whatsapp_connection_id = Column(UUID(as_uuid=True), ForeignKey("whatsapp_connections.id", ondelete="SET NULL"), nullable=True)
    cliente_id = Column(UUID(as_uuid=True), ForeignKey("clientes.id", ondelete="SET NULL"), nullable=True, index=True)
    google_client_id = Column(String(255), nullable=True)
    google_calendar_id = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    created_by = relationship("Usuario", foreign_keys=[created_by_user_id])
    cliente = relationship("Cliente")
    whatsapp_connection = relationship("WhatsAppConnection", back_populates="agents")
    conversations = relationship("AgentConversation", back_populates="agent", cascade="all, delete-orphan")
    campaigns = relationship("Campaign", back_populates="agent")


class AgentConversation(Base):
    """Histórico de conversas do agente"""
    __tablename__ = "agent_conversations"
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    tenant = relationship("Tenant")

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("ai_agents.id", ondelete="CASCADE"), nullable=False, index=True)
    external_phone = Column(String(20), nullable=True)
    channel = Column(
        SQLEnum(ConversationChannel, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20),
        nullable=False, default=ConversationChannel.WEB
    )
    status = Column(
        SQLEnum(ConversationStatus, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20),
        nullable=False, default=ConversationStatus.ACTIVE
    )
    messages_json = Column(JSONB, nullable=True)  # [{role, content, timestamp}]
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)

    agent = relationship("AIAgent", back_populates="conversations")


class AgentLog(Base):
    """Registro de logs de ações e consumo de tokens do agente"""
    __tablename__ = "agent_logs"
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    tenant = relationship("Tenant")

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("ai_agents.id", ondelete="CASCADE"), nullable=True, index=True)
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(255), nullable=False) # e.g. "RESPOND_MESSAGE", "TOOL_CALL"
    details = Column(Text, nullable=True) # JSON or Text with what happened
    tokens_used = Column(Integer, nullable=True, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    agent = relationship("AIAgent")
    lead = relationship("Lead")
