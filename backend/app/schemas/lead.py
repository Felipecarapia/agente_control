from datetime import datetime
from pydantic import BaseModel


class LeadBase(BaseModel):
    nome: str
    email: str | None = None
    telefone: str | None = None
    whatsapp: str | None = None
    empresa: str | None = None
    cargo: str | None = None
    site: str | None = None
    cidade: str | None = None
    estado: str | None = None
    temperatura: str = "frio"
    status: str = "novo"
    score: int | None = 0
    origem: str | None = None
    origem_detalhe: str | None = None
    utm_source: str | None = None
    utm_medium: str | None = None
    utm_campaign: str | None = None
    utm_term: str | None = None
    utm_content: str | None = None
    landing_page: str | None = None
    referrer: str | None = None
    interesse: str | None = None
    necessidade: str | None = None
    orcamento_estimado: float | None = None
    responsavel_id: int | None = None
    cliente_id: int | None = None
    proxima_acao: str | None = None
    proxima_acao_data: datetime | None = None
    motivo_perda: str | None = None
    observacoes: str | None = None
    ultimo_contato: datetime | None = None


class LeadCreate(LeadBase):
    pass


class LeadUpdate(BaseModel):
    nome: str | None = None
    email: str | None = None
    telefone: str | None = None
    whatsapp: str | None = None
    empresa: str | None = None
    cargo: str | None = None
    site: str | None = None
    cidade: str | None = None
    estado: str | None = None
    temperatura: str | None = None
    status: str | None = None
    score: int | None = None
    origem: str | None = None
    origem_detalhe: str | None = None
    utm_source: str | None = None
    utm_medium: str | None = None
    utm_campaign: str | None = None
    utm_term: str | None = None
    utm_content: str | None = None
    landing_page: str | None = None
    referrer: str | None = None
    interesse: str | None = None
    necessidade: str | None = None
    orcamento_estimado: float | None = None
    responsavel_id: int | None = None
    cliente_id: int | None = None
    proxima_acao: str | None = None
    proxima_acao_data: datetime | None = None
    motivo_perda: str | None = None
    observacoes: str | None = None
    ultimo_contato: datetime | None = None
    convertido_em: datetime | None = None


class LeadResponse(LeadBase):
    id: int
    criado_por_id: int | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    convertido_em: datetime | None = None

    class Config:
        from_attributes = True
