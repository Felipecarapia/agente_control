"""Proposta slug e landing_content.

Revision ID: 004
Revises: 003
Create Date: 2025-02-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("propostas", sa.Column("slug", sa.String(64), nullable=True))
    op.add_column("propostas", sa.Column("landing_content", JSON(), nullable=True))
    op.create_index(op.f("ix_propostas_slug"), "propostas", ["slug"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_propostas_slug"), table_name="propostas")
    op.drop_column("propostas", "landing_content")
    op.drop_column("propostas", "slug")
