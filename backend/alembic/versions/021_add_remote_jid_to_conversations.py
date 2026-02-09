"""Add remote_jid column to lead_conversations.

Revision ID: 021
Revises: 020
Create Date: 2026-02-09 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "021"
down_revision: Union[str, None] = "020"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("lead_conversations", sa.Column("remote_jid", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("lead_conversations", "remote_jid")
