import uuid
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field


# ──────────────────── Centro de Custo ────────────────────

class CentroCustoBase(BaseModel):
    nome: str
    codigo: str
    descricao: Optional[str] = None
    ativo: bool = True


class CentroCustoCreate(CentroCustoBase):
    pass


class CentroCustoUpdate(BaseModel):
    nome: Optional[str] = None
    codigo: Optional[str] = None
    descricao: Optional[str] = None
    ativo: Optional[bool] = None


class CentroCustoResponse(CentroCustoBase):
    id: uuid.UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ──────────────────── Conta Bancária ────────────────────

class ContaBancariaBase(BaseModel):
    nome_banco: str
    agencia: Optional[str] = None
    numero_conta: Optional[str] = None
    tipo_conta: str = "corrente"
    saldo_inicial: Decimal = Decimal("0")
    pix_chave: Optional[str] = None
    titular: Optional[str] = None
    ativo: bool = True


class ContaBancariaCreate(ContaBancariaBase):
    pass


class ContaBancariaUpdate(BaseModel):
    nome_banco: Optional[str] = None
    agencia: Optional[str] = None
    numero_conta: Optional[str] = None
    tipo_conta: Optional[str] = None
    saldo_inicial: Optional[Decimal] = None
    pix_chave: Optional[str] = None
    titular: Optional[str] = None
    ativo: Optional[bool] = None


class ContaBancariaResponse(ContaBancariaBase):
    id: uuid.UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ──────────────────── Despesa Fixa ────────────────────

class DespesaFixaBase(BaseModel):
    descricao: str
    valor: Decimal = Field(..., ge=0)
    categoria: str = "outros"
    fornecedor: Optional[str] = None
    dia_vencimento: int = Field(10, ge=1, le=31)
    forma_pagamento: Optional[str] = None
    centro_custo_id: Optional[uuid.UUID] = None
    conta_bancaria_id: Optional[uuid.UUID] = None
    ativo: bool = True
    observacoes: Optional[str] = None


class DespesaFixaCreate(DespesaFixaBase):
    pass


class DespesaFixaUpdate(BaseModel):
    descricao: Optional[str] = None
    valor: Optional[Decimal] = None
    categoria: Optional[str] = None
    fornecedor: Optional[str] = None
    dia_vencimento: Optional[int] = None
    forma_pagamento: Optional[str] = None
    centro_custo_id: Optional[uuid.UUID] = None
    conta_bancaria_id: Optional[uuid.UUID] = None
    ativo: Optional[bool] = None
    observacoes: Optional[str] = None


