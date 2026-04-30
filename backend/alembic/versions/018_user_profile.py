"""Add user profile fields (avatar, bio, phone, status, prefs).

Revision ID: 010
Revises: 009
Create Date: 2025-02-06 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "018"
down_revision: Union[str, None] = "016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Adicionar colunas de perfil à tabela usuarios
    op.add_column("usuarios", sa.Column("avatar_url", sa.Text(), nullable=True))
    op.add_column("usuarios", sa.Column("bio", sa.Text(), nullable=True))
    op.add_column("usuarios", sa.Column("phone", sa.String(50), nullable=True))
    op.add_column("usuarios", sa.Column("presence_status", sa.String(20), nullable=True))
    op.add_column("usuarios", sa.Column("notification_prefs", postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    op.drop_column("usuarios", "notification_prefs")
    op.drop_column("usuarios", "presence_status")
    op.drop_column("usuarios", "phone")
    op.drop_column("usuarios", "bio")
    op.drop_column("usuarios", "avatar_url")




