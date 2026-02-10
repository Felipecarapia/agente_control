import uuid
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class FuncionarioBase(BaseModel):
    nome: str
    cpf: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    cargo: Optional[str] = None
    departamento: Optional[str] = None
    data_admissao: Optional[date] = None
    data_demissao: Optional[date] = None
    tipo_contrato: str = "clt"
    salario_bruto: Decimal = Field(Decimal("0"), ge=0)
    vale_transporte: Optional[Decimal] = Decimal("0")
    vale_refeicao: Optional[Decimal] = Decimal("0")
    plano_saude: Optional[Decimal] = Decimal("0")
    outros_beneficios: Optional[Decimal] = Decimal("0")
    centro_custo_id: Optional[uuid.UUID] = None
    ativo: bool = True
    observacoes: Optional[str] = None


class FuncionarioCreate(FuncionarioBase):
    pass


class FuncionarioUpdate(BaseModel):
    nome: Optional[str] = None
    cpf: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    cargo: Optional[str] = None
    departamento: Optional[str] = None
    data_admissao: Optional[date] = None
    data_demissao: Optional[date] = None
    tipo_contrato: Optional[str] = None
    salario_bruto: Optional[Decimal] = None
    vale_transporte: Optional[Decimal] = None
    vale_refeicao: Optional[Decimal] = None
    plano_saude: Optional[Decimal] = None
    outros_beneficios: Optional[Decimal] = None
    centro_custo_id: Optional[uuid.UUID] = None
    ativo: Optional[bool] = None
    observacoes: Optional[str] = None


class FuncionarioResponse(FuncionarioBase):
    id: uuid.UUID
    created_by_user_id: Optional[uuid.UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ResumoRH(BaseModel):
    total_funcionarios: int = 0
    total_ativos: int = 0
    total_clt: int = 0
    total_pj: int = 0
    total_estagiarios: int = 0
    total_folha: Decimal = Decimal("0")
    total_beneficios: Decimal = Decimal("0")
    custo_total: Decimal = Decimal("0")
