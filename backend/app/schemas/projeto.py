import uuid
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel


class ProjetoBase(BaseModel):
    tipo: str = "desenvolvimento_software"
    nome: str
    descricao: str | None = None
    cliente_id: uuid.UUID
    status: str = "ativo"
    data_inicio: date | None = None
    data_fim: date | None = None
    valor_orcado: Decimal | None = None
    valor_realizado: Decimal | None = None
    moeda: str = "BRL"
    observacoes_financeiras: str | None = None


class ProjetoCreate(ProjetoBase):
    pass


class ProjetoUpdate(BaseModel):
    tipo: str | None = None
    nome: str | None = None
    descricao: str | None = None
    cliente_id: uuid.UUID | None = None
    status: str | None = None
    data_inicio: date | None = None
    data_fim: date | None = None
    valor_orcado: Decimal | None = None
    valor_realizado: Decimal | None = None
    moeda: str | None = None
    observacoes_financeiras: str | None = None


class ProjetoResponse(ProjetoBase):
    id: uuid.UUID
    usuario_id: uuid.UUID | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
