import logging
from datetime import datetime, timedelta
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func, distinct
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.proposta import Proposta
from app.models.tracking import ProposalSession, ProposalEvent, ProposalAnalyticsSummary
from app.models.usuario import Usuario
from app.schemas.tracking import (
    SessionStartPayload,
    EventPayload,
    BatchEventsPayload,
    SessionEndPayload,
    SessionResponse,
    AnalyticsOverview,
    TimeSeriesPoint,
    SectionEngagement,
    DeviceBreakdown,
    ClickDetail,
    FAQEngagement,
    SessionDetail,
    FullAnalytics,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tracking", tags=["tracking"])


# ============== Helpers ==============

def get_client_ip(request: Request) -> str:
    """Extrai o IP real do cliente."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def get_geo_from_ip(ip: str) -> dict:
    """Obtém localização do IP (simplificado - em produção usar serviço externo)."""
    # TODO: Integrar com serviço de geolocalização (ip-api.com, ipinfo.io, etc)
    return {"country": None, "city": None}


# ============== Endpoints Públicos (sem auth - para tracking) ==============

@router.post("/proposals/{slug}/session/start", response_model=SessionResponse)
def start_session(
    slug: str,
    payload: SessionStartPayload,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
):
    """Inicia uma nova sessão de visualização da proposta."""
    proposta = db.query(Proposta).filter(Proposta.slug == slug).first()
    if not proposta:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    
    # Verificar se é sessão recorrente (mesmo device_id)
    is_returning = False
    if payload.device_id:
        existing = db.query(ProposalSession).filter(
            ProposalSession.proposta_id == proposta.id,
            ProposalSession.device_id == payload.device_id
        ).first()
        is_returning = existing is not None
    
    # Obter IP e geo
    client_ip = get_client_ip(request)
    geo = get_geo_from_ip(client_ip)
    
    # Criar sessão
    session = ProposalSession(
        proposta_id=proposta.id,
        session_id=payload.session_id,
        device_id=payload.device_id,
        device_type=payload.device_type,
        browser=payload.browser,
        os=payload.os,
        screen_width=payload.screen_width,
        screen_height=payload.screen_height,
        ip_address=client_ip,
        country=geo.get("country"),
        city=geo.get("city"),
        referrer=payload.referrer,
        utm_source=payload.utm_source,
        utm_medium=payload.utm_medium,
        utm_campaign=payload.utm_campaign,
        is_returning=is_returning,
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    # Criar evento de abertura
    open_event = ProposalEvent(
        session_id=session.id,
        proposta_id=proposta.id,
        event_type="proposal_open",
        event_metadata={
            "device_type": payload.device_type,
            "browser": payload.browser,
            "os": payload.os,
            "referrer": payload.referrer,
        }
    )
    db.add(open_event)
    db.commit()
    
    logger.info(f"[TRACKING] Sessão iniciada: {session.session_id} para proposta {proposta.id}")
    return session


@router.post("/proposals/{slug}/events")
def track_event(
    slug: str,
    payload: EventPayload,
    db: Annotated[Session, Depends(get_db)],
):
    """Registra um evento de tracking."""
    proposta = db.query(Proposta).filter(Proposta.slug == slug).first()
    if not proposta:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    
    # Buscar sessão
    session = db.query(ProposalSession).filter(
        ProposalSession.proposta_id == proposta.id,
        ProposalSession.session_id == payload.session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    
    # Criar evento
    event = ProposalEvent(
        session_id=session.id,
        proposta_id=proposta.id,
        event_type=payload.event_type,
        element_id=payload.element_id,
        section_id=payload.section_id,
        section_type=payload.section_type,
        value=payload.value,
        value_string=payload.value_string,
        event_metadata=payload.metadata,
        scroll_position=payload.scroll_position,
        viewport_height=payload.viewport_height,
        client_timestamp=payload.client_timestamp,
    )
    
    db.add(event)
    
    # Atualizar métricas da sessão baseado no evento
    if payload.event_type == "scroll" and payload.value:
        if payload.value > (session.max_scroll_percent or 0):
            session.max_scroll_percent = int(payload.value)
    
    if payload.event_type in ["click", "cta_click", "whatsapp_click"]:
        session.total_clicks = (session.total_clicks or 0) + 1
    
    if payload.event_type == "section_view":
        session.sections_viewed = (session.sections_viewed or 0) + 1
    
    if payload.event_type == "first_interaction" and payload.value:
        session.time_to_first_interaction = payload.value
    
    if payload.event_type == "exit_intent":
        session.exit_intent_detected = True
        session.exit_section = payload.section_id
    
    db.commit()
    
    return {"status": "ok", "event_id": event.id}


@router.post("/proposals/{slug}/events/batch")
def track_events_batch(
    slug: str,
    payload: BatchEventsPayload,
    db: Annotated[Session, Depends(get_db)],
):
    """Registra múltiplos eventos de uma vez (para otimizar requests)."""
    logger.info(f"[TRACKING BATCH] Recebido batch para {slug}, session_id={payload.session_id}, {len(payload.events)} eventos")
    
    # Log detalhado de cada evento para debug
    for i, evt in enumerate(payload.events):
        logger.info(f"[TRACKING BATCH] Evento {i+1}: type={evt.event_type}, value={evt.value}, metadata={evt.metadata}")
    
    proposta = db.query(Proposta).filter(Proposta.slug == slug).first()
    if not proposta:
        logger.warning(f"[TRACKING BATCH] Proposta não encontrada: {slug}")
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    
    session = db.query(ProposalSession).filter(
        ProposalSession.proposta_id == proposta.id,
        ProposalSession.session_id == payload.session_id
    ).first()
    
    if not session:
        logger.warning(f"[TRACKING BATCH] Sessão não encontrada: {payload.session_id}")
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    
    event_ids = []
    for evt in payload.events:
        event = ProposalEvent(
            session_id=session.id,
            proposta_id=proposta.id,
            event_type=evt.event_type,
            element_id=evt.element_id,
            section_id=evt.section_id,
            section_type=evt.section_type,
            value=evt.value,
            value_string=evt.value_string,
            event_metadata=evt.metadata,
            scroll_position=evt.scroll_position,
            viewport_height=evt.viewport_height,
            client_timestamp=evt.client_timestamp,
        )
        db.add(event)
        db.flush()
        event_ids.append(event.id)
        
        # Log de todos os eventos para debug
        logger.info(f"[TRACKING EVENTO] {evt.event_type}, value={evt.value}, metadata={evt.metadata}")
        
        # Atualizar métricas da sessão
        if evt.event_type == "scroll":
            logger.info(f"[TRACKING SCROLL] Evento scroll recebido, value={evt.value}, atual={session.max_scroll_percent}")
            if evt.value and evt.value > (session.max_scroll_percent or 0):
                logger.info(f"[TRACKING] Atualizando scroll: {session.max_scroll_percent or 0} -> {int(evt.value)}")
                session.max_scroll_percent = int(evt.value)
        if evt.event_type in ["click", "cta_click", "whatsapp_click"]:
            session.total_clicks = (session.total_clicks or 0) + 1
            logger.info(f"[TRACKING] Click detectado: {evt.event_type}, total: {session.total_clicks}")
    
    db.commit()
    
    return {"status": "ok", "event_ids": event_ids}


@router.post("/proposals/{slug}/session/end")
def end_session(
    slug: str,
    payload: SessionEndPayload,
    db: Annotated[Session, Depends(get_db)],
):
    """Finaliza uma sessão."""
    proposta = db.query(Proposta).filter(Proposta.slug == slug).first()
    if not proposta:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    
    session = db.query(ProposalSession).filter(
        ProposalSession.proposta_id == proposta.id,
        ProposalSession.session_id == payload.session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    
    session.ended_at = func.now()
    session.duration_seconds = payload.duration_seconds
    if payload.max_scroll_percent:
        session.max_scroll_percent = payload.max_scroll_percent
    if payload.total_clicks:
        session.total_clicks = payload.total_clicks
    if payload.sections_viewed:
        session.sections_viewed = payload.sections_viewed
    
    # Criar evento de fim de sessão
    end_event = ProposalEvent(
        session_id=session.id,
        proposta_id=proposta.id,
        event_type="session_end",
        value=payload.duration_seconds,
        event_metadata={
            "max_scroll_percent": payload.max_scroll_percent,
            "total_clicks": payload.total_clicks,
            "sections_viewed": payload.sections_viewed,
        }
    )
    db.add(end_event)
    db.commit()
    
    logger.info(f"[TRACKING] Sessão finalizada: {session.session_id}, duração: {payload.duration_seconds}s")
    return {"status": "ok"}


# ============== Endpoints de Analytics (com auth) ==============

@router.get("/proposals/{proposta_id}/analytics", response_model=FullAnalytics)
def get_proposal_analytics(
    proposta_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
    days: int = 30,
):
    """Obtém analytics completo de uma proposta."""
    proposta = db.query(Proposta).filter(Proposta.id == proposta_id).first()
    if not proposta:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    
    since = datetime.utcnow() - timedelta(days=days)
    
    # Query base de sessões
    sessions_query = db.query(ProposalSession).filter(
        ProposalSession.proposta_id == proposta_id,
        ProposalSession.started_at >= since
    )
    
    sessions = sessions_query.all()
    total_sessions = len(sessions)
    
    # Métricas básicas
    unique_devices = db.query(func.count(distinct(ProposalSession.device_id))).filter(
        ProposalSession.proposta_id == proposta_id,
        ProposalSession.started_at >= since,
        ProposalSession.device_id.isnot(None)
    ).scalar() or 0
    
    total_events = db.query(func.count(ProposalEvent.id)).filter(
        ProposalEvent.proposta_id == proposta_id,
        ProposalEvent.created_at >= since
    ).scalar() or 0
    
    # Médias
    avg_duration = 0
    avg_scroll = 0
    total_clicks = 0
    mobile_count = 0
    desktop_count = 0
    tablet_count = 0
    returning_count = 0
    sessions_with_duration = 0
    
    for s in sessions:
        # Calcular duração: usar duration_seconds se existir, senão estimar pelo último evento
        session_duration = s.duration_seconds
        if not session_duration:
            # Buscar último evento da sessão para estimar duração
            last_event = db.query(ProposalEvent).filter(
                ProposalEvent.session_id == s.id
            ).order_by(ProposalEvent.created_at.desc()).first()
            
            if last_event and s.started_at:
                session_duration = (last_event.created_at - s.started_at).total_seconds()
        
        if session_duration and session_duration > 0:
            avg_duration += session_duration
            sessions_with_duration += 1
        
        avg_scroll += s.max_scroll_percent or 0
        total_clicks += s.total_clicks or 0
        
        if s.device_type == "mobile":
            mobile_count += 1
        elif s.device_type == "desktop":
            desktop_count += 1
        elif s.device_type == "tablet":
            tablet_count += 1
        
        if s.is_returning:
            returning_count += 1
    
    if sessions_with_duration > 0:
        avg_duration = avg_duration / sessions_with_duration
    if total_sessions > 0:
        avg_scroll = avg_scroll / total_sessions
    
    # Cliques em CTAs
    cta_clicks = db.query(func.count(ProposalEvent.id)).filter(
        ProposalEvent.proposta_id == proposta_id,
        ProposalEvent.created_at >= since,
        ProposalEvent.event_type == "cta_click"
    ).scalar() or 0
    
    whatsapp_clicks = db.query(func.count(ProposalEvent.id)).filter(
        ProposalEvent.proposta_id == proposta_id,
        ProposalEvent.created_at >= since,
        ProposalEvent.event_type == "whatsapp_click"
    ).scalar() or 0
    
    # Overview
    overview = AnalyticsOverview(
        proposta_id=proposta_id,
        total_sessions=total_sessions,
        unique_devices=unique_devices,
        total_events=total_events,
        avg_duration_seconds=round(avg_duration, 1),
        avg_scroll_percent=round(avg_scroll, 1),
        total_clicks=total_clicks,
        cta_clicks=cta_clicks,
        whatsapp_clicks=whatsapp_clicks,
        mobile_percent=round((mobile_count / total_sessions * 100) if total_sessions > 0 else 0, 1),
        desktop_percent=round((desktop_count / total_sessions * 100) if total_sessions > 0 else 0, 1),
        returning_percent=round((returning_count / total_sessions * 100) if total_sessions > 0 else 0, 1),
    )
    
    # Sessões ao longo do tempo (por dia)
    sessions_over_time = []
    for i in range(days):
        day = datetime.utcnow().date() - timedelta(days=days - 1 - i)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())
        count = db.query(func.count(ProposalSession.id)).filter(
            ProposalSession.proposta_id == proposta_id,
            ProposalSession.started_at >= day_start,
            ProposalSession.started_at <= day_end
        ).scalar() or 0
        sessions_over_time.append(TimeSeriesPoint(date=day.isoformat(), value=count))
    
    # Engajamento por seção
    section_stats = db.query(
        ProposalEvent.section_id,
        ProposalEvent.section_type,
        func.count(ProposalEvent.id).label("views"),
        func.avg(ProposalEvent.value).label("avg_time")
    ).filter(
        ProposalEvent.proposta_id == proposta_id,
        ProposalEvent.created_at >= since,
        ProposalEvent.event_type.in_(["section_view", "section_leave"]),
        ProposalEvent.section_id.isnot(None)
    ).group_by(ProposalEvent.section_id, ProposalEvent.section_type).all()
    
    section_engagement = []
    for stat in section_stats:
        clicks_in_section = db.query(func.count(ProposalEvent.id)).filter(
            ProposalEvent.proposta_id == proposta_id,
            ProposalEvent.section_id == stat.section_id,
            ProposalEvent.event_type == "click"
        ).scalar() or 0
        
        section_engagement.append(SectionEngagement(
            section_id=stat.section_id or "unknown",
            section_type=stat.section_type,
            views=stat.views,
            avg_time_seconds=round(stat.avg_time or 0, 1),
            clicks=clicks_in_section,
            scroll_depth_reached=stat.views  # Simplificado
        ))
    
    # Distribuição por dispositivo
    device_breakdown = DeviceBreakdown(
        mobile=mobile_count,
        desktop=desktop_count,
        tablet=tablet_count
    )
    
    # Top cliques
    top_clicks_query = db.query(
        ProposalEvent.element_id,
        ProposalEvent.section_id,
        func.count(ProposalEvent.id).label("count"),
        func.max(ProposalEvent.created_at).label("last_clicked")
    ).filter(
        ProposalEvent.proposta_id == proposta_id,
        ProposalEvent.created_at >= since,
        ProposalEvent.event_type.in_(["click", "cta_click", "whatsapp_click"]),
        ProposalEvent.element_id.isnot(None)
    ).group_by(ProposalEvent.element_id, ProposalEvent.section_id).order_by(
        func.count(ProposalEvent.id).desc()
    ).limit(10).all()
    
    top_clicks = [
        ClickDetail(
            element_id=c.element_id or "unknown",
            section_id=c.section_id,
            count=c.count,
            last_clicked=c.last_clicked
        ) for c in top_clicks_query
    ]
    
    # FAQ engagement
    faq_stats = db.query(
        ProposalEvent.element_id,
        ProposalEvent.value_string,
        func.count(ProposalEvent.id).label("opens"),
        func.avg(ProposalEvent.value).label("avg_time")
    ).filter(
        ProposalEvent.proposta_id == proposta_id,
        ProposalEvent.created_at >= since,
        ProposalEvent.event_type == "faq_open"
    ).group_by(ProposalEvent.element_id, ProposalEvent.value_string).all()
    
    faq_engagement = [
        FAQEngagement(
            question_id=f.element_id or "unknown",
            question_text=f.value_string,
            opens=f.opens,
            avg_time_open_seconds=round(f.avg_time or 0, 1)
        ) for f in faq_stats
    ]
    
    # Sessões recentes
    recent_sessions = sessions_query.order_by(ProposalSession.started_at.desc()).limit(20).all()
    recent_sessions_data = [
        SessionDetail(
            id=s.id,
            session_id=s.session_id,
            device_type=s.device_type,
            browser=s.browser,
            os=s.os,
            city=s.city,
            country=s.country,
            started_at=s.started_at,
            duration_seconds=s.duration_seconds,
            max_scroll_percent=s.max_scroll_percent or 0,
            total_clicks=s.total_clicks or 0,
            is_returning=s.is_returning or False,
            exit_intent_detected=s.exit_intent_detected or False,
        ) for s in recent_sessions
    ]
    
    # Distribuição de scroll
    scroll_dist = {"25": 0, "50": 0, "75": 0, "100": 0}
    for s in sessions:
        scroll = s.max_scroll_percent or 0
        if scroll >= 25:
            scroll_dist["25"] += 1
        if scroll >= 50:
            scroll_dist["50"] += 1
        if scroll >= 75:
            scroll_dist["75"] += 1
        if scroll >= 100:
            scroll_dist["100"] += 1
    
    return FullAnalytics(
        overview=overview,
        sessions_over_time=sessions_over_time,
        section_engagement=section_engagement,
        device_breakdown=device_breakdown,
        top_clicks=top_clicks,
        faq_engagement=faq_engagement,
        recent_sessions=recent_sessions_data,
        scroll_distribution=scroll_dist
    )


@router.get("/proposals/{proposta_id}/sessions")
def list_proposal_sessions(
    proposta_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
    skip: int = 0,
    limit: int = 50,
):
    """Lista sessões de uma proposta."""
    sessions = db.query(ProposalSession).filter(
        ProposalSession.proposta_id == proposta_id
    ).order_by(ProposalSession.started_at.desc()).offset(skip).limit(limit).all()
    
    return [SessionDetail(
        id=s.id,
        session_id=s.session_id,
        device_type=s.device_type,
        browser=s.browser,
        os=s.os,
        city=s.city,
        country=s.country,
        started_at=s.started_at,
        duration_seconds=s.duration_seconds,
        max_scroll_percent=s.max_scroll_percent or 0,
        total_clicks=s.total_clicks or 0,
        is_returning=s.is_returning or False,
        exit_intent_detected=s.exit_intent_detected or False,
    ) for s in sessions]


@router.get("/proposals/{proposta_id}/sessions/{session_id}/events")
def get_session_events(
    proposta_id: int,
    session_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Obtém todos os eventos de uma sessão específica."""
    session = db.query(ProposalSession).filter(
        ProposalSession.id == session_id,
        ProposalSession.proposta_id == proposta_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    
    events = db.query(ProposalEvent).filter(
        ProposalEvent.session_id == session_id
    ).order_by(ProposalEvent.created_at).all()
    
    return {
        "session": SessionDetail(
            id=session.id,
            session_id=session.session_id,
            device_type=session.device_type,
            browser=session.browser,
            os=session.os,
            city=session.city,
            country=session.country,
            started_at=session.started_at,
            duration_seconds=session.duration_seconds,
            max_scroll_percent=session.max_scroll_percent or 0,
            total_clicks=session.total_clicks or 0,
            is_returning=session.is_returning or False,
            exit_intent_detected=session.exit_intent_detected or False,
        ),
        "events": [
            {
                "id": e.id,
                "event_type": e.event_type,
                "element_id": e.element_id,
                "section_id": e.section_id,
                "section_type": e.section_type,
                "value": e.value,
                "value_string": e.value_string,
                "metadata": e.event_metadata,
                "created_at": e.created_at,
            } for e in events
        ]
    }
