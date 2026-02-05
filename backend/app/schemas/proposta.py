from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel


class PropostaBase(BaseModel):
    titulo: str
    descricao: str | None = None
    valor: Decimal | None = None
    cliente_id: int
    projeto_id: int | None = None
    status: str = "rascunho"
    validade_ate: date | None = None


class PropostaCreate(PropostaBase):
    pass


class PropostaUpdate(BaseModel):
    titulo: str | None = None
    descricao: str | None = None
    valor: Decimal | None = None
    cliente_id: int | None = None
    projeto_id: int | None = None
    status: str | None = None
    validade_ate: date | None = None
    landing_content: list[dict[str, Any]] | None = None


class PropostaResponse(PropostaBase):
    id: int
    usuario_id: int | None = None
    slug: str | None = None
    landing_content: list[dict[str, Any]] | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class PropostaPublicResponse(BaseModel):
    id: int
    titulo: str
    descricao: str | None = None
    valor: Decimal | None = None
    validade_ate: date | None = None
    cliente_nome: str
    landing_content: list[dict[str, Any]] | None = None
    slug: str | None = None

    class Config:
        from_attributes = True
