"""Sistema de Propostas aprimorado (seções, planos, aceite público).

Revision ID: 012
Revises: 011
Create Date: 2025-02-07 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "012"
down_revision: Union[str, None] = "011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Adicionar colunas à tabela propostas existente
    op.add_column("propostas", sa.Column("deal_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("propostas", sa.Column("from_pre_proposal_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("propostas", sa.Column("currency", sa.String(length=3), nullable=True, server_default="BRL"))
    op.add_column("propostas", sa.Column("total_value_cents", sa.Integer(), nullable=True))
    op.add_column("propostas", sa.Column("public_token", sa.String(length=64), nullable=True, unique=True))
    op.add_column("propostas", sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("propostas", sa.Column("accepted_by_name", sa.String(length=255), nullable=True))
    op.add_column("propostas", sa.Column("accepted_ip", sa.String(length=45), nullable=True))
    op.add_column("propostas", sa.Column("accepted_user_agent", sa.Text(), nullable=True))
    op.add_column("propostas", sa.Column("updated_by_user_id", postgresql.UUID(as_uuid=True), nullable=True))
    
    # Foreign keys
    op.create_foreign_key("fk_propostas_deal_id", "propostas", "deals", ["deal_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_propostas_pre_proposal_id", "propostas", "pre_proposals", ["from_pre_proposal_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_propostas_updated_by", "propostas", "usuarios", ["updated_by_user_id"], ["id"], ondelete="SET NULL")
    
    # Índices
    op.create_index(op.f("ix_propostas_deal_id"), "propostas", ["deal_id"], unique=False)
    op.create_index(op.f("ix_propostas_public_token"), "propostas", ["public_token"], unique=True)
    op.create_index(op.f("ix_propostas_from_pre_proposal_id"), "propostas", ["from_pre_proposal_id"], unique=False)

    # Tabela proposal_sections
    op.create_table(
        "proposal_sections",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("proposal_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("section_key", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("content_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["proposal_id"], ["propostas.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("proposal_id", "order_index", name="uq_proposal_section_order"),
    )
    op.create_index(op.f("ix_proposal_sections_proposal_id"), "proposal_sections", ["proposal_id"], unique=False)

    # Tabela proposal_pricing_plans
    op.create_table(
        "proposal_pricing_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("proposal_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("plan_name", sa.String(length=255), nullable=False),
        sa.Column("plan_summary", sa.Text(), nullable=True),
        sa.Column("includes_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("timeline_text", sa.Text(), nullable=True),
        sa.Column("price_cents", sa.Integer(), nullable=False),
        sa.Column("payment_terms_text", sa.Text(), nullable=True),
        sa.Column("is_recommended", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_selected_default", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["proposal_id"], ["propostas.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_proposal_pricing_plans_proposal_id"), "proposal_pricing_plans", ["proposal_id"], unique=False)

    # Tabela proposal_status_events
    op.create_table(
        "proposal_status_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("proposal_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("payload_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["proposal_id"], ["propostas.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_proposal_status_events_proposal_id"), "proposal_status_events", ["proposal_id"], unique=False)
    op.create_index(op.f("ix_proposal_status_events_event_type"), "proposal_status_events", ["event_type"], unique=False)

    # Tabela email_outbox
    op.create_table(
        "email_outbox",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("to_email", sa.String(length=255), nullable=False),
        sa.Column("subject", sa.String(length=500), nullable=False),
        sa.Column("html_body", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="queued"),
        sa.Column("provider_message_id", sa.String(length=255), nullable=True),
        sa.Column("error_text", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_email_outbox_status"), "email_outbox", ["status"], unique=False)
    op.create_index(op.f("ix_email_outbox_to_email"), "email_outbox", ["to_email"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_email_outbox_to_email"), table_name="email_outbox")
    op.drop_index(op.f("ix_email_outbox_status"), table_name="email_outbox")
    op.drop_table("email_outbox")
    op.drop_index(op.f("ix_proposal_status_events_event_type"), table_name="proposal_status_events")
    op.drop_index(op.f("ix_proposal_status_events_proposal_id"), table_name="proposal_status_events")
    op.drop_table("proposal_status_events")
    op.drop_index(op.f("ix_proposal_pricing_plans_proposal_id"), table_name="proposal_pricing_plans")
    op.drop_table("proposal_pricing_plans")
    op.drop_index(op.f("ix_proposal_sections_proposal_id"), table_name="proposal_sections")
    op.drop_table("proposal_sections")
    op.drop_index(op.f("ix_propostas_from_pre_proposal_id"), table_name="propostas")
    op.drop_index(op.f("ix_propostas_public_token"), table_name="propostas")
    op.drop_index(op.f("ix_propostas_deal_id"), table_name="propostas")
    op.drop_constraint("fk_propostas_updated_by", "propostas", type_="foreignkey")
    op.drop_constraint("fk_propostas_pre_proposal_id", "propostas", type_="foreignkey")
    op.drop_constraint("fk_propostas_deal_id", "propostas", type_="foreignkey")
    op.drop_column("propostas", "updated_by_user_id")
    op.drop_column("propostas", "accepted_user_agent")
    op.drop_column("propostas", "accepted_ip")
    op.drop_column("propostas", "accepted_by_name")
    op.drop_column("propostas", "accepted_at")
    op.drop_column("propostas", "public_token")
    op.drop_column("propostas", "total_value_cents")
    op.drop_column("propostas", "currency")
    op.drop_column("propostas", "from_pre_proposal_id")
    op.drop_column("propostas", "deal_id")

