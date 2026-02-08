"""leads table

Revision ID: 009
Revises: 008
Create Date: 2026-01-31
"""
from alembic import op
import sqlalchemy as sa

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "leads",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        # Dados básicos
        sa.Column("nome", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("telefone", sa.String(50), nullable=True),
        sa.Column("whatsapp", sa.String(50), nullable=True),
        sa.Column("empresa", sa.String(255), nullable=True),
        sa.Column("cargo", sa.String(255), nullable=True),
        sa.Column("site", sa.String(500), nullable=True),
        # Localização
        sa.Column("cidade", sa.String(100), nullable=True),
        sa.Column("estado", sa.String(2), nullable=True),
        # Classificação
        sa.Column("temperatura", sa.String(20), nullable=False, server_default="frio"),
        sa.Column("status", sa.String(30), nullable=False, server_default="novo"),
        sa.Column("score", sa.Integer, nullable=True, server_default="0"),
        # Origem / Tracking
        sa.Column("origem", sa.String(100), nullable=True),
        sa.Column("origem_detalhe", sa.String(500), nullable=True),
        sa.Column("utm_source", sa.String(255), nullable=True),
        sa.Column("utm_medium", sa.String(255), nullable=True),
        sa.Column("utm_campaign", sa.String(255), nullable=True),
        sa.Column("utm_term", sa.String(255), nullable=True),
        sa.Column("utm_content", sa.String(255), nullable=True),
        sa.Column("landing_page", sa.String(500), nullable=True),
        sa.Column("referrer", sa.String(500), nullable=True),
        # Interesse
        sa.Column("interesse", sa.Text, nullable=True),
        sa.Column("necessidade", sa.Text, nullable=True),
        sa.Column("orcamento_estimado", sa.Float, nullable=True),
        # Atribuição
        sa.Column("responsavel_id", sa.Integer, sa.ForeignKey("usuarios.id"), nullable=True),
        sa.Column("cliente_id", sa.Integer, sa.ForeignKey("clientes.id"), nullable=True),
        # Próxima ação
        sa.Column("proxima_acao", sa.String(500), nullable=True),
        sa.Column("proxima_acao_data", sa.DateTime(timezone=True), nullable=True),
        # Perda
        sa.Column("motivo_perda", sa.String(500), nullable=True),
        # Observações
        sa.Column("observacoes", sa.Text, nullable=True),
        # Metadados
        sa.Column("criado_por_id", sa.Integer, sa.ForeignKey("usuarios.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("convertido_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ultimo_contato", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("leads")
