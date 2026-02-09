import uuid
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel


class ContratoBase(BaseModel):
    numero: str
    proposta_id: uuid.UUID | None = None
    cliente_id: uuid.UUID
    projeto_id: uuid.UUID | None = None
    valor: Decimal | None = None
    data_inicio: date | None = None
    data_fim: date | None = None
    arquivo_url: str | None = None
    status: str = "ativo"


class ContratoCreate(ContratoBase):
    pass


class ContratoUpdate(BaseModel):
    numero: str | None = None
    proposta_id: uuid.UUID | None = None
    cliente_id: uuid.UUID | None = None
    projeto_id: uuid.UUID | None = None
    valor: Decimal | None = None
    data_inicio: date | None = None
    data_fim: date | None = None
    arquivo_url: str | None = None
    status: str | None = None


class ContratoResponse(ContratoBase):
    id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
