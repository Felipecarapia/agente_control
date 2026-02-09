from typing import Optional
import uuid
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel


class ProjetoBase(BaseModel):
    tipo: str = "desenvolvimento_software"
    nome: str
    descricao: Optional[str] = None
    cliente_id: uuid.UUID
    status: str = "ativo"
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    valor_orcado: Optional[Decimal] = None
    valor_realizado: Optional[Decimal] = None
    moeda: str = "BRL"
    observacoes_financeiras: Optional[str] = None


class ProjetoCreate(ProjetoBase):
    pass


class ProjetoUpdate(BaseModel):
    tipo: Optional[str] = None
    nome: Optional[str] = None
    descricao: Optional[str] = None
    cliente_id: Optional[uuid.UUID] = None
    status: Optional[str] = None
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    valor_orcado: Optional[Decimal] = None
    valor_realizado: Optional[Decimal] = None
    moeda: Optional[str] = None
    observacoes_financeiras: Optional[str] = None


class ProjetoResponse(ProjetoBase):
    id: uuid.UUID
    usuario_id: Optional[uuid.UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
