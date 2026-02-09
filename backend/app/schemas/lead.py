from typing import Optional, List
import uuid
from datetime import datetime
from pydantic import BaseModel


class LeadBase(BaseModel):
    nome: str
    email: Optional[str] = None
    telefone: Optional[str] = None
    whatsapp: Optional[str] = None
    empresa: Optional[str] = None
    cargo: Optional[str] = None
    site: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    temperatura: str = "frio"
    status: str = "novo"
    score: Optional[int] = 0
    origem: Optional[str] = None
    origem_detalhe: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_term: Optional[str] = None
    utm_content: Optional[str] = None
    landing_page: Optional[str] = None
    referrer: Optional[str] = None
    interesse: Optional[str] = None
    necessidade: Optional[str] = None
    orcamento_estimado: Optional[float] = None
    responsavel_id: Optional[uuid.UUID] = None
    cliente_id: Optional[uuid.UUID] = None
    proxima_acao: Optional[str] = None
    proxima_acao_data: Optional[datetime] = None
    motivo_perda: Optional[str] = None
    observacoes: Optional[str] = None
    ultimo_contato: Optional[datetime] = None


class LeadCreate(LeadBase):
    pass


class LeadUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    whatsapp: Optional[str] = None
    empresa: Optional[str] = None
    cargo: Optional[str] = None
    site: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    temperatura: Optional[str] = None
    status: Optional[str] = None
    score: Optional[int] = None
    origem: Optional[str] = None
    origem_detalhe: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_term: Optional[str] = None
    utm_content: Optional[str] = None
    landing_page: Optional[str] = None
    referrer: Optional[str] = None
    interesse: Optional[str] = None
    necessidade: Optional[str] = None
    orcamento_estimado: Optional[float] = None
    responsavel_id: Optional[uuid.UUID] = None
    cliente_id: Optional[uuid.UUID] = None
    proxima_acao: Optional[str] = None
    proxima_acao_data: Optional[datetime] = None
    motivo_perda: Optional[str] = None
    observacoes: Optional[str] = None
    ultimo_contato: Optional[datetime] = None
    convertido_em: Optional[datetime] = None


class LeadResponse(LeadBase):
    id: uuid.UUID
    criado_por_id: Optional[uuid.UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    convertido_em: Optional[datetime] = None

    class Config:
        from_attributes = True


# ──────────────────── Conversas IA ────────────────────

class LeadMessageResponse(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    role: str  # "agent" | "lead" | "system"
    content: str
    sent_via: str  # "whatsapp" | "web"
    whatsapp_message_id: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LeadConversationResponse(BaseModel):
    id: uuid.UUID
    lead_id: uuid.UUID
    agent_id: Optional[uuid.UUID] = None
    whatsapp_connection_id: Optional[uuid.UUID] = None
    status: str  # "active" | "closed"
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    messages: List[LeadMessageResponse] = []
    agent_name: Optional[str] = None

    class Config:
        from_attributes = True
