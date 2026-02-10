"""Create contas_pagar and contas_receber tables.

Revision ID: 023
Revises: 022
Create Date: 2026-02-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = "023"
down_revision: Union[str, None] = "022"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "contas_pagar",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("descricao", sa.String(500), nullable=False),
        sa.Column("fornecedor", sa.String(255), nullable=True),
        sa.Column("categoria", sa.String(30), nullable=False, server_default="outros"),
        sa.Column("valor", sa.Numeric(15, 2), nullable=False),
        sa.Column("data_vencimento", sa.Date(), nullable=False),
        sa.Column("data_pagamento", sa.Date(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pendente"),
        sa.Column("forma_pagamento", sa.String(20), nullable=True),
        sa.Column("observacoes", sa.Text(), nullable=True),
        sa.Column("recorrencia", sa.String(20), nullable=False, server_default="nenhuma"),
        sa.Column("parcela_atual", sa.Integer(), nullable=True),
        sa.Column("total_parcelas", sa.Integer(), nullable=True),
        sa.Column("documento_referencia", sa.String(255), nullable=True),
        sa.Column("projeto_id", UUID(as_uuid=True), sa.ForeignKey("projetos.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_by_user_id", UUID(as_uuid=True), sa.ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "contas_receber",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("descricao", sa.String(500), nullable=False),
        sa.Column("cliente_id", UUID(as_uuid=True), sa.ForeignKey("clientes.id", ondelete="SET NULL"), nullable=True),
        sa.Column("cliente_nome", sa.String(255), nullable=True),
        sa.Column("categoria", sa.String(30), nullable=False, server_default="projeto"),
        sa.Column("valor", sa.Numeric(15, 2), nullable=False),
        sa.Column("data_vencimento", sa.Date(), nullable=False),
        sa.Column("data_recebimento", sa.Date(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pendente"),
        sa.Column("forma_pagamento", sa.String(20), nullable=True),
        sa.Column("observacoes", sa.Text(), nullable=True),
        sa.Column("recorrencia", sa.String(20), nullable=False, server_default="nenhuma"),
        sa.Column("parcela_atual", sa.Integer(), nullable=True),
        sa.Column("total_parcelas", sa.Integer(), nullable=True),
        sa.Column("documento_referencia", sa.String(255), nullable=True),
        sa.Column("projeto_id", UUID(as_uuid=True), sa.ForeignKey("projetos.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_by_user_id", UUID(as_uuid=True), sa.ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("contas_receber")
    op.drop_table("contas_pagar")
