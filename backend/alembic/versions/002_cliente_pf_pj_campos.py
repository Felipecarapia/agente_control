"""Cliente PF/PJ e campos extras.

Revision ID: 002
Revises: 001
Create Date: 2025-02-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("clientes", sa.Column("tipo", sa.String(2), nullable=False, server_default="pf"))
    op.add_column("clientes", sa.Column("razao_social", sa.String(255), nullable=True))
    op.add_column("clientes", sa.Column("cpf", sa.String(14), nullable=True))
    op.add_column("clientes", sa.Column("cnpj", sa.String(18), nullable=True))
    op.add_column("clientes", sa.Column("rg", sa.String(20), nullable=True))
    op.add_column("clientes", sa.Column("inscricao_estadual", sa.String(20), nullable=True))
    op.add_column("clientes", sa.Column("celular", sa.String(50), nullable=True))
    op.add_column("clientes", sa.Column("cep", sa.String(9), nullable=True))
    op.add_column("clientes", sa.Column("numero", sa.String(20), nullable=True))
    op.add_column("clientes", sa.Column("complemento", sa.String(100), nullable=True))
    op.add_column("clientes", sa.Column("bairro", sa.String(100), nullable=True))
    op.add_column("clientes", sa.Column("cidade", sa.String(100), nullable=True))
    op.add_column("clientes", sa.Column("estado", sa.String(2), nullable=True))
    # endereco já existe; documento pode ficar para compat (não removemos)


def downgrade() -> None:
    op.drop_column("clientes", "estado")
    op.drop_column("clientes", "cidade")
    op.drop_column("clientes", "bairro")
    op.drop_column("clientes", "complemento")
    op.drop_column("clientes", "numero")
    op.drop_column("clientes", "cep")
    op.drop_column("clientes", "celular")
    op.drop_column("clientes", "inscricao_estadual")
    op.drop_column("clientes", "rg")
    op.drop_column("clientes", "cnpj")
    op.drop_column("clientes", "cpf")
    op.drop_column("clientes", "razao_social")
    op.drop_column("clientes", "tipo")
