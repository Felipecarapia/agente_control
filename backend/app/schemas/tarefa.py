import uuid
from datetime import date, datetime
from pydantic import BaseModel


class TarefaBase(BaseModel):
    titulo: str
    descricao: str | None = None
    projeto_id: uuid.UUID
    status: str = "pendente"
    prioridade: str | None = None
    responsavel_id: uuid.UUID | None = None
    data_vencimento: date | None = None


class TarefaCreate(TarefaBase):
    pass


class TarefaUpdate(BaseModel):
    titulo: str | None = None
    descricao: str | None = None
    projeto_id: uuid.UUID | None = None
    status: str | None = None
    prioridade: str | None = None
    responsavel_id: uuid.UUID | None = None
    data_vencimento: date | None = None


class TarefaResponse(TarefaBase):
    id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
