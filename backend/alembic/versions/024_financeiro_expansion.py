"""Expand financeiro: centros_custo, contas_bancarias, despesas_fixas, funcionarios + FKs.

Revision ID: 024
Revises: 023
Create Date: 2026-02-10 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = "024"
down_revision: Union[str, None] = "023"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Centro de Custo ──
    op.create_table(
        "centros_custo",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("nome", sa.String(255), nullable=False),
        sa.Column("codigo", sa.String(50), nullable=False, unique=True),
        sa.Column("descricao", sa.Text(), nullable=True),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── Conta Bancária ──
    op.create_table(
        "contas_bancarias",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("nome_banco", sa.String(255), nullable=False),
        sa.Column("agencia", sa.String(20), nullable=True),
        sa.Column("numero_conta", sa.String(30), nullable=True),
        sa.Column("tipo_conta", sa.String(20), nullable=False, server_default="corrente"),
        sa.Column("saldo_inicial", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("pix_chave", sa.String(255), nullable=True),
        sa.Column("titular", sa.String(255), nullable=True),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── Despesa Fixa ──
    op.create_table(
        "despesas_fixas",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("descricao", sa.String(500), nullable=False),
        sa.Column("valor", sa.Numeric(15, 2), nullable=False),
        sa.Column("categoria", sa.String(30), nullable=False, server_default="outros"),
        sa.Column("fornecedor", sa.String(255), nullable=True),
        sa.Column("dia_vencimento", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("forma_pagamento", sa.String(20), nullable=True),
        sa.Column("centro_custo_id", UUID(as_uuid=True), sa.ForeignKey("centros_custo.id", ondelete="SET NULL"), nullable=True),
        sa.Column("conta_bancaria_id", UUID(as_uuid=True), sa.ForeignKey("contas_bancarias.id", ondelete="SET NULL"), nullable=True),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("observacoes", sa.Text(), nullable=True),
        sa.Column("created_by_user_id", UUID(as_uuid=True), sa.ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── Funcionários ──
    op.create_table(
        "funcionarios",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("nome", sa.String(255), nullable=False),
        sa.Column("cpf", sa.String(14), nullable=True, unique=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("telefone", sa.String(20), nullable=True),
        sa.Column("cargo", sa.String(255), nullable=True),
        sa.Column("departamento", sa.String(255), nullable=True),
        sa.Column("data_admissao", sa.Date(), nullable=True),
        sa.Column("data_demissao", sa.Date(), nullable=True),
        sa.Column("tipo_contrato", sa.String(20), nullable=False, server_default="clt"),
        sa.Column("salario_bruto", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("vale_transporte", sa.Numeric(15, 2), nullable=True, server_default="0"),
        sa.Column("vale_refeicao", sa.Numeric(15, 2), nullable=True, server_default="0"),
        sa.Column("plano_saude", sa.Numeric(15, 2), nullable=True, server_default="0"),
        sa.Column("outros_beneficios", sa.Numeric(15, 2), nullable=True, server_default="0"),
        sa.Column("centro_custo_id", UUID(as_uuid=True), sa.ForeignKey("centros_custo.id", ondelete="SET NULL"), nullable=True),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("observacoes", sa.Text(), nullable=True),
        sa.Column("created_by_user_id", UUID(as_uuid=True), sa.ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── Adicionar FKs nas tabelas existentes ──
    op.add_column("contas_pagar", sa.Column("centro_custo_id", UUID(as_uuid=True), nullable=True))
    op.add_column("contas_pagar", sa.Column("conta_bancaria_id", UUID(as_uuid=True), nullable=True))
    op.add_column("contas_pagar", sa.Column("despesa_fixa_id", UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_contas_pagar_centro_custo", "contas_pagar", "centros_custo", ["centro_custo_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_contas_pagar_conta_bancaria", "contas_pagar", "contas_bancarias", ["conta_bancaria_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_contas_pagar_despesa_fixa", "contas_pagar", "despesas_fixas", ["despesa_fixa_id"], ["id"], ondelete="SET NULL")

    op.add_column("contas_receber", sa.Column("centro_custo_id", UUID(as_uuid=True), nullable=True))
    op.add_column("contas_receber", sa.Column("conta_bancaria_id", UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_contas_receber_centro_custo", "contas_receber", "centros_custo", ["centro_custo_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_contas_receber_conta_bancaria", "contas_receber", "contas_bancarias", ["conta_bancaria_id"], ["id"], ondelete="SET NULL")


def downgrade() -> None:
    # ── Remover FKs das tabelas existentes ──
    op.drop_constraint("fk_contas_receber_conta_bancaria", "contas_receber", type_="foreignkey")
    op.drop_constraint("fk_contas_receber_centro_custo", "contas_receber", type_="foreignkey")
    op.drop_column("contas_receber", "conta_bancaria_id")
    op.drop_column("contas_receber", "centro_custo_id")

    op.drop_constraint("fk_contas_pagar_despesa_fixa", "contas_pagar", type_="foreignkey")
    op.drop_constraint("fk_contas_pagar_conta_bancaria", "contas_pagar", type_="foreignkey")
    op.drop_constraint("fk_contas_pagar_centro_custo", "contas_pagar", type_="foreignkey")
    op.drop_column("contas_pagar", "despesa_fixa_id")
    op.drop_column("contas_pagar", "conta_bancaria_id")
    op.drop_column("contas_pagar", "centro_custo_id")

    # ── Remover tabelas novas ──
    op.drop_table("funcionarios")
    op.drop_table("despesas_fixas")
    op.drop_table("contas_bancarias")
    op.drop_table("centros_custo")
