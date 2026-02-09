from app.models.usuario import Usuario
from app.models.cliente import Cliente
from app.models.projeto import Projeto
from app.models.tarefa import Tarefa, TarefaAssignee
from app.models.task_notion import (
    TaskDatabase, TaskProperty, TaskPropertyValue, TaskView,
    TaskBlock, TaskComment, TaskMention, TaskAttachment, TaskTemplate
)
from app.models.proposta import Proposta, ProposalSection, ProposalPricingPlan, ProposalStatusEvent, EmailOutbox
from app.models.pre_proposta import PreProposta, PrePropostaAnswer, PrePropostaTemplate
from app.models.contrato import Contrato
# Tracking (compatibilidade com main)
from app.models.tracking import ProposalSession, ProposalEvent as ProposalEventLegacy, ProposalAnalyticsSummary
# Módulos novos da main
from app.models.onboarding import ClienteOnboarding, ClienteMetaWhatsapp, ClienteContatoOperacional
from app.models.cliente_docs import ClienteDocumentoRAG, ClienteImagem, ClienteCronogramaEtapa, ClienteCronogramaItem
from app.models.lead import Lead
# Módulos novos criados localmente
from app.models.role import Role, UserRole
from app.models.permission import Permission, RolePermission
from app.models.notificacao import Notification, NotificationRecipient, NotificationType, NotificationPriority
from app.models.mensagem import (
    Conversation, ConversationParticipant, Message, MessageToNotificationLink,
    ConversationKind, AuditEvent
)
from app.models.pipeline import (
    Pipeline, PipelineStage, Deal, DealAssignee, DealTag, DealTagLink,
    DealActivity, DealNote, DealStageHistory, DealPriority, DealStatus, DealSource, DealActivityType
)
from app.models.whatsapp import WhatsAppConnection, WhatsAppProvider, WhatsAppConnectionStatus
from app.models.agent import AIAgent, AgentConversation, AIAgentProvider, ConversationChannel, ConversationStatus
from app.models.campaign import (
    Campaign, CampaignLead, CampaignType, CampaignStatus,
    CampaignLeadSource, CampaignLeadStatus
)

__all__ = [
    "Usuario", "Cliente", "Projeto", "Tarefa", "TarefaAssignee", "Proposta", "ProposalSection", "ProposalPricingPlan", "ProposalStatusEvent", "EmailOutbox",
    "PreProposta", "PrePropostaAnswer", "PrePropostaTemplate",
    "Contrato",
    "ProposalSession", "ProposalEventLegacy", "ProposalAnalyticsSummary",
    # Módulos novos da main
    "ClienteOnboarding", "ClienteMetaWhatsapp", "ClienteContatoOperacional",
    "ClienteDocumentoRAG", "ClienteImagem", "ClienteCronogramaEtapa", "ClienteCronogramaItem",
    "Lead",
    # Módulos novos criados localmente
    "Role", "UserRole",
    "Permission", "RolePermission",
    "Notification", "NotificationRecipient", "NotificationType", "NotificationPriority",
    "Conversation", "ConversationParticipant", "Message", "MessageToNotificationLink",
    "ConversationKind", "AuditEvent",
    "Pipeline", "PipelineStage", "Deal", "DealAssignee", "DealTag", "DealTagLink",
    "DealActivity", "DealNote", "DealStageHistory", "DealPriority", "DealStatus", "DealSource", "DealActivityType",
    "TaskDatabase", "TaskProperty", "TaskPropertyValue", "TaskView",
    "TaskBlock", "TaskComment", "TaskMention", "TaskAttachment", "TaskTemplate",
    # WhatsApp
    "WhatsAppConnection", "WhatsAppProvider", "WhatsAppConnectionStatus",
    # AI Agents
    "AIAgent", "AgentConversation", "AIAgentProvider", "ConversationChannel", "ConversationStatus",
    # Campaigns
    "Campaign", "CampaignLead", "CampaignType", "CampaignStatus",
    "CampaignLeadSource", "CampaignLeadStatus",
]
