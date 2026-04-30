"""Sistema de Pipeline Kanban (Funil de Vendas).

Revision ID: 009
Revises: 008
Create Date: 2025-02-05 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision: str = "017"
down_revision: Union[str, None] = "010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Tabela pipelines
    op.create_table(
        "pipelines",
        sa.Column("id", UUID(as_uuid=True), nullable=False, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_by_user_id", UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["usuarios.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_pipelines_id"), "pipelines", ["id"], unique=False)

    # Tabela pipeline_stages
    op.create_table(
        "pipeline_stages",
        sa.Column("id", UUID(as_uuid=True), nullable=False, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("pipeline_id", UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("key", sa.String(length=50), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("wip_limit", sa.Integer(), nullable=True),
        sa.Column("color", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["pipeline_id"], ["pipelines.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("pipeline_id", "order_index", name="uq_pipeline_stage_order"),
    )
    op.create_index(op.f("ix_pipeline_stages_id"), "pipeline_stages", ["id"], unique=False)
    op.create_index(op.f("ix_pipeline_stages_pipeline_id"), "pipeline_stages", ["pipeline_id"], unique=False)

    # Tabela deal_tags
    op.create_table(
        "deal_tags",
        sa.Column("id", UUID(as_uuid=True), nullable=False, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("color", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index(op.f("ix_deal_tags_id"), "deal_tags", ["id"], unique=False)

    # Tabela deals
    op.create_table(
        "deals",
        sa.Column("id", UUID(as_uuid=True), nullable=False, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("pipeline_id", UUID(as_uuid=True), nullable=False),
        sa.Column("stage_id", UUID(as_uuid=True), nullable=False),
        sa.Column("client_id", UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("value_cents", sa.Integer(), nullable=True),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="BRL"),
        sa.Column("probability", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("expected_close_date", sa.Date(), nullable=True),
        sa.Column("priority", sa.Enum("low", "normal", "high", "urgent", name="dealpriority"), nullable=False, server_default="normal"),
        sa.Column("status", sa.Enum("open", "won", "lost", name="dealstatus"), nullable=False, server_default="open"),
        sa.Column("position_index", sa.Numeric(precision=10, scale=2), nullable=False, server_default="0"),
        sa.Column("source", sa.Enum("inbound", "outbound", "indicacao", "evento", "rede_social", "outro", name="dealsource"), nullable=True),
        sa.Column("proposal_id", UUID(as_uuid=True), nullable=True),
        sa.Column("contract_id", UUID(as_uuid=True), nullable=True),
        sa.Column("created_by_user_id", UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["pipeline_id"], ["pipelines.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["stage_id"], ["pipeline_stages.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["client_id"], ["clientes.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["proposal_id"], ["propostas.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["contract_id"], ["contratos.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["usuarios.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_deals_id"), "deals", ["id"], unique=False)
    op.create_index(op.f("ix_deals_pipeline_id"), "deals", ["pipeline_id"], unique=False)
    op.create_index(op.f("ix_deals_stage_id"), "deals", ["stage_id"], unique=False)
    op.create_index(op.f("ix_deals_client_id"), "deals", ["client_id"], unique=False)

    # Tabela deal_assignees
    op.create_table(
        "deal_assignees",
        sa.Column("id", UUID(as_uuid=True), nullable=False, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("deal_id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False, server_default="collab"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["deal_id"], ["deals.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("deal_id", "user_id", name="uq_deal_user"),
    )
    op.create_index(op.f("ix_deal_assignees_deal_id"), "deal_assignees", ["deal_id"], unique=False)
    op.create_index(op.f("ix_deal_assignees_user_id"), "deal_assignees", ["user_id"], unique=False)

    # Tabela deal_tag_links
    op.create_table(
        "deal_tag_links",
        sa.Column("id", UUID(as_uuid=True), nullable=False, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("deal_id", UUID(as_uuid=True), nullable=False),
        sa.Column("tag_id", UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["deal_id"], ["deals.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tag_id"], ["deal_tags.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("deal_id", "tag_id", name="uq_deal_tag"),
    )
    op.create_index(op.f("ix_deal_tag_links_deal_id"), "deal_tag_links", ["deal_id"], unique=False)
    op.create_index(op.f("ix_deal_tag_links_tag_id"), "deal_tag_links", ["tag_id"], unique=False)

    # Tabela deal_activities
    op.create_table(
        "deal_activities",
        sa.Column("id", UUID(as_uuid=True), nullable=False, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("deal_id", UUID(as_uuid=True), nullable=False),
        sa.Column("type", sa.Enum("call", "email", "meeting", "whatsapp", "custom", name="dealactivitytype"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("done_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by_user_id", UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["deal_id"], ["deals.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["usuarios.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_deal_activities_deal_id"), "deal_activities", ["deal_id"], unique=False)

    # Tabela deal_notes
    op.create_table(
        "deal_notes",
        sa.Column("id", UUID(as_uuid=True), nullable=False, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("deal_id", UUID(as_uuid=True), nullable=False),
        sa.Column("author_user_id", UUID(as_uuid=True), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["deal_id"], ["deals.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["author_user_id"], ["usuarios.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_deal_notes_deal_id"), "deal_notes", ["deal_id"], unique=False)

    # Tabela deal_stage_history
    op.create_table(
        "deal_stage_history",
        sa.Column("id", UUID(as_uuid=True), nullable=False, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("deal_id", UUID(as_uuid=True), nullable=False),
        sa.Column("from_stage_id", UUID(as_uuid=True), nullable=True),
        sa.Column("to_stage_id", UUID(as_uuid=True), nullable=False),
        sa.Column("moved_by_user_id", UUID(as_uuid=True), nullable=True),
        sa.Column("moved_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("extra_metadata", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["deal_id"], ["deals.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["from_stage_id"], ["pipeline_stages.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["to_stage_id"], ["pipeline_stages.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["moved_by_user_id"], ["usuarios.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_deal_stage_history_deal_id"), "deal_stage_history", ["deal_id"], unique=False)
    op.create_index(op.f("ix_deal_stage_history_moved_at"), "deal_stage_history", ["moved_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_deal_stage_history_moved_at"), table_name="deal_stage_history")
    op.drop_index(op.f("ix_deal_stage_history_deal_id"), table_name="deal_stage_history")
    op.drop_table("deal_stage_history")

    op.drop_index(op.f("ix_deal_notes_deal_id"), table_name="deal_notes")
    op.drop_table("deal_notes")

    op.drop_index(op.f("ix_deal_activities_deal_id"), table_name="deal_activities")
    op.drop_table("deal_activities")

    op.drop_index(op.f("ix_deal_tag_links_tag_id"), table_name="deal_tag_links")
    op.drop_index(op.f("ix_deal_tag_links_deal_id"), table_name="deal_tag_links")
    op.drop_table("deal_tag_links")

    op.drop_index(op.f("ix_deal_assignees_user_id"), table_name="deal_assignees")
    op.drop_index(op.f("ix_deal_assignees_deal_id"), table_name="deal_assignees")
    op.drop_table("deal_assignees")

    op.drop_index(op.f("ix_deals_client_id"), table_name="deals")
    op.drop_index(op.f("ix_deals_stage_id"), table_name="deals")
    op.drop_index(op.f("ix_deals_pipeline_id"), table_name="deals")
    op.drop_index(op.f("ix_deals_id"), table_name="deals")
    op.drop_table("deals")

    op.drop_index(op.f("ix_deal_tags_id"), table_name="deal_tags")
    op.drop_table("deal_tags")

    op.drop_index(op.f("ix_pipeline_stages_pipeline_id"), table_name="pipeline_stages")
    op.drop_index(op.f("ix_pipeline_stages_id"), table_name="pipeline_stages")
    op.drop_table("pipeline_stages")

    op.drop_index(op.f("ix_pipelines_id"), table_name="pipelines")
    op.drop_table("pipelines")

    # Dropar enums
    op.execute("DROP TYPE IF EXISTS dealactivitytype")
    op.execute("DROP TYPE IF EXISTS dealsource")
    op.execute("DROP TYPE IF EXISTS dealstatus")
    op.execute("DROP TYPE IF EXISTS dealpriority")

