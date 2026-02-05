"""Projeto tipo e campos financeiros.

Revision ID: 003
Revises: 002
Create Date: 2025-02-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("projetos", sa.Column("tipo", sa.String(50), nullable=False, server_default="desenvolvimento_software"))
    op.add_column("projetos", sa.Column("valor_orcado", sa.Numeric(15, 2), nullable=True))
    op.add_column("projetos", sa.Column("valor_realizado", sa.Numeric(15, 2), nullable=True))
    op.add_column("projetos", sa.Column("moeda", sa.String(3), nullable=False, server_default="BRL"))
    op.add_column("projetos", sa.Column("observacoes_financeiras", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("projetos", "observacoes_financeiras")
    op.drop_column("projetos", "moeda")
    op.drop_column("projetos", "valor_realizado")
    op.drop_column("projetos", "valor_orcado")
    op.drop_column("projetos", "tipo")