class DespesaFixaResponse(DespesaFixaBase):
    id: uuid.UUID
    created_by_user_id: Optional[uuid.UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ──────────────────── Contas a Pagar ────────────────────

class ContaPagarBase(BaseModel):
    descricao: str
    fornecedor: Optional[str] = None
    categoria: str = "outros"
    valor: Decimal = Field(..., ge=0)
    data_vencimento: date
    data_pagamento: Optional[date] = None
    status: str = "pendente"
    forma_pagamento: Optional[str] = None
    observacoes: Optional[str] = None
    recorrencia: str = "nenhuma"
    parcela_atual: Optional[int] = None
    total_parcelas: Optional[int] = None
    documento_referencia: Optional[str] = None
    projeto_id: Optional[uuid.UUID] = None
    centro_custo_id: Optional[uuid.UUID] = None
    conta_bancaria_id: Optional[uuid.UUID] = None


class ContaPagarCreate(ContaPagarBase):
    pass


class ContaPagarUpdate(BaseModel):
    descricao: Optional[str] = None
    fornecedor: Optional[str] = None
    categoria: Optional[str] = None
    valor: Optional[Decimal] = None
    data_vencimento: Optional[date] = None
    data_pagamento: Optional[date] = None
    status: Optional[str] = None
    forma_pagamento: Optional[str] = None
    observacoes: Optional[str] = None
    recorrencia: Optional[str] = None
    parcela_atual: Optional[int] = None
    total_parcelas: Optional[int] = None
    documento_referencia: Optional[str] = None
    projeto_id: Optional[uuid.UUID] = None
    centro_custo_id: Optional[uuid.UUID] = None
    conta_bancaria_id: Optional[uuid.UUID] = None


class ContaPagarResponse(ContaPagarBase):
    id: uuid.UUID
    despesa_fixa_id: Optional[uuid.UUID] = None
    created_by_user_id: Optional[uuid.UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ──────────────────── Contas a Receber ────────────────────

class ContaReceberBase(BaseModel):
    descricao: str
    cliente_id: Optional[uuid.UUID] = None
    cliente_nome: Optional[str] = None
    categoria: str = "projeto"
    valor: Decimal = Field(..., ge=0)
    data_vencimento: date
    data_recebimento: Optional[date] = None
    status: str = "pendente"
    forma_pagamento: Optional[str] = None
    observacoes: Optional[str] = None
    recorrencia: str = "nenhuma"
    parcela_atual: Optional[int] = None
    total_parcelas: Optional[int] = None
    documento_referencia: Optional[str] = None
    projeto_id: Optional[uuid.UUID] = None
    centro_custo_id: Optional[uuid.UUID] = None
    conta_bancaria_id: Optional[uuid.UUID] = None


class ContaReceberCreate(ContaReceberBase):
    pass


class ContaReceberUpdate(BaseModel):
    descricao: Optional[str] = None
    cliente_id: Optional[uuid.UUID] = None
    cliente_nome: Optional[str] = None
    categoria: Optional[str] = None
    valor: Optional[Decimal] = None
    data_vencimento: Optional[date] = None
    data_recebimento: Optional[date] = None
    status: Optional[str] = None
    forma_pagamento: Optional[str] = None
    observacoes: Optional[str] = None
    recorrencia: Optional[str] = None
    parcela_atual: Optional[int] = None
    total_parcelas: Optional[int] = None
    documento_referencia: Optional[str] = None
    projeto_id: Optional[uuid.UUID] = None
    centro_custo_id: Optional[uuid.UUID] = None
    conta_bancaria_id: Optional[uuid.UUID] = None


class ContaReceberResponse(ContaReceberBase):
    id: uuid.UUID
    created_by_user_id: Optional[uuid.UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ──────────────────── Resumo Financeiro ────────────────────

class ResumoFinanceiro(BaseModel):
    total_a_pagar: Decimal = Decimal("0")
    total_pago: Decimal = Decimal("0")
    total_a_receber: Decimal = Decimal("0")
    total_recebido: Decimal = Decimal("0")
    saldo: Decimal = Decimal("0")
    contas_vencidas_pagar: int = 0
    contas_vencidas_receber: int = 0


# ──────────────────── Dashboard Financeiro ────────────────────

class DashboardMesItem(BaseModel):
    mes: str  # "2026-01", "2026-02", etc.
    receitas: Decimal = Decimal("0")
    despesas: Decimal = Decimal("0")
    lucro: Decimal = Decimal("0")


class DashboardCategoriaItem(BaseModel):
    categoria: str
    valor: Decimal = Decimal("0")


class ContaVencendo(BaseModel):
    id: uuid.UUID
    descricao: str
    valor: Decimal
    data_vencimento: date
    tipo: str  # "pagar" ou "receber"


class DashboardFinanceiro(BaseModel):
    # Cards principais
    receita_total_mes: Decimal = Decimal("0")
    despesas_total_mes: Decimal = Decimal("0")
    lucro_liquido_mes: Decimal = Decimal("0")
    saldo_contas_bancarias: Decimal = Decimal("0")
    # Gráficos
    receitas_despesas_mensal: List[DashboardMesItem] = []
    despesas_por_categoria: List[DashboardCategoriaItem] = []
    fluxo_caixa_mensal: List[DashboardMesItem] = []
    # Contas a vencer
    contas_vencendo: List[ContaVencendo] = []
    # DRE Simplificado
    dre_receitas: Decimal = Decimal("0")
    dre_despesas: Decimal = Decimal("0")
    dre_resultado: Decimal = Decimal("0")
