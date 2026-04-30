import enum
import uuid

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class LeadMessageRole(str, enum.Enum):
    AGENT = "agent"
    LEAD = "lead"
    SYSTEM = "system"


class LeadMessageChannel(str, enum.Enum):
    WHATSAPP = "whatsapp"
    WEB = "web"


class LeadConversationStatus(str, enum.Enum):
    ACTIVE = "active"
    CLOSED = "closed"


class Lead(Base):
    """Cadastro de leads."""
    __tablename__ = "leads"
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    tenant = relationship("Tenant")

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    # Dados básicos
    nome = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    telefone = Column(String(50), nullable=True)
    whatsapp = Column(String(50), nullable=True)
    empresa = Column(String(255), nullable=True)
    cargo = Column(String(255), nullable=True)
    site = Column(String(500), nullable=True)

    # Localização
    cidade = Column(String(100), nullable=True)
    estado = Column(String(2), nullable=True)

    # Classificação
    temperatura = Column(String(20), nullable=False, default="frio")  # frio | morno | quente | cliente
    status = Column(String(30), nullable=False, default="novo")  # novo | contatado | qualificado | proposta_enviada | negociando | ganho | perdido
    score = Column(Integer, nullable=True, default=0)  # 0-100

    # Origem / Tracking
    origem = Column(String(100), nullable=True)  # site | indicacao | google_ads | facebook_ads | instagram | linkedin | evento | cold_call | whatsapp | outro
    origem_detalhe = Column(String(500), nullable=True)  # detalhe livre (nome da campanha, quem indicou, etc.)
    utm_source = Column(String(255), nullable=True)
    utm_medium = Column(String(255), nullable=True)
    utm_campaign = Column(String(255), nullable=True)
    utm_term = Column(String(255), nullable=True)
    utm_content = Column(String(255), nullable=True)
    landing_page = Column(String(500), nullable=True)
    referrer = Column(String(500), nullable=True)

    # Interesse e necessidade
    interesse = Column(Text, nullable=True)  # no que tem interesse
    necessidade = Column(Text, nullable=True)  # qual a dor/necessidade
    orcamento_estimado = Column(Float, nullable=True)

    # Atribuição
    responsavel_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=True)
    cliente_id = Column(UUID(as_uuid=True), ForeignKey("clientes.id"), nullable=True)  # se converteu

    # Próxima ação
    proxima_acao = Column(String(500), nullable=True)
    proxima_acao_data = Column(DateTime(timezone=True), nullable=True)

    # Motivo de perda
    motivo_perda = Column(String(500), nullable=True)

    # Observações
    observacoes = Column(Text, nullable=True)

    # Metadados
    criado_por_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    convertido_em = Column(DateTime(timezone=True), nullable=True)
    ultimo_contato = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    responsavel = relationship("Usuario", foreign_keys=[responsavel_id])
    criado_por = relationship("Usuario", foreign_keys=[criado_por_id])
    cliente = relationship("Cliente", foreign_keys=[cliente_id])
    conversations = relationship("LeadConversation", back_populates="lead", cascade="all, delete-orphan")


class LeadConversation(Base):
    """Conversa de prospecção IA vinculada a um lead."""
    __tablename__ = "lead_conversations"
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    tenant = relationship("Tenant")

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("ai_agents.id", ondelete="SET NULL"), nullable=True)
    whatsapp_connection_id = Column(UUID(as_uuid=True), ForeignKey("whatsapp_connections.id", ondelete="SET NULL"), nullable=True)
    remote_jid = Column(String(255), nullable=True)  # LID ou JID do WhatsApp para responder
    status = Column(
        SQLEnum(LeadConversationStatus, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20),
        nullable=False, default=LeadConversationStatus.ACTIVE
    )
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)

    lead = relationship("Lead", back_populates="conversations")
    agent = relationship("AIAgent")
    whatsapp_connection = relationship("WhatsAppConnection")
    messages = relationship("LeadMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="LeadMessage.created_at")


class LeadMessage(Base):
    """Mensagem individual dentro de uma conversa lead/agente."""
    __tablename__ = "lead_messages"
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    tenant = relationship("Tenant")

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("lead_conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(
        SQLEnum(LeadMessageRole, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20),
        nullable=False
    )
    content = Column(Text, nullable=False)
    sent_via = Column(
        SQLEnum(LeadMessageChannel, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20),
        nullable=False, default=LeadMessageChannel.WHATSAPP
    )
    whatsapp_message_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    conversation = relationship("LeadConversation", back_populates="messages")
