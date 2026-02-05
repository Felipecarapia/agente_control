from datetime import date, datetime
from pydantic import BaseModel


class TarefaBase(BaseModel):
    titulo: str
    descricao: str | None = None
    projeto_id: int
    status: str = "pendente"
    prioridade: str | None = None
    responsavel_id: int | None = None
    data_vencimento: date | None = None


class TarefaCreate(TarefaBase):
    pass


class TarefaUpdate(BaseModel):
    titulo: str | None = None
    descricao: str | None = None
    projeto_id: int | None = None
    status: str | None = None
    prioridade: str | None = None
    responsavel_id: int | None = None
    data_vencimento: date | None = None


class TarefaResponse(TarefaBase):
    id: int
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
