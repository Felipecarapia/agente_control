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
from app.models.tracking import ProposalSession, ProposalEvent as ProposalEventLegacy, ProposalAnalyticsSummary
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

__all__ = [
    "Usuario", "Cliente", "Projeto", "Tarefa", "TarefaAssignee", "Proposta", "ProposalSection", "ProposalPricingPlan", "ProposalStatusEvent", "EmailOutbox",
    "PreProposta", "PrePropostaAnswer", "PrePropostaTemplate",
    "Contrato",
    "ProposalSession", "ProposalEventLegacy", "ProposalAnalyticsSummary",
    "Role", "UserRole",
    "Permission", "RolePermission",
    "Notification", "NotificationRecipient", "NotificationType", "NotificationPriority",
    "Conversation", "ConversationParticipant", "Message", "MessageToNotificationLink",
    "ConversationKind", "AuditEvent",
    "Pipeline", "PipelineStage", "Deal", "DealAssignee", "DealTag", "DealTagLink",
    "DealActivity", "DealNote", "DealStageHistory", "DealPriority", "DealStatus", "DealSource", "DealActivityType",
    "TaskDatabase", "TaskProperty", "TaskPropertyValue", "TaskView",
    "TaskBlock", "TaskComment", "TaskMention", "TaskAttachment", "TaskTemplate"
]
