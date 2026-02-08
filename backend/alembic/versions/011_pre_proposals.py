"""Sistema de Pré-Propostas (Diagnóstico multi-etapas).

Revision ID: 011
Revises: 96b3890d8c1f
Create Date: 2025-02-07 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "011"
down_revision: Union[str, None] = "96b3890d8c1f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Tabela pre_proposals
    op.create_table(
        "pre_proposals",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("deal_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="draft"),
        sa.Column("score_total", sa.Integer(), nullable=True),
        sa.Column("temperature", sa.String(length=20), nullable=True),  # cold, warm, hot
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("recommendations", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), nullable=True),
        sa.Column("updated_by_user_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["client_id"], ["clientes.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["deal_id"], ["deals.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["usuarios.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["usuarios.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_pre_proposals_id"), "pre_proposals", ["id"], unique=False)
    op.create_index(op.f("ix_pre_proposals_client_id"), "pre_proposals", ["client_id"], unique=False)
    op.create_index(op.f("ix_pre_proposals_deal_id"), "pre_proposals", ["deal_id"], unique=False)
    op.create_index(op.f("ix_pre_proposals_status"), "pre_proposals", ["status"], unique=False)

    # Tabela pre_proposal_answers
    op.create_table(
        "pre_proposal_answers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("pre_proposal_id", sa.Integer(), nullable=False),
        sa.Column("step_key", sa.String(length=50), nullable=False),
        sa.Column("field_key", sa.String(length=100), nullable=False),
        sa.Column("answer_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("weight", sa.Integer(), nullable=True),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["pre_proposal_id"], ["pre_proposals.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("pre_proposal_id", "field_key", name="uq_pre_proposal_answer"),
    )
    op.create_index(op.f("ix_pre_proposal_answers_pre_proposal_id"), "pre_proposal_answers", ["pre_proposal_id"], unique=False)

    # Tabela pre_proposal_templates
    op.create_table(
        "pre_proposal_templates",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("schema_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_pre_proposal_templates_id"), "pre_proposal_templates", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_pre_proposal_templates_id"), table_name="pre_proposal_templates")
    op.drop_table("pre_proposal_templates")
    op.drop_index(op.f("ix_pre_proposal_answers_pre_proposal_id"), table_name="pre_proposal_answers")
    op.drop_table("pre_proposal_answers")
    op.drop_index(op.f("ix_pre_proposals_status"), table_name="pre_proposals")
    op.drop_index(op.f("ix_pre_proposals_deal_id"), table_name="pre_proposals")
    op.drop_index(op.f("ix_pre_proposals_client_id"), table_name="pre_proposals")
    op.drop_index(op.f("ix_pre_proposals_id"), table_name="pre_proposals")
    op.drop_table("pre_proposals")




