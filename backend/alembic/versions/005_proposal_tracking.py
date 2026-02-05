"""Tabelas de tracking de propostas.

Revision ID: 005
Revises: 004
Create Date: 2025-02-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Tabela de sessões de tracking
    op.create_table(
        "proposal_sessions",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("proposta_id", sa.Integer(), sa.ForeignKey("propostas.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("session_id", sa.String(64), nullable=False, index=True),
        sa.Column("device_id", sa.String(128), nullable=True, index=True),
        
        # Dados do dispositivo
        sa.Column("device_type", sa.String(20), nullable=True),
        sa.Column("browser", sa.String(100), nullable=True),
        sa.Column("os", sa.String(100), nullable=True),
        sa.Column("screen_width", sa.Integer(), nullable=True),
        sa.Column("screen_height", sa.Integer(), nullable=True),
        
        # Localização
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("country", sa.String(100), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        
        # Origem
        sa.Column("referrer", sa.Text(), nullable=True),
        sa.Column("utm_source", sa.String(100), nullable=True),
        sa.Column("utm_medium", sa.String(100), nullable=True),
        sa.Column("utm_campaign", sa.String(100), nullable=True),
        
        # Métricas da sessão
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_seconds", sa.Float(), nullable=True),
        sa.Column("is_returning", sa.Boolean(), default=False),
        
        # Engajamento
        sa.Column("max_scroll_percent", sa.Integer(), default=0),
        sa.Column("total_clicks", sa.Integer(), default=0),
        sa.Column("sections_viewed", sa.Integer(), default=0),
        sa.Column("time_to_first_interaction", sa.Float(), nullable=True),
        
        # Exit intent
        sa.Column("exit_intent_detected", sa.Boolean(), default=False),
        sa.Column("exit_section", sa.String(100), nullable=True),
        
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Tabela de eventos de tracking
    op.create_table(
        "proposal_events",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("proposal_sessions.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("proposta_id", sa.Integer(), sa.ForeignKey("propostas.id", ondelete="CASCADE"), nullable=False, index=True),
        
        # Tipo e identificação
        sa.Column("event_type", sa.String(50), nullable=False, index=True),
        sa.Column("element_id", sa.String(100), nullable=True),
        sa.Column("section_id", sa.String(100), nullable=True),
        sa.Column("section_type", sa.String(50), nullable=True),
        
        # Valores
        sa.Column("value", sa.Float(), nullable=True),
        sa.Column("value_string", sa.String(255), nullable=True),
        sa.Column("event_metadata", JSON(), nullable=True),
        
        # Posição
        sa.Column("scroll_position", sa.Integer(), nullable=True),
        sa.Column("viewport_height", sa.Integer(), nullable=True),
        
        # Timestamps
        sa.Column("client_timestamp", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    
    # Tabela de resumo diário (para consultas rápidas)
    op.create_table(
        "proposal_analytics_summary",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("proposta_id", sa.Integer(), sa.ForeignKey("propostas.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("date", sa.DateTime(timezone=True), nullable=False, index=True),
        
        # Métricas do dia
        sa.Column("total_sessions", sa.Integer(), default=0),
        sa.Column("unique_devices", sa.Integer(), default=0),
        sa.Column("total_events", sa.Integer(), default=0),
        
        # Engajamento
        sa.Column("avg_duration_seconds", sa.Float(), default=0),
        sa.Column("avg_scroll_percent", sa.Float(), default=0),
        sa.Column("total_clicks", sa.Integer(), default=0),
        
        # Conversão
        sa.Column("cta_clicks", sa.Integer(), default=0),
        sa.Column("whatsapp_clicks", sa.Integer(), default=0),
        
        # Por dispositivo
        sa.Column("mobile_sessions", sa.Integer(), default=0),
        sa.Column("desktop_sessions", sa.Integer(), default=0),
        
        # Returning visitors
        sa.Column("returning_sessions", sa.Integer(), default=0),
        
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Índices adicionais
    op.create_index("ix_proposal_sessions_proposta_session", "proposal_sessions", ["proposta_id", "session_id"])
    op.create_index("ix_proposal_events_proposta_type", "proposal_events", ["proposta_id", "event_type"])
    op.create_index("ix_proposal_analytics_proposta_date", "proposal_analytics_summary", ["proposta_id", "date"])


def downgrade() -> None:
    op.drop_index("ix_proposal_analytics_proposta_date", table_name="proposal_analytics_summary")
    op.drop_index("ix_proposal_events_proposta_type", table_name="proposal_events")
    op.drop_index("ix_proposal_sessions_proposta_session", table_name="proposal_sessions")
    
    op.drop_table("proposal_analytics_summary")
    op.drop_table("proposal_events")
    op.drop_table("proposal_sessions")
