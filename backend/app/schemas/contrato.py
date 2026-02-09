from typing import Optional
import uuid
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel


class ContratoBase(BaseModel):
    numero: str
    proposta_id: Optional[uuid.UUID] = None
    cliente_id: uuid.UUID
    projeto_id: Optional[uuid.UUID] = None
    valor: Optional[Decimal] = None
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    arquivo_url: Optional[str] = None
    status: str = "ativo"


class ContratoCreate(ContratoBase):
    pass


class ContratoUpdate(BaseModel):
    numero: Optional[str] = None
    proposta_id: Optional[uuid.UUID] = None
    cliente_id: Optional[uuid.UUID] = None
    projeto_id: Optional[uuid.UUID] = None
    valor: Optional[Decimal] = None
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    arquivo_url: Optional[str] = None
    status: Optional[str] = None


class ContratoResponse(ContratoBase):
    id: uuid.UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
