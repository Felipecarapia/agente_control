from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, Boolean
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class ProposalSession(Base):
    """Sessão de visualização de uma proposta."""
    __tablename__ = "proposal_sessions"

    id = Column(Integer, primary_key=True, index=True)
    proposta_id = Column(Integer, ForeignKey("propostas.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(String(64), nullable=False, index=True)  # UUID gerado no client
    device_id = Column(String(128), nullable=True, index=True)   # Fingerprint leve do dispositivo
    
    # Dados do dispositivo
    device_type = Column(String(20), nullable=True)  # mobile / desktop / tablet
    browser = Column(String(100), nullable=True)
    os = Column(String(100), nullable=True)
    screen_width = Column(Integer, nullable=True)
    screen_height = Column(Integer, nullable=True)
    
    # Localização (via IP)
    ip_address = Column(String(45), nullable=True)  # IPv6 pode ter até 45 chars
    country = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    
    # Origem
    referrer = Column(Text, nullable=True)
    utm_source = Column(String(100), nullable=True)
    utm_medium = Column(String(100), nullable=True)
    utm_campaign = Column(String(100), nullable=True)
    
    # Métricas da sessão
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Float, nullable=True)
    is_returning = Column(Boolean, default=False)  # Sessão recorrente
    
    # Engajamento
    max_scroll_percent = Column(Integer, default=0)  # 0-100
    total_clicks = Column(Integer, default=0)
    sections_viewed = Column(Integer, default=0)
    time_to_first_interaction = Column(Float, nullable=True)  # segundos
    
    # Exit intent
    exit_intent_detected = Column(Boolean, default=False)
    exit_section = Column(String(100), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relacionamentos
    proposta = relationship("Proposta", back_populates="tracking_sessions")
    events = relationship("ProposalEvent", back_populates="session", cascade="all, delete-orphan")


class ProposalEvent(Base):
    """Evento individual de tracking."""
    __tablename__ = "proposal_events"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("proposal_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    proposta_id = Column(Integer, ForeignKey("propostas.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Tipo e identificação do evento
    event_type = Column(String(50), nullable=False, index=True)
    # Tipos: proposal_open, scroll, section_view, section_leave, click, faq_open, faq_close,
    #        exit_intent, inactive, session_end, cta_click, whatsapp_click, etc.
    
    # Dados do evento
    element_id = Column(String(100), nullable=True)   # ID do elemento clicado
    section_id = Column(String(100), nullable=True)   # Seção relacionada ao evento
    section_type = Column(String(50), nullable=True)  # Tipo da seção (hero, beneficios, etc)
    
    # Métricas específicas
    value = Column(Float, nullable=True)              # Valor numérico (ex: scroll %, tempo)
    value_string = Column(String(255), nullable=True) # Valor string (ex: texto do FAQ)
    
    # Dados adicionais em JSON para flexibilidade
    event_metadata = Column(JSON, nullable=True)
    # Ex: { "faq_question": "...", "scroll_direction": "down", "time_visible": 5.2 }
    
    # Posição na página
    scroll_position = Column(Integer, nullable=True)
    viewport_height = Column(Integer, nullable=True)
    
    # Timestamp preciso do evento (client-side)
    client_timestamp = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relacionamentos
    session = relationship("ProposalSession", back_populates="events")
    proposta = relationship("Proposta")


class ProposalAnalyticsSummary(Base):
    """Resumo diário de analytics por proposta (para consultas rápidas)."""
    __tablename__ = "proposal_analytics_summary"

    id = Column(Integer, primary_key=True, index=True)
    proposta_id = Column(Integer, ForeignKey("propostas.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    
    # Métricas do dia
    total_sessions = Column(Integer, default=0)
    unique_devices = Column(Integer, default=0)
    total_events = Column(Integer, default=0)
    
    # Engajamento
    avg_duration_seconds = Column(Float, default=0)
    avg_scroll_percent = Column(Float, default=0)
    total_clicks = Column(Integer, default=0)
    
    # Conversão
    cta_clicks = Column(Integer, default=0)
    whatsapp_clicks = Column(Integer, default=0)
    
    # Por dispositivo
    mobile_sessions = Column(Integer, default=0)
    desktop_sessions = Column(Integer, default=0)
    
    # Returning visitors
    returning_sessions = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    proposta = relationship("Proposta", back_populates="analytics_summaries")
