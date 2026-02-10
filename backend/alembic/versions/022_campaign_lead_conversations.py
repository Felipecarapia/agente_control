"""Create campaign_lead_conversations and campaign_lead_messages tables.

Revision ID: 022
Revises: 021
Create Date: 2026-02-09 23:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = "022"
down_revision: Union[str, None] = "021"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "campaign_lead_conversations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("campaign_lead_id", UUID(as_uuid=True), sa.ForeignKey("campaign_leads.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("agent_id", UUID(as_uuid=True), sa.ForeignKey("ai_agents.id", ondelete="SET NULL"), nullable=True),
        sa.Column("whatsapp_connection_id", UUID(as_uuid=True), sa.ForeignKey("whatsapp_connections.id", ondelete="SET NULL"), nullable=True),
        sa.Column("remote_jid", sa.String(255), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("message_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("interest_detected", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "campaign_lead_messages",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("conversation_id", UUID(as_uuid=True), sa.ForeignKey("campaign_lead_conversations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("sent_via", sa.String(20), nullable=False, server_default="whatsapp"),
        sa.Column("whatsapp_message_id", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("campaign_lead_messages")
    op.drop_table("campaign_lead_conversations")
