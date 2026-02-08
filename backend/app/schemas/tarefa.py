from datetime import date, datetime
from typing import List
from pydantic import BaseModel


class TarefaBase(BaseModel):
    titulo: str
    descricao: str | None = None
    projeto_id: int
    status: str = "pendente"
    prioridade: str | None = None
    responsavel_id: int | None = None
    data_vencimento: date | None = None
    # Campos de recorrência
    is_recurring: bool = False
    recurrence_type: str | None = None  # diaria, semanal, mensal
    recurrence_interval: int | None = None  # a cada X dias/semanas/meses
    recurrence_end_date: date | None = None
    # Múltiplos usuários atribuídos
    assigned_user_ids: List[int] = []


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
    is_recurring: bool | None = None
    recurrence_type: str | None = None
    recurrence_interval: int | None = None
    recurrence_end_date: date | None = None
    assigned_user_ids: List[int] | None = None


class TarefaAssigneeResponse(BaseModel):
    id: int
    usuario_id: int
    usuario_nome: str | None = None

    class Config:
        from_attributes = True


class TarefaResponse(BaseModel):
    id: int
    titulo: str
    descricao: str | None = None
    projeto_id: int
    status: str = "pendente"
    prioridade: str | None = None
    responsavel_id: int | None = None
    data_vencimento: date | None = None
    # Campos de recorrência
    is_recurring: bool = False
    recurrence_type: str | None = None
    recurrence_interval: int | None = None
    recurrence_end_date: date | None = None
    parent_task_id: int | None = None
    # Múltiplos usuários atribuídos
    assigned_user_ids: List[int] = []
    assigned_users: List[TarefaAssigneeResponse] = []
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
