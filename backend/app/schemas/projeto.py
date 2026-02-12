from typing import Optional, List, Union
import uuid
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel
from app.models.projeto import ExpenseCategory

class ProjectExpenseBase(BaseModel):
    title: str
    category: ExpenseCategory = ExpenseCategory.OTHER
    amount_cents: int
    occurred_at: date
    vendor: Optional[str] = None
    notes: Optional[str] = None

class ProjectExpenseCreate(ProjectExpenseBase):
    pass

class ProjectExpenseUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[ExpenseCategory] = None
    amount_cents: Optional[int] = None
    occurred_at: Optional[date] = None
    vendor: Optional[str] = None
    notes: Optional[str] = None

class ProjectExpenseResponse(ProjectExpenseBase):
    id: uuid.UUID
    project_id: uuid.UUID
    created_by_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

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
    
    # Financials
    budget_cents: int = 0
    expected_revenue_cents: int = 0
    actual_revenue_cents: int = 0

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
    
    budget_cents: Optional[int] = None
    expected_revenue_cents: Optional[int] = None
    actual_revenue_cents: Optional[int] = None

class ProjetoResponse(ProjetoBase):
    id: uuid.UUID
    usuario_id: Optional[uuid.UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ProjectFinancialsResponse(BaseModel):
    budget_cents: int
    currency: str
    expected_revenue_cents: int
    actual_revenue_cents: int
    total_spent_cents: int
    remaining_cents: int
    percent_used: float
    roi: Optional[float] = None
    roi_mode: Optional[str] = None # "actual" or "expected" or None
    expenses_by_category: List[dict] # [{"category": "DOMAIN", "total_cents": 1000}, ...]
    expenses: List[ProjectExpenseResponse]
