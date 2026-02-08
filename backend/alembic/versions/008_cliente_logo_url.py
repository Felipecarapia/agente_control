"""add logo_url to clientes

Revision ID: 008
Revises: 007
Create Date: 2026-01-31
"""
from alembic import op
import sqlalchemy as sa

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("clientes", sa.Column("logo_url", sa.String(1000), nullable=True))


def downgrade() -> None:
    op.drop_column("clientes", "logo_url")
