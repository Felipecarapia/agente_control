import uuid
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel


class TarefaBase(BaseModel):
    titulo: str
    descricao: Optional[str] = None
    projeto_id: Optional[uuid.UUID] = None
    status: str = "pendente"
    prioridade: Optional[str] = None
    responsavel_id: Optional[uuid.UUID] = None
    data_vencimento: Optional[date] = None
    # Campos de recorrência
    is_recurring: bool = False
    recurrence_type: Optional[str] = None  # diaria, semanal, mensal
    recurrence_interval: Optional[int] = None  # a cada X dias/semanas/meses
    recurrence_end_date: Optional[date] = None
    # Múltiplos usuários atribuídos
    assigned_user_ids: List[uuid.UUID] = []


class TarefaCreate(TarefaBase):
    pass


class TarefaUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    projeto_id: Optional[uuid.UUID] = None
    status: Optional[str] = None
    prioridade: Optional[str] = None
    responsavel_id: Optional[uuid.UUID] = None
    data_vencimento: Optional[date] = None
    is_recurring: Optional[bool] = None
    recurrence_type: Optional[str] = None
    recurrence_interval: Optional[int] = None
    recurrence_end_date: Optional[date] = None
    assigned_user_ids: Optional[List[uuid.UUID]] = None


    assigned_users: List['TarefaAssigneeResponse'] = []
    
    class Config:
        from_attributes = True

class TarefaAssigneeResponse(BaseModel):
    id: uuid.UUID
    usuario_id: uuid.UUID
    usuario_nome: Optional[str] = None

    class Config:
        from_attributes = True

class TarefaResponse(TarefaBase):
    id: uuid.UUID
    parent_task_id: Optional[uuid.UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    assigned_users: List[TarefaAssigneeResponse] = []

    class Config:
        from_attributes = True
