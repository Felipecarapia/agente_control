"""add_task_nudge_to_notification_type

Revision ID: 96b3890d8c1f
Revises: 009
Create Date: 2026-02-06 14:11:11.660066

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM


# revision identifiers, used by Alembic.
revision: str = '96b3890d8c1f'
down_revision: Union[str, None] = '018'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Adicionar TASK_NUDGE ao enum notificationtype
    op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'TASK_NUDGE'")


def downgrade() -> None:
    # Não é possível remover valores de enum no PostgreSQL facilmente
    # Se necessário, recriar o enum sem TASK_NUDGE
    # Por enquanto, deixar vazio pois não há necessidade de downgrade
    pass
