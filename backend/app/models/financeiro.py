import uuid
import enum

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


# ──────────────────── Enums ────────────────────

class ContaStatus(str, enum.Enum):
    PENDENTE = "pendente"
    PAGO = "pago"
    RECEBIDO = "recebido"
    VENCIDO = "vencido"
    CANCELADO = "cancelado"
    PARCIAL = "parcial"


class ContaCategoria(str, enum.Enum):
    # Contas a Pagar
    FORNECEDOR = "fornecedor"
    ALUGUEL = "aluguel"
    SALARIO = "salario"
    IMPOSTO = "imposto"
    SERVICO = "servico"
    SOFTWARE = "software"
    MARKETING = "marketing"
    INFRAESTRUTURA = "infraestrutura"
    # Contas a Receber
    PROJETO = "projeto"
    MENSALIDADE = "mensalidade"
    CONSULTORIA = "consultoria"
    COMISSAO = "comissao"
    VENDA = "venda"
    # Genérico
    OUTROS = "outros"


class FormaPagamento(str, enum.Enum):
    PIX = "pix"
    BOLETO = "boleto"
    CARTAO_CREDITO = "cartao_credito"
    CARTAO_DEBITO = "cartao_debito"
    TRANSFERENCIA = "transferencia"
    DINHEIRO = "dinheiro"
    CHEQUE = "cheque"
    OUTROS = "outros"


class Recorrencia(str, enum.Enum):
    NENHUMA = "nenhuma"
    SEMANAL = "semanal"
    QUINZENAL = "quinzenal"
    MENSAL = "mensal"
    TRIMESTRAL = "trimestral"
    SEMESTRAL = "semestral"
    ANUAL = "anual"


class TipoConta(str, enum.Enum):
    CORRENTE = "corrente"
    POUPANCA = "poupanca"
    INVESTIMENTO = "investimento"


# ──────────────────── Centro de Custo ────────────────────

class CentroCusto(Base):
    """Centros de custo para classificação financeira."""
    __tablename__ = "centros_custo"
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    tenant = relationship("Tenant")

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    nome = Column(String(255), nullable=False)
    codigo = Column(String(50), nullable=False, unique=True)
    descricao = Column(Text, nullable=True)
    ativo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ──────────────────── Conta Bancária ────────────────────

class ContaBancaria(Base):
    """Contas bancárias da empresa."""
    __tablename__ = "contas_bancarias"
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    tenant = relationship("Tenant")

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    nome_banco = Column(String(255), nullable=False)
    agencia = Column(String(20), nullable=True)
    numero_conta = Column(String(30), nullable=True)
    tipo_conta = Column(
        SQLEnum(TipoConta, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20),
        nullable=False, default=TipoConta.CORRENTE
    )
    saldo_inicial = Column(Numeric(15, 2), nullable=False, default=0)
    pix_chave = Column(String(255), nullable=True)
    titular = Column(String(255), nullable=True)
    ativo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ──────────────────── Despesa Fixa ────────────────────

class DespesaFixa(Base):
    """Despesas fixas recorrentes (gera contas a pagar mensalmente)."""
    __tablename__ = "despesas_fixas"
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    tenant = relationship("Tenant")

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    descricao = Column(String(500), nullable=False)
    valor = Column(Numeric(15, 2), nullable=False)
    categoria = Column(
        SQLEnum(ContaCategoria, values_callable=lambda x: [e.value for e in x], native_enum=False, length=30),
        nullable=False, default=ContaCategoria.OUTROS
    )
    fornecedor = Column(String(255), nullable=True)
    dia_vencimento = Column(Integer, nullable=False, default=10)  # 1-31
    forma_pagamento = Column(
        SQLEnum(FormaPagamento, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20),
        nullable=True
    )
    centro_custo_id = Column(UUID(as_uuid=True), ForeignKey("centros_custo.id", ondelete="SET NULL"), nullable=True)
    conta_bancaria_id = Column(UUID(as_uuid=True), ForeignKey("contas_bancarias.id", ondelete="SET NULL"), nullable=True)
    ativo = Column(Boolean, default=True, nullable=False)
    observacoes = Column(Text, nullable=True)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    centro_custo = relationship("CentroCusto")
    conta_bancaria = relationship("ContaBancaria")
    created_by = relationship("Usuario", foreign_keys=[created_by_user_id])


# ──────────────────── Contas a Pagar ────────────────────

