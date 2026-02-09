import uuid
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


# ============== Schemas de entrada (do client) ==============

class SessionStartPayload(BaseModel):
    """Payload para iniciar uma sessão."""
    session_id: str = Field(..., description="UUID da sessão gerado no client")
    device_id: Optional[str] = Field(None, description="Fingerprint do dispositivo")
    device_type: Optional[str] = Field(None, description="mobile / desktop / tablet")
    browser: Optional[str] = None
    os: Optional[str] = None
    screen_width: Optional[int] = None
    screen_height: Optional[int] = None
    referrer: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None


class EventPayload(BaseModel):
    """Payload para registrar um evento."""
    session_id: str = Field(..., description="UUID da sessão")
    event_type: str = Field(..., description="Tipo do evento")
    element_id: Optional[str] = None
    section_id: Optional[str] = None
    section_type: Optional[str] = None
    value: Optional[float] = None
    value_string: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None
    scroll_position: Optional[int] = None
    viewport_height: Optional[int] = None
    client_timestamp: Optional[datetime] = None


class BatchEventItem(BaseModel):
    """Evento individual dentro de um batch (sem session_id, pois vem do nível superior)."""
    event_type: str = Field(..., description="Tipo do evento")
    element_id: Optional[str] = None
    section_id: Optional[str] = None
    section_type: Optional[str] = None
    value: Optional[float] = None
    value_string: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None
    scroll_position: Optional[int] = None
    viewport_height: Optional[int] = None
    client_timestamp: Optional[datetime] = None


class BatchEventsPayload(BaseModel):
    """Payload para enviar múltiplos eventos de uma vez."""
    session_id: str
    events: list[BatchEventItem]


class SessionEndPayload(BaseModel):
    """Payload para finalizar uma sessão."""
    session_id: str
    duration_seconds: Optional[float] = None
    max_scroll_percent: Optional[int] = None
    total_clicks: Optional[int] = None
    sections_viewed: Optional[int] = None


# ============== Schemas de resposta ==============

class SessionResponse(BaseModel):
    id: uuid.UUID
    session_id: str
    proposta_id: uuid.UUID
    device_type: Optional[str]
    is_returning: bool
    started_at: datetime

    class Config:
        from_attributes = True


class EventResponse(BaseModel):
    id: uuid.UUID
    event_type: str
    section_id: Optional[str]
    value: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


# ============== Schemas para Analytics/Dashboard ==============

class AnalyticsOverview(BaseModel):
    """Visão geral de analytics de uma proposta."""
    proposta_id: uuid.UUID
    total_sessions: int
    unique_devices: int
    total_events: int
    avg_duration_seconds: float
    avg_scroll_percent: float
    total_clicks: int
    cta_clicks: int
    whatsapp_clicks: int
    mobile_percent: float
    desktop_percent: float
    returning_percent: float


class TimeSeriesPoint(BaseModel):
    """Ponto de série temporal."""
    date: str
    value: float


class SectionEngagement(BaseModel):
    """Engajamento por seção."""
    section_id: str
    section_type: Optional[str]
    views: int
    avg_time_seconds: float
    clicks: int
    scroll_depth_reached: int  # Quantas sessões chegaram até essa seção


class DeviceBreakdown(BaseModel):
    """Distribuição por dispositivo."""
    mobile: int
    desktop: int
    tablet: int


class ClickDetail(BaseModel):
    """Detalhe de clique."""
    element_id: str
    section_id: Optional[str]
    count: int
    last_clicked: datetime


class FAQEngagement(BaseModel):
    """Engajamento com FAQ."""
    question_id: str
    question_text: Optional[str]
    opens: int
    avg_time_open_seconds: float


class SessionDetail(BaseModel):
    """Detalhe de uma sessão individual."""
    id: uuid.UUID
    session_id: str
    device_type: Optional[str]
    browser: Optional[str]
    os: Optional[str]
    city: Optional[str]
    country: Optional[str]
    started_at: datetime
    duration_seconds: Optional[float]
    max_scroll_percent: int
    total_clicks: int
    is_returning: bool
    exit_intent_detected: bool

    class Config:
        from_attributes = True


class FullAnalytics(BaseModel):
    """Analytics completo para o dashboard."""
    overview: AnalyticsOverview
    sessions_over_time: list[TimeSeriesPoint]
    section_engagement: list[SectionEngagement]
    device_breakdown: DeviceBreakdown
    top_clicks: list[ClickDetail]
    faq_engagement: list[FAQEngagement]
    recent_sessions: list[SessionDetail]
    scroll_distribution: dict[str, int]  # {"25": 100, "50": 80, "75": 60, "100": 40}
