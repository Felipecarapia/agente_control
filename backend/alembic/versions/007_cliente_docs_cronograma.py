"""cliente documentos rag, imagens e cronograma

Revision ID: 007
Revises: 006
Create Date: 2026-01-31
"""
from alembic import op
import sqlalchemy as sa

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Documentos RAG
    op.create_table(
        "cliente_documentos_rag",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("cliente_id", sa.Integer, sa.ForeignKey("clientes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("nome_original", sa.String(500), nullable=False),
        sa.Column("nome_storage", sa.String(500), nullable=False),
        sa.Column("url", sa.String(1000), nullable=False),
        sa.Column("content_type", sa.String(100), nullable=True),
        sa.Column("tamanho_bytes", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Imagens gerais
    op.create_table(
        "cliente_imagens",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("cliente_id", sa.Integer, sa.ForeignKey("clientes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("nome_original", sa.String(500), nullable=False),
        sa.Column("nome_storage", sa.String(500), nullable=False),
        sa.Column("url", sa.String(1000), nullable=False),
        sa.Column("content_type", sa.String(100), nullable=True),
        sa.Column("tamanho_bytes", sa.Integer, nullable=True),
        sa.Column("descricao", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Cronograma - Etapas
    op.create_table(
        "cliente_cronograma_etapas",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("cliente_id", sa.Integer, sa.ForeignKey("clientes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ordem", sa.Integer, nullable=False, server_default="0"),
        sa.Column("titulo", sa.String(255), nullable=False),
        sa.Column("descricao", sa.Text, nullable=True),
        sa.Column("cor", sa.String(20), nullable=True, server_default="blue"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Cronograma - Itens do checklist
    op.create_table(
        "cliente_cronograma_itens",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("etapa_id", sa.Integer, sa.ForeignKey("cliente_cronograma_etapas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ordem", sa.Integer, nullable=False, server_default="0"),
        sa.Column("texto", sa.String(500), nullable=False),
        sa.Column("concluido", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("categoria", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("cliente_cronograma_itens")
    op.drop_table("cliente_cronograma_etapas")
    op.drop_table("cliente_imagens")
    op.drop_table("cliente_documentos_rag")
