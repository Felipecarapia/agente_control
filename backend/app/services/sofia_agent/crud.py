from sqlalchemy.orm import Session
from app.models.lead import Lead, LeadConversation, LeadMessage, LeadMessageRole, LeadAppointment, LeadFollowUp
from app.models.tenant import Tenant
import uuid
import datetime

def _get_lead(session: Session, lead_id: uuid.UUID) -> Lead:
    return session.query(Lead).filter(Lead.id == lead_id).first()

def update_lead_status(session: Session, lead_id: uuid.UUID, status: str):
    lead = _get_lead(session, lead_id)
    if lead:
        lead.status = status
        session.commit()

def create_appointment(session: Session, lead_id: uuid.UUID, event_id: str, start_time: datetime.datetime, end_time: datetime.datetime, summary: str = "", description: str = ""):
    existing = session.query(LeadAppointment).filter(LeadAppointment.google_event_id == event_id).first()
    if existing:
        return None

    appointment = LeadAppointment(
        lead_id=lead_id,
        google_event_id=event_id,
        start_time=start_time,
        end_time=end_time,
        summary=summary,
        description=description,
        status="Agendado"
    )
    session.add(appointment)
    
    # Atualiza o status do lead
    lead = _get_lead(session, lead_id)
    if lead:
        lead.status = "negociando" # mapeado do status Agendado para sistemavitus
        
    session.commit()
    return appointment

def get_lead_appointments(session: Session, lead_id: uuid.UUID):
    return session.query(LeadAppointment).filter(
        LeadAppointment.lead_id == lead_id,
        LeadAppointment.status == "Agendado"
    ).order_by(LeadAppointment.start_time.asc()).all()

def delete_appointment_by_event_id(session: Session, event_id: str):
    appt = session.query(LeadAppointment).filter(LeadAppointment.google_event_id == event_id).first()
    if appt:
        appt.status = "Cancelado"
        session.commit()
        return True
    return False

def get_conversation_history(session: Session, lead_id: uuid.UUID, limit: int = 8):
    conv = session.query(LeadConversation).filter(LeadConversation.lead_id == lead_id, LeadConversation.status == "active").first()
    if not conv:
        return []
    messages = session.query(LeadMessage).filter(LeadMessage.conversation_id == conv.id).order_by(LeadMessage.created_at.desc()).limit(limit).all()
    return list(reversed(messages))
