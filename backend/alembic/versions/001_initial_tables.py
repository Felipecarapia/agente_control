"""Initial tables (usuarios, clientes, projetos, tarefas, propostas, contratos).

Revision ID: 001
Revises:
Create Date: 2025-01-31

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "usuarios",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("nome", sa.String(255), nullable=False),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_usuarios_email", "usuarios", ["email"], unique=True)
    op.create_index("ix_usuarios_id", "usuarios", ["id"], unique=False)

    op.create_table(
        "clientes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("telefone", sa.String(50), nullable=True),
        sa.Column("documento", sa.String(20), nullable=True),
        sa.Column("endereco", sa.Text(), nullable=True),
        sa.Column("usuario_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_clientes_id", "clientes", ["id"], unique=False)

    op.create_table(
        "projetos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(255), nullable=False),
        sa.Column("descricao", sa.Text(), nullable=True),
        sa.Column("cliente_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="ativo"),
        sa.Column("usuario_id", sa.Integer(), nullable=True),
        sa.Column("data_inicio", sa.Date(), nullable=True),
        sa.Column("data_fim", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["cliente_id"], ["clientes.id"]),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_projetos_id", "projetos", ["id"], unique=False)

    op.create_table(
        "tarefas",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("titulo", sa.String(255), nullable=False),
        sa.Column("descricao", sa.Text(), nullable=True),
        sa.Column("projeto_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="pendente"),
        sa.Column("prioridade", sa.String(20), nullable=True),
        sa.Column("responsavel_id", sa.Integer(), nullable=True),
        sa.Column("data_vencimento", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["projeto_id"], ["projetos.id"]),
        sa.ForeignKeyConstraint(["responsavel_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tarefas_id", "tarefas", ["id"], unique=False)

    op.create_table(
        "propostas",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("titulo", sa.String(255), nullable=False),
        sa.Column("descricao", sa.Text(), nullable=True),
        sa.Column("valor", sa.Numeric(15, 2), nullable=True),
        sa.Column("cliente_id", sa.Integer(), nullable=False),
        sa.Column("projeto_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="rascunho"),
        sa.Column("usuario_id", sa.Integer(), nullable=True),
        sa.Column("validade_ate", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["cliente_id"], ["clientes.id"]),
        sa.ForeignKeyConstraint(["projeto_id"], ["projetos.id"]),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_propostas_id", "propostas", ["id"], unique=False)

    op.create_table(
        "contratos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("numero", sa.String(100), nullable=False),
        sa.Column("proposta_id", sa.Integer(), nullable=True),
        sa.Column("cliente_id", sa.Integer(), nullable=False),
        sa.Column("projeto_id", sa.Integer(), nullable=True),
        sa.Column("valor", sa.Numeric(15, 2), nullable=True),
        sa.Column("data_inicio", sa.Date(), nullable=True),
        sa.Column("data_fim", sa.Date(), nullable=True),
        sa.Column("arquivo_url", sa.String(500), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="ativo"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["cliente_id"], ["clientes.id"]),
        sa.ForeignKeyConstraint(["projeto_id"], ["projetos.id"]),
        sa.ForeignKeyConstraint(["proposta_id"], ["propostas.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_contratos_id", "contratos", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_contratos_id", table_name="contratos")
    op.drop_table("contratos")
    op.drop_index("ix_propostas_id", table_name="propostas")
    op.drop_table("propostas")
    op.drop_index("ix_tarefas_id", table_name="tarefas")
    op.drop_table("tarefas")
    op.drop_index("ix_projetos_id", table_name="projetos")
    op.drop_table("projetos")
    op.drop_index("ix_clientes_id", table_name="clientes")
    op.drop_table("clientes")
    op.drop_index("ix_usuarios_email", table_name="usuarios")
    op.drop_index("ix_usuarios_id", table_name="usuarios")
    op.drop_table("usuarios")