class ContaPagar(Base):
    """Contas a pagar (despesas/obrigações)."""
    __tablename__ = "contas_pagar"
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    tenant = relationship("Tenant")

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    descricao = Column(String(500), nullable=False)
    fornecedor = Column(String(255), nullable=True)
    categoria = Column(
        SQLEnum(ContaCategoria, values_callable=lambda x: [e.value for e in x], native_enum=False, length=30),
        nullable=False, default=ContaCategoria.OUTROS
    )
    valor = Column(Numeric(15, 2), nullable=False)
    data_vencimento = Column(Date, nullable=False)
    data_pagamento = Column(Date, nullable=True)
    status = Column(
        SQLEnum(ContaStatus, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20),
        nullable=False, default=ContaStatus.PENDENTE
    )
    forma_pagamento = Column(
        SQLEnum(FormaPagamento, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20),
        nullable=True
    )
    observacoes = Column(Text, nullable=True)
    recorrencia = Column(
        SQLEnum(Recorrencia, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20),
        nullable=False, default=Recorrencia.NENHUMA
    )
    parcela_atual = Column(Integer, nullable=True)
    total_parcelas = Column(Integer, nullable=True)
    documento_referencia = Column(String(255), nullable=True)  # NF, boleto, etc.

    projeto_id = Column(UUID(as_uuid=True), ForeignKey("projetos.id", ondelete="SET NULL"), nullable=True)
    centro_custo_id = Column(UUID(as_uuid=True), ForeignKey("centros_custo.id", ondelete="SET NULL"), nullable=True)
    conta_bancaria_id = Column(UUID(as_uuid=True), ForeignKey("contas_bancarias.id", ondelete="SET NULL"), nullable=True)
    despesa_fixa_id = Column(UUID(as_uuid=True), ForeignKey("despesas_fixas.id", ondelete="SET NULL"), nullable=True)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    projeto = relationship("Projeto")
    centro_custo = relationship("CentroCusto")
    conta_bancaria = relationship("ContaBancaria")
    despesa_fixa = relationship("DespesaFixa")
    created_by = relationship("Usuario", foreign_keys=[created_by_user_id])


# ──────────────────── Contas a Receber ────────────────────

class ContaReceber(Base):
    """Contas a receber (receitas/créditos)."""
    __tablename__ = "contas_receber"
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    tenant = relationship("Tenant")

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    descricao = Column(String(500), nullable=False)
    cliente_id = Column(UUID(as_uuid=True), ForeignKey("clientes.id", ondelete="SET NULL"), nullable=True)
    cliente_nome = Column(String(255), nullable=True)  # Para quando não tiver cliente cadastrado
    categoria = Column(
        SQLEnum(ContaCategoria, values_callable=lambda x: [e.value for e in x], native_enum=False, length=30),
        nullable=False, default=ContaCategoria.PROJETO
    )
    valor = Column(Numeric(15, 2), nullable=False)
    data_vencimento = Column(Date, nullable=False)
    data_recebimento = Column(Date, nullable=True)
    status = Column(
        SQLEnum(ContaStatus, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20),
        nullable=False, default=ContaStatus.PENDENTE
    )
    forma_pagamento = Column(
        SQLEnum(FormaPagamento, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20),
        nullable=True
    )
    observacoes = Column(Text, nullable=True)
    recorrencia = Column(
        SQLEnum(Recorrencia, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20),
        nullable=False, default=Recorrencia.NENHUMA
    )
    parcela_atual = Column(Integer, nullable=True)
    total_parcelas = Column(Integer, nullable=True)
    documento_referencia = Column(String(255), nullable=True)  # NF, contrato, etc.

    projeto_id = Column(UUID(as_uuid=True), ForeignKey("projetos.id", ondelete="SET NULL"), nullable=True)
    centro_custo_id = Column(UUID(as_uuid=True), ForeignKey("centros_custo.id", ondelete="SET NULL"), nullable=True)
    conta_bancaria_id = Column(UUID(as_uuid=True), ForeignKey("contas_bancarias.id", ondelete="SET NULL"), nullable=True)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    cliente = relationship("Cliente")
    projeto = relationship("Projeto")
    centro_custo = relationship("CentroCusto")
    conta_bancaria = relationship("ContaBancaria")
    created_by = relationship("Usuario", foreign_keys=[created_by_user_id])
