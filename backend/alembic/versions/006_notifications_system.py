"""Sistema de Notificações e Mensagens Diretas.

Revision ID: 006
Revises: 005
Create Date: 2025-02-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB, ENUM

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enums
    notification_type_enum = ENUM(
        "PROJECT_NUDGE", "DIRECT_MESSAGE", "SYSTEM", "TASK_MENTION", 
        "PROPOSAL_UPDATE", "CONTRACT_UPDATE",
        name="notificationtype",
        create_type=True
    )
    notification_priority_enum = ENUM(
        "low", "normal", "high", "urgent",
        name="notificationpriority",
        create_type=True
    )
    conversation_kind_enum = ENUM(
        "DIRECT",
        name="conversationkind",
        create_type=True
    )

    # Tabela roles
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(50), nullable=False, unique=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_roles_id", "roles", ["id"])
    op.create_index("ix_roles_key", "roles", ["key"], unique=True)

    # Tabela user_roles (multi-cargo)
    op.create_table(
        "user_roles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role_id", sa.Integer(), sa.ForeignKey("roles.id", ondelete="CASCADE"), nullable=False),
        sa.UniqueConstraint("user_id", "role_id", name="uq_user_role"),
    )
    op.create_index("ix_user_roles_id", "user_roles", ["id"])
    op.create_index("ix_user_roles_user_id", "user_roles", ["user_id"])
    op.create_index("ix_user_roles_role_id", "user_roles", ["role_id"])

    # Tabela notifications
    op.create_table(
        "notifications",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("type", notification_type_enum, nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("priority", notification_priority_enum, default="normal", nullable=False),
        sa.Column("author_user_id", sa.Integer(), sa.ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True),
        sa.Column("context_type", sa.String(50), nullable=True),
        sa.Column("context_id", sa.String(255), nullable=True),
        sa.Column("action_url", sa.Text(), nullable=True),
        sa.Column("extra_data", JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_notifications_id", "notifications", ["id"])
    op.create_index("ix_notifications_type", "notifications", ["type"])
    op.create_index("ix_notifications_context", "notifications", ["context_type", "context_id"])
    op.create_index("ix_notifications_created_at", "notifications", ["created_at"])

    # Tabela notification_recipients
    op.create_table(
        "notification_recipients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("notification_id", UUID(as_uuid=True), sa.ForeignKey("notifications.id", ondelete="CASCADE"), nullable=False),
        sa.Column("recipient_user_id", sa.Integer(), sa.ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("delivered_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("pinned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("muted", sa.Boolean(), default=False, nullable=False),
    )
    op.create_index("ix_notification_recipients_id", "notification_recipients", ["id"])
    op.create_index("ix_notification_recipients_notification_id", "notification_recipients", ["notification_id"])
    op.create_index("ix_notification_recipients_recipient_user_id", "notification_recipients", ["recipient_user_id"])
    op.create_index("ix_notification_recipients_read_at", "notification_recipients", ["read_at"])

    # Tabela conversations
    op.create_table(
        "conversations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("kind", conversation_kind_enum, nullable=False, default="DIRECT"),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_conversations_id", "conversations", ["id"])
    op.create_index("ix_conversations_created_at", "conversations", ["created_at"])

    # Tabela conversation_participants
    op.create_table(
        "conversation_participants",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("conversation_id", UUID(as_uuid=True), sa.ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("last_read_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_conversation_participants_id", "conversation_participants", ["id"])
    op.create_index("ix_conversation_participants_conversation_id", "conversation_participants", ["conversation_id"])
    op.create_index("ix_conversation_participants_user_id", "conversation_participants", ["user_id"])

    # Tabela messages
    op.create_table(
        "messages",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("conversation_id", UUID(as_uuid=True), sa.ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_user_id", sa.Integer(), sa.ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("edited_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_messages_id", "messages", ["id"])
    op.create_index("ix_messages_conversation_id", "messages", ["conversation_id"])
    op.create_index("ix_messages_created_at", "messages", ["created_at"])

    # Tabela message_to_notification_links
    op.create_table(
        "message_to_notification_links",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("message_id", UUID(as_uuid=True), sa.ForeignKey("messages.id", ondelete="CASCADE"), nullable=False),
        sa.Column("recipient_user_id", sa.Integer(), sa.ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("notification_recipient_id", sa.Integer(), sa.ForeignKey("notification_recipients.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_message_to_notification_links_id", "message_to_notification_links", ["id"])
    op.create_index("ix_message_to_notification_links_message_id", "message_to_notification_links", ["message_id"])
    op.create_index("ix_message_to_notification_links_recipient_user_id", "message_to_notification_links", ["recipient_user_id"])

    # Tabela audit_events
    op.create_table(
        "audit_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("actor_user_id", sa.Integer(), sa.ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True),
        sa.Column("target_user_id", sa.Integer(), sa.ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True),
        sa.Column("context_type", sa.String(50), nullable=True),
        sa.Column("context_id", sa.String(255), nullable=True),
        sa.Column("payload", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_audit_events_id", "audit_events", ["id"])
    op.create_index("ix_audit_events_event_type", "audit_events", ["event_type"])
    op.create_index("ix_audit_events_target_user_id", "audit_events", ["target_user_id"])
    op.create_index("ix_audit_events_created_at", "audit_events", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_audit_events_created_at", table_name="audit_events")
    op.drop_index("ix_audit_events_target_user_id", table_name="audit_events")
    op.drop_index("ix_audit_events_event_type", table_name="audit_events")
    op.drop_index("ix_audit_events_id", table_name="audit_events")
    op.drop_table("audit_events")

    op.drop_index("ix_message_to_notification_links_recipient_user_id", table_name="message_to_notification_links")
    op.drop_index("ix_message_to_notification_links_message_id", table_name="message_to_notification_links")
    op.drop_index("ix_message_to_notification_links_id", table_name="message_to_notification_links")
    op.drop_table("message_to_notification_links")

    op.drop_index("ix_messages_created_at", table_name="messages")
    op.drop_index("ix_messages_conversation_id", table_name="messages")
    op.drop_index("ix_messages_id", table_name="messages")
    op.drop_table("messages")

    op.drop_index("ix_conversation_participants_user_id", table_name="conversation_participants")
    op.drop_index("ix_conversation_participants_conversation_id", table_name="conversation_participants")
    op.drop_index("ix_conversation_participants_id", table_name="conversation_participants")
    op.drop_table("conversation_participants")

    op.drop_index("ix_conversations_created_at", table_name="conversations")
    op.drop_index("ix_conversations_id", table_name="conversations")
    op.drop_table("conversations")

    op.drop_index("ix_notification_recipients_read_at", table_name="notification_recipients")
    op.drop_index("ix_notification_recipients_recipient_user_id", table_name="notification_recipients")
    op.drop_index("ix_notification_recipients_notification_id", table_name="notification_recipients")
    op.drop_index("ix_notification_recipients_id", table_name="notification_recipients")
    op.drop_table("notification_recipients")

    op.drop_index("ix_notifications_created_at", table_name="notifications")
    op.drop_index("ix_notifications_context", table_name="notifications")
    op.drop_index("ix_notifications_type", table_name="notifications")
    op.drop_index("ix_notifications_id", table_name="notifications")
    op.drop_table("notifications")

    op.drop_index("ix_user_roles_role_id", table_name="user_roles")
    op.drop_index("ix_user_roles_user_id", table_name="user_roles")
    op.drop_index("ix_user_roles_id", table_name="user_roles")
    op.drop_table("user_roles")

    op.drop_index("ix_roles_key", table_name="roles")
    op.drop_index("ix_roles_id", table_name="roles")
    op.drop_table("roles")

    # Dropar enums
    op.execute("DROP TYPE IF EXISTS conversationkind")
    op.execute("DROP TYPE IF EXISTS notificationpriority")
    op.execute("DROP TYPE IF EXISTS notificationtype")

