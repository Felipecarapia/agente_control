"""cliente onboarding tables

Revision ID: 006
Revises: 005
Create Date: 2026-01-31
"""
from alembic import op
import sqlalchemy as sa

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Onboarding (informações landing page + materiais + resultado)
    op.create_table(
        "cliente_onboarding",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("cliente_id", sa.Integer, sa.ForeignKey("clientes.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("quem_somos", sa.Text, nullable=True),
        sa.Column("o_que_vendemos", sa.Text, nullable=True),
        sa.Column("para_quem_vendemos", sa.Text, nullable=True),
        sa.Column("diferenciais", sa.Text, nullable=True),
        sa.Column("perguntas_frequentes", sa.Text, nullable=True),
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("fotos_urls", sa.Text, nullable=True),
        sa.Column("redes_sociais", sa.Text, nullable=True),
        sa.Column("conteudo_base_site", sa.Text, nullable=True),
        sa.Column("conteudo_reutilizavel_bot", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Meta WhatsApp Oficial
    op.create_table(
        "cliente_meta_whatsapp",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("cliente_id", sa.Integer, sa.ForeignKey("clientes.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("nome_aplicativo", sa.String(255), nullable=True),
        sa.Column("numero_oficial", sa.String(50), nullable=True),
        sa.Column("token_acesso", sa.Text, nullable=True),
        sa.Column("business_manager_id", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Contatos Operacionais
    op.create_table(
        "cliente_contatos_operacionais",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("cliente_id", sa.Integer, sa.ForeignKey("clientes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("nome", sa.String(255), nullable=False),
        sa.Column("cargo", sa.String(255), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("telefone", sa.String(50), nullable=True),
        sa.Column("observacao", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("cliente_contatos_operacionais")
    op.drop_table("cliente_meta_whatsapp")
    op.drop_table("cliente_onboarding")
