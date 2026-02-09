import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel


class PropostaBase(BaseModel):
    titulo: str
    descricao: Optional[str] = None
    valor: Optional[Decimal] = None
    cliente_id: uuid.UUID
    projeto_id: Optional[uuid.UUID] = None
    status: str = "rascunho"
    validade_ate: Optional[date] = None


class PropostaCreate(PropostaBase):
    pass


class PropostaUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    valor: Optional[Decimal] = None
    cliente_id: Optional[uuid.UUID] = None
    projeto_id: Optional[uuid.UUID] = None
    status: Optional[str] = None
    validade_ate: Optional[date] = None
    landing_content: Optional[list[dict[str, Any]]] = None


class PropostaResponse(PropostaBase):
    id: uuid.UUID
    usuario_id: Optional[uuid.UUID] = None
    slug: Optional[str] = None
    landing_content: Optional[list[dict[str, Any]]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PropostaPublicResponse(BaseModel):
    id: uuid.UUID
    titulo: str
    descricao: Optional[str] = None
    valor: Optional[Decimal] = None
    validade_ate: Optional[date] = None
    cliente_nome: str
    landing_content: Optional[list[dict[str, Any]]] = None
    slug: Optional[str] = None

    class Config:
        from_attributes = True
