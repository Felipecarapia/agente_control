import uuid
import calendar
import logging
from datetime import date, timedelta
from decimal import Decimal
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Request, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, extract, func

from app.core.database import get_db
from app.core.rbac import require_permission
from app.core.response import success_response, error_response, serialize_data
from app.models.financeiro import (
    ContaPagar, ContaReceber, CentroCusto, ContaBancaria, DespesaFixa,
)
from app.models.usuario import Usuario
from app.schemas.financeiro import (
    ContaPagarCreate,
    ContaPagarUpdate,
    ContaReceberCreate,
    ContaReceberUpdate,
    CentroCustoCreate,
    CentroCustoUpdate,
    ContaBancariaCreate,
    ContaBancariaUpdate,
    DespesaFixaCreate,
    DespesaFixaUpdate,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/financeiro", tags=["financeiro"])


# ══════════════════════════════════════════════════════════
#  CONTAS A PAGAR
# ══════════════════════════════════════════════════════════

@router.get("/contas-pagar")
def list_contas_pagar(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("contas_pagar", "read"))],
    conta_status: Optional[str] = Query(None, alias="status"),
    categoria: Optional[str] = Query(None),
    mes: Optional[int] = Query(None, ge=1, le=12),
    ano: Optional[int] = Query(None),
):
    """Lista todas as contas a pagar."""
    request_id = getattr(request.state, "request_id", None)
    try:
        tenant_id = current_user.tenant_id
        q = db.query(ContaPagar).filter(ContaPagar.tenant_id == tenant_id).order_by(desc(ContaPagar.data_vencimento))
        if conta_status:
            q = q.filter(ContaPagar.status == conta_status)
        if categoria:
            q = q.filter(ContaPagar.categoria == categoria)
        if mes and ano:
            q = q.filter(
                extract("month", ContaPagar.data_vencimento) == mes,
                extract("year", ContaPagar.data_vencimento) == ano,
            )
        elif ano:
            q = q.filter(extract("year", ContaPagar.data_vencimento) == ano)

        contas = q.all()
        return success_response(data=[serialize_data(c) for c in contas], request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao listar contas a pagar: {e}", exc_info=True)
        return success_response(data=[], request_id=request_id)


@router.post("/contas-pagar", status_code=status.HTTP_201_CREATED)
def create_conta_pagar(
    request: Request,
    data: ContaPagarCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("contas_pagar", "create"))],
):
    """Cria uma nova conta a pagar."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = ContaPagar(
            **data.model_dump(),
            tenant_id=current_user.tenant_id,
            created_by_user_id=current_user.id,
        )
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return success_response(data=serialize_data(obj), request_id=request_id, status_code=201)
    except Exception as e:
        logger.error(f"Erro ao criar conta a pagar: {e}", exc_info=True)
        db.rollback()
        return error_response(code="CREATE_ERROR", message=str(e), status_code=500, request_id=request_id)


@router.get("/contas-pagar/{conta_id}")
def get_conta_pagar(
    request: Request,
    conta_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("contas_pagar", "read"))],
):
    """Busca uma conta a pagar pelo ID."""
    request_id = getattr(request.state, "request_id", None)
    obj = db.query(ContaPagar).filter(ContaPagar.id == conta_id, ContaPagar.tenant_id == current_user.tenant_id).first()
    if not obj:
        return error_response(code="NOT_FOUND", message="Conta a pagar não encontrada", status_code=404, request_id=request_id)
    return success_response(data=serialize_data(obj), request_id=request_id)


@router.put("/contas-pagar/{conta_id}")
def update_conta_pagar(
    request: Request,
    conta_id: uuid.UUID,
    data: ContaPagarUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("contas_pagar", "update"))],
):
    """Atualiza uma conta a pagar."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = db.query(ContaPagar).filter(ContaPagar.id == conta_id, ContaPagar.tenant_id == current_user.tenant_id).first()
        if not obj:
            return error_response(code="NOT_FOUND", message="Conta a pagar não encontrada", status_code=404, request_id=request_id)
        update_data = data.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        return success_response(data=serialize_data(obj), request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao atualizar conta a pagar: {e}", exc_info=True)
        db.rollback()
        return error_response(code="UPDATE_ERROR", message=str(e), status_code=500, request_id=request_id)


@router.delete("/contas-pagar/{conta_id}")
def delete_conta_pagar(
    request: Request,
    conta_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("contas_pagar", "delete"))],
):
    """Deleta uma conta a pagar."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = db.query(ContaPagar).filter(ContaPagar.id == conta_id, ContaPagar.tenant_id == current_user.tenant_id).first()
        if not obj:
            return error_response(code="NOT_FOUND", message="Conta a pagar não encontrada", status_code=404, request_id=request_id)
        db.delete(obj)
        db.commit()
        return success_response(data={"deleted": True}, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao deletar conta a pagar: {e}", exc_info=True)
        db.rollback()
        return error_response(code="DELETE_ERROR", message=str(e), status_code=500, request_id=request_id)


@router.post("/contas-pagar/{conta_id}/pagar")
def marcar_conta_paga(
    request: Request,
    conta_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("contas_pagar", "pay"))],
):
    """Marca uma conta como paga (define data_pagamento = hoje e status = pago)."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = db.query(ContaPagar).filter(ContaPagar.id == conta_id, ContaPagar.tenant_id == current_user.tenant_id).first()
        if not obj:
            return error_response(code="NOT_FOUND", message="Conta a pagar não encontrada", status_code=404, request_id=request_id)
        obj.status = "pago"
        obj.data_pagamento = date.today()
        db.commit()
        db.refresh(obj)
        return success_response(data=serialize_data(obj), request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao marcar conta paga: {e}", exc_info=True)
        db.rollback()
        return error_response(code="PAY_ERROR", message=str(e), status_code=500, request_id=request_id)


# ══════════════════════════════════════════════════════════
#  CONTAS A RECEBER
# ══════════════════════════════════════════════════════════

@router.get("/contas-receber")
def list_contas_receber(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("contas_receber", "read"))],
    conta_status: Optional[str] = Query(None, alias="status"),
    categoria: Optional[str] = Query(None),
    mes: Optional[int] = Query(None, ge=1, le=12),
    ano: Optional[int] = Query(None),
):
    """Lista todas as contas a receber."""
    request_id = getattr(request.state, "request_id", None)
    try:
        tenant_id = current_user.tenant_id
        q = db.query(ContaReceber).filter(ContaReceber.tenant_id == tenant_id).order_by(desc(ContaReceber.data_vencimento))
        if conta_status:
            q = q.filter(ContaReceber.status == conta_status)
        if categoria:
            q = q.filter(ContaReceber.categoria == categoria)
        if mes and ano:
            q = q.filter(
                extract("month", ContaReceber.data_vencimento) == mes,
                extract("year", ContaReceber.data_vencimento) == ano,
            )
        elif ano:
            q = q.filter(extract("year", ContaReceber.data_vencimento) == ano)

        contas = q.all()
        return success_response(data=[serialize_data(c) for c in contas], request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao listar contas a receber: {e}", exc_info=True)
        return success_response(data=[], request_id=request_id)


@router.post("/contas-receber", status_code=status.HTTP_201_CREATED)
def create_conta_receber(
    request: Request,
    data: ContaReceberCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("contas_receber", "create"))],
):
    """Cria uma nova conta a receber."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = ContaReceber(
            **data.model_dump(),
            tenant_id=current_user.tenant_id,
            created_by_user_id=current_user.id,
        )
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return success_response(data=serialize_data(obj), request_id=request_id, status_code=201)
    except Exception as e:
        logger.error(f"Erro ao criar conta a receber: {e}", exc_info=True)
        db.rollback()
        return error_response(code="CREATE_ERROR", message=str(e), status_code=500, request_id=request_id)


@router.get("/contas-receber/{conta_id}")
def get_conta_receber(
    request: Request,
    conta_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("contas_receber", "read"))],
):
    """Busca uma conta a receber pelo ID."""
    request_id = getattr(request.state, "request_id", None)
    obj = db.query(ContaReceber).filter(ContaReceber.id == conta_id, ContaReceber.tenant_id == current_user.tenant_id).first()
    if not obj:
        return error_response(code="NOT_FOUND", message="Conta a receber não encontrada", status_code=404, request_id=request_id)
    return success_response(data=serialize_data(obj), request_id=request_id)


@router.put("/contas-receber/{conta_id}")
def update_conta_receber(
    request: Request,
    conta_id: uuid.UUID,
    data: ContaReceberUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("contas_receber", "update"))],
):
    """Atualiza uma conta a receber."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = db.query(ContaReceber).filter(ContaReceber.id == conta_id, ContaReceber.tenant_id == current_user.tenant_id).first()
        if not obj:
            return error_response(code="NOT_FOUND", message="Conta a receber não encontrada", status_code=404, request_id=request_id)
        update_data = data.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        return success_response(data=serialize_data(obj), request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao atualizar conta a receber: {e}", exc_info=True)
        db.rollback()
        return error_response(code="UPDATE_ERROR", message=str(e), status_code=500, request_id=request_id)


@router.delete("/contas-receber/{conta_id}")
def delete_conta_receber(
    request: Request,
    conta_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("contas_receber", "delete"))],
):
    """Deleta uma conta a receber."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = db.query(ContaReceber).filter(ContaReceber.id == conta_id, ContaReceber.tenant_id == current_user.tenant_id).first()
        if not obj:
            return error_response(code="NOT_FOUND", message="Conta a receber não encontrada", status_code=404, request_id=request_id)
        db.delete(obj)
        db.commit()
        return success_response(data={"deleted": True}, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao deletar conta a receber: {e}", exc_info=True)
        db.rollback()
        return error_response(code="DELETE_ERROR", message=str(e), status_code=500, request_id=request_id)


@router.post("/contas-receber/{conta_id}/receber")
def marcar_conta_recebida(
    request: Request,
    conta_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("contas_receber", "receive"))],
):
    """Marca uma conta como recebida (define data_recebimento = hoje e status = recebido)."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = db.query(ContaReceber).filter(ContaReceber.id == conta_id, ContaReceber.tenant_id == current_user.tenant_id).first()
        if not obj:
            return error_response(code="NOT_FOUND", message="Conta a receber não encontrada", status_code=404, request_id=request_id)
        obj.status = "recebido"
        obj.data_recebimento = date.today()
        db.commit()
        db.refresh(obj)
        return success_response(data=serialize_data(obj), request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao marcar conta recebida: {e}", exc_info=True)
        db.rollback()
        return error_response(code="RECEIVE_ERROR", message=str(e), status_code=500, request_id=request_id)


# ══════════════════════════════════════════════════════════
#  RESUMO FINANCEIRO
# ══════════════════════════════════════════════════════════

@router.get("/resumo")
def resumo_financeiro(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("financeiro", "read"))],
    mes: Optional[int] = Query(None, ge=1, le=12),
    ano: Optional[int] = Query(None),
):
    """Retorna resumo financeiro com totais de contas a pagar e receber."""
    request_id = getattr(request.state, "request_id", None)
    try:
        today = date.today()

        # Contas a pagar
        tenant_id = current_user.tenant_id
        q_pagar = db.query(ContaPagar).filter(ContaPagar.tenant_id == tenant_id)
        q_receber = db.query(ContaReceber).filter(ContaReceber.tenant_id == tenant_id)

        if mes and ano:
            q_pagar = q_pagar.filter(
                extract("month", ContaPagar.data_vencimento) == mes,
                extract("year", ContaPagar.data_vencimento) == ano,
            )
            q_receber = q_receber.filter(
                extract("month", ContaReceber.data_vencimento) == mes,
                extract("year", ContaReceber.data_vencimento) == ano,
            )
        elif ano:
            q_pagar = q_pagar.filter(extract("year", ContaPagar.data_vencimento) == ano)
            q_receber = q_receber.filter(extract("year", ContaReceber.data_vencimento) == ano)

        total_a_pagar = (
            q_pagar.filter(ContaPagar.status.in_(["pendente", "vencido"]))
            .with_entities(func.coalesce(func.sum(ContaPagar.valor), 0))
            .scalar()
        )
        total_pago = (
            q_pagar.filter(ContaPagar.status == "pago")
            .with_entities(func.coalesce(func.sum(ContaPagar.valor), 0))
            .scalar()
        )
        contas_vencidas_pagar = (
            q_pagar.filter(ContaPagar.status == "pendente", ContaPagar.data_vencimento < today)
            .count()
        )

        total_a_receber = (
            q_receber.filter(ContaReceber.status.in_(["pendente", "vencido"]))
            .with_entities(func.coalesce(func.sum(ContaReceber.valor), 0))
            .scalar()
        )
        total_recebido = (
            q_receber.filter(ContaReceber.status == "recebido")
            .with_entities(func.coalesce(func.sum(ContaReceber.valor), 0))
            .scalar()
        )
        contas_vencidas_receber = (
            q_receber.filter(ContaReceber.status == "pendente", ContaReceber.data_vencimento < today)
            .count()
        )

        saldo = Decimal(str(total_recebido)) - Decimal(str(total_pago))

        return success_response(
            data={
                "total_a_pagar": float(total_a_pagar),
                "total_pago": float(total_pago),
                "total_a_receber": float(total_a_receber),
                "total_recebido": float(total_recebido),
                "saldo": float(saldo),
                "contas_vencidas_pagar": contas_vencidas_pagar,
                "contas_vencidas_receber": contas_vencidas_receber,
            },
            request_id=request_id,
        )
    except Exception as e:
        logger.error(f"Erro ao calcular resumo financeiro: {e}", exc_info=True)
        return error_response(code="RESUMO_ERROR", message=str(e), status_code=500, request_id=request_id)


# ══════════════════════════════════════════════════════════
#  DASHBOARD FINANCEIRO
# ══════════════════════════════════════════════════════════

@router.get("/dashboard")
def dashboard_financeiro(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("financeiro", "read"))],
    meses: int = Query(6, ge=1, le=12),
):
    """Dashboard financeiro com dados agregados: cards, gráficos e DRE."""
    request_id = getattr(request.state, "request_id", None)
    try:
        today = date.today()
        primeiro_dia_mes = today.replace(day=1)

        # ── Cards do mês atual ──
        receita_mes = (
            db.query(func.coalesce(func.sum(ContaReceber.valor), 0))
            .filter(
                ContaReceber.tenant_id == current_user.tenant_id,
                ContaReceber.status == "recebido",
                extract("month", ContaReceber.data_recebimento) == today.month,
                extract("year", ContaReceber.data_recebimento) == today.year,
            )
            .scalar()
        )
        despesas_mes = (
            db.query(func.coalesce(func.sum(ContaPagar.valor), 0))
            .filter(
                ContaPagar.tenant_id == current_user.tenant_id,
                ContaPagar.status == "pago",
                extract("month", ContaPagar.data_pagamento) == today.month,
                extract("year", ContaPagar.data_pagamento) == today.year,
            )
            .scalar()
        )
        lucro_mes = Decimal(str(receita_mes)) - Decimal(str(despesas_mes))

        saldo_bancario = (
            db.query(func.coalesce(func.sum(ContaBancaria.saldo_inicial), 0))
            .filter(ContaBancaria.ativo == True, ContaBancaria.tenant_id == current_user.tenant_id)
            .scalar()
        )

        # ── Receitas vs Despesas por mês (últimos N meses) ──
        receitas_despesas = []
        fluxo_caixa = []
        saldo_acumulado = Decimal("0")

        for i in range(meses - 1, -1, -1):
            # Calcular mês/ano
            m = today.month - i
            y = today.year
            while m <= 0:
                m += 12
                y -= 1

            mes_str = f"{y}-{m:02d}"

            rec = (
                db.query(func.coalesce(func.sum(ContaReceber.valor), 0))
                .filter(
                    ContaReceber.tenant_id == current_user.tenant_id,
                    ContaReceber.status == "recebido",
                    extract("month", ContaReceber.data_recebimento) == m,
                    extract("year", ContaReceber.data_recebimento) == y,
                )
                .scalar()
            )
            desp = (
                db.query(func.coalesce(func.sum(ContaPagar.valor), 0))
                .filter(
                    ContaPagar.tenant_id == current_user.tenant_id,
                    ContaPagar.status == "pago",
                    extract("month", ContaPagar.data_pagamento) == m,
                    extract("year", ContaPagar.data_pagamento) == y,
                )
                .scalar()
            )

            rec_val = Decimal(str(rec))
            desp_val = Decimal(str(desp))
            lucro_val = rec_val - desp_val
            saldo_acumulado += lucro_val

            receitas_despesas.append({
                "mes": mes_str,
                "receitas": float(rec_val),
                "despesas": float(desp_val),
                "lucro": float(lucro_val),
            })
            fluxo_caixa.append({
                "mes": mes_str,
                "receitas": float(rec_val),
                "despesas": float(desp_val),
                "lucro": float(saldo_acumulado),
            })

        # ── Despesas por categoria (mês atual) ──
        desp_categorias = (
            db.query(ContaPagar.categoria, func.sum(ContaPagar.valor))
            .filter(
                ContaPagar.tenant_id == current_user.tenant_id,
                ContaPagar.status == "pago",
                extract("month", ContaPagar.data_pagamento) == today.month,
                extract("year", ContaPagar.data_pagamento) == today.year,
            )
            .group_by(ContaPagar.categoria)
            .all()
        )
        despesas_por_categoria = [
            {"categoria": cat or "outros", "valor": float(val)}
            for cat, val in desp_categorias
        ]

        # ── Contas a vencer (próximos 7 dias) ──
        limite = today + timedelta(days=7)
        contas_pagar_vencendo = (
            db.query(ContaPagar)
            .filter(
                ContaPagar.tenant_id == current_user.tenant_id,
                ContaPagar.status == "pendente",
                ContaPagar.data_vencimento >= today,
                ContaPagar.data_vencimento <= limite,
            )
            .order_by(ContaPagar.data_vencimento)
            .all()
        )
        contas_receber_vencendo = (
            db.query(ContaReceber)
            .filter(
                ContaReceber.tenant_id == current_user.tenant_id,
                ContaReceber.status == "pendente",
                ContaReceber.data_vencimento >= today,
                ContaReceber.data_vencimento <= limite,
            )
            .order_by(ContaReceber.data_vencimento)
            .all()
        )
        contas_vencendo = []
        for c in contas_pagar_vencendo:
            contas_vencendo.append({
                "id": str(c.id),
                "descricao": c.descricao,
                "valor": float(c.valor),
                "data_vencimento": c.data_vencimento.isoformat(),
                "tipo": "pagar",
            })
        for c in contas_receber_vencendo:
            contas_vencendo.append({
                "id": str(c.id),
                "descricao": c.descricao,
                "valor": float(c.valor),
                "data_vencimento": c.data_vencimento.isoformat(),
                "tipo": "receber",
            })
        contas_vencendo.sort(key=lambda x: x["data_vencimento"])

        # ── DRE Simplificado (mês atual) ──
        dre_receitas = Decimal(str(receita_mes))
        dre_despesas = Decimal(str(despesas_mes))
        dre_resultado = dre_receitas - dre_despesas

        return success_response(
            data={
                "receita_total_mes": float(receita_mes),
                "despesas_total_mes": float(despesas_mes),
                "lucro_liquido_mes": float(lucro_mes),
                "saldo_contas_bancarias": float(saldo_bancario),
                "receitas_despesas_mensal": receitas_despesas,
                "despesas_por_categoria": despesas_por_categoria,
                "fluxo_caixa_mensal": fluxo_caixa,
                "contas_vencendo": contas_vencendo,
                "dre_receitas": float(dre_receitas),
                "dre_despesas": float(dre_despesas),
                "dre_resultado": float(dre_resultado),
            },
            request_id=request_id,
        )
    except Exception as e:
        logger.error(f"Erro ao gerar dashboard financeiro: {e}", exc_info=True)
        return error_response(code="DASHBOARD_ERROR", message=str(e), status_code=500, request_id=request_id)


# ══════════════════════════════════════════════════════════
#  CENTROS DE CUSTO
# ══════════════════════════════════════════════════════════

@router.get("/centros-custo")
def list_centros_custo(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("financeiro", "read"))],
):
    """Lista todos os centros de custo."""
    request_id = getattr(request.state, "request_id", None)
    try:
        items = db.query(CentroCusto).filter(CentroCusto.tenant_id == current_user.tenant_id).order_by(CentroCusto.nome).all()
        return success_response(data=[serialize_data(i) for i in items], request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao listar centros de custo: {e}", exc_info=True)
        return success_response(data=[], request_id=request_id)


@router.post("/centros-custo", status_code=status.HTTP_201_CREATED)
def create_centro_custo(
    request: Request,
    data: CentroCustoCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("financeiro", "create"))],
):
    """Cria um novo centro de custo."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = CentroCusto(**data.model_dump(), tenant_id=current_user.tenant_id)
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return success_response(data=serialize_data(obj), request_id=request_id, status_code=201)
    except Exception as e:
        logger.error(f"Erro ao criar centro de custo: {e}", exc_info=True)
        db.rollback()
        return error_response(code="CREATE_ERROR", message=str(e), status_code=500, request_id=request_id)


@router.put("/centros-custo/{item_id}")
def update_centro_custo(
    request: Request,
    item_id: uuid.UUID,
    data: CentroCustoUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("financeiro", "update"))],
):
    """Atualiza um centro de custo."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = db.query(CentroCusto).filter(CentroCusto.id == item_id, CentroCusto.tenant_id == current_user.tenant_id).first()
        if not obj:
            return error_response(code="NOT_FOUND", message="Centro de custo não encontrado", status_code=404, request_id=request_id)
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        return success_response(data=serialize_data(obj), request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao atualizar centro de custo: {e}", exc_info=True)
        db.rollback()
        return error_response(code="UPDATE_ERROR", message=str(e), status_code=500, request_id=request_id)


@router.delete("/centros-custo/{item_id}")
def delete_centro_custo(
    request: Request,
    item_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("financeiro", "delete"))],
):
    """Deleta um centro de custo."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = db.query(CentroCusto).filter(CentroCusto.id == item_id, CentroCusto.tenant_id == current_user.tenant_id).first()
        if not obj:
            return error_response(code="NOT_FOUND", message="Centro de custo não encontrado", status_code=404, request_id=request_id)
        db.delete(obj)
        db.commit()
        return success_response(data={"deleted": True}, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao deletar centro de custo: {e}", exc_info=True)
        db.rollback()
        return error_response(code="DELETE_ERROR", message=str(e), status_code=500, request_id=request_id)


# ══════════════════════════════════════════════════════════
#  CONTAS BANCÁRIAS
# ══════════════════════════════════════════════════════════

@router.get("/contas-bancarias")
def list_contas_bancarias(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("financeiro", "read"))],
):
    """Lista todas as contas bancárias."""
    request_id = getattr(request.state, "request_id", None)
    try:
        items = db.query(ContaBancaria).filter(ContaBancaria.tenant_id == current_user.tenant_id).order_by(ContaBancaria.nome_banco).all()
        return success_response(data=[serialize_data(i) for i in items], request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao listar contas bancárias: {e}", exc_info=True)
        return success_response(data=[], request_id=request_id)


@router.post("/contas-bancarias", status_code=status.HTTP_201_CREATED)
def create_conta_bancaria(
    request: Request,
    data: ContaBancariaCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("financeiro", "create"))],
):
    """Cria uma nova conta bancária."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = ContaBancaria(**data.model_dump(), tenant_id=current_user.tenant_id)
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return success_response(data=serialize_data(obj), request_id=request_id, status_code=201)
    except Exception as e:
        logger.error(f"Erro ao criar conta bancária: {e}", exc_info=True)
        db.rollback()
        return error_response(code="CREATE_ERROR", message=str(e), status_code=500, request_id=request_id)


@router.put("/contas-bancarias/{item_id}")
def update_conta_bancaria(
    request: Request,
    item_id: uuid.UUID,
    data: ContaBancariaUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("financeiro", "update"))],
):
    """Atualiza uma conta bancária."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = db.query(ContaBancaria).filter(ContaBancaria.id == item_id, ContaBancaria.tenant_id == current_user.tenant_id).first()
        if not obj:
            return error_response(code="NOT_FOUND", message="Conta bancária não encontrada", status_code=404, request_id=request_id)
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        return success_response(data=serialize_data(obj), request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao atualizar conta bancária: {e}", exc_info=True)
        db.rollback()
        return error_response(code="UPDATE_ERROR", message=str(e), status_code=500, request_id=request_id)


@router.delete("/contas-bancarias/{item_id}")
def delete_conta_bancaria(
    request: Request,
    item_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("financeiro", "delete"))],
):
    """Deleta uma conta bancária."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = db.query(ContaBancaria).filter(ContaBancaria.id == item_id, ContaBancaria.tenant_id == current_user.tenant_id).first()
        if not obj:
            return error_response(code="NOT_FOUND", message="Conta bancária não encontrada", status_code=404, request_id=request_id)
        db.delete(obj)
        db.commit()
        return success_response(data={"deleted": True}, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao deletar conta bancária: {e}", exc_info=True)
        db.rollback()
        return error_response(code="DELETE_ERROR", message=str(e), status_code=500, request_id=request_id)


# ══════════════════════════════════════════════════════════
#  DESPESAS FIXAS
# ══════════════════════════════════════════════════════════

def _gerar_conta_pagar_despesa_fixa(db: Session, despesa: DespesaFixa, mes: int, ano: int, user_id=None):
    """Gera uma ContaPagar a partir de uma DespesaFixa para o mês/ano informado."""
    # Ajustar dia de vencimento para não ultrapassar o último dia do mês
    ultimo_dia = calendar.monthrange(ano, mes)[1]
    dia = min(despesa.dia_vencimento, ultimo_dia)
    data_venc = date(ano, mes, dia)

    # Verificar se já existe conta gerada para esta despesa fixa neste mês
    existe = (
        db.query(ContaPagar)
        .filter(
            ContaPagar.despesa_fixa_id == despesa.id,
            ContaPagar.tenant_id == despesa.tenant_id,
            extract("month", ContaPagar.data_vencimento) == mes,
            extract("year", ContaPagar.data_vencimento) == ano,
        )
        .first()
    )
    if existe:
        return None  # Já gerada

    conta = ContaPagar(
        tenant_id=despesa.tenant_id,
        descricao=f"[Fixa] {despesa.descricao}",
        fornecedor=despesa.fornecedor,
        categoria=despesa.categoria,
        valor=despesa.valor,
        data_vencimento=data_venc,
        status="pendente",
        forma_pagamento=despesa.forma_pagamento,
        recorrencia="mensal",
        centro_custo_id=despesa.centro_custo_id,
        conta_bancaria_id=despesa.conta_bancaria_id,
        despesa_fixa_id=despesa.id,
        observacoes=despesa.observacoes,
        created_by_user_id=user_id,
    )
    db.add(conta)
    return conta


@router.get("/despesas-fixas")
def list_despesas_fixas(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("financeiro", "read"))],
):
    """Lista todas as despesas fixas."""
    request_id = getattr(request.state, "request_id", None)
    try:
        items = db.query(DespesaFixa).filter(DespesaFixa.tenant_id == current_user.tenant_id).order_by(DespesaFixa.descricao).all()
        return success_response(data=[serialize_data(i) for i in items], request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao listar despesas fixas: {e}", exc_info=True)
        return success_response(data=[], request_id=request_id)


@router.post("/despesas-fixas", status_code=status.HTTP_201_CREATED)
def create_despesa_fixa(
    request: Request,
    data: DespesaFixaCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("financeiro", "create"))],
):
    """Cria uma despesa fixa e gera a conta a pagar do mês atual."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = DespesaFixa(
            **data.model_dump(),
            tenant_id=current_user.tenant_id,
            created_by_user_id=current_user.id,
        )
        db.add(obj)
        db.flush()  # Para obter o ID

        # Gerar conta a pagar do mês atual
        today = date.today()
        _gerar_conta_pagar_despesa_fixa(db, obj, today.month, today.year, user_id=current_user.id)

        db.commit()
        db.refresh(obj)
        return success_response(data=serialize_data(obj), request_id=request_id, status_code=201)
    except Exception as e:
        logger.error(f"Erro ao criar despesa fixa: {e}", exc_info=True)
        db.rollback()
        return error_response(code="CREATE_ERROR", message=str(e), status_code=500, request_id=request_id)


@router.put("/despesas-fixas/{item_id}")
def update_despesa_fixa(
    request: Request,
    item_id: uuid.UUID,
    data: DespesaFixaUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("financeiro", "update"))],
):
    """Atualiza uma despesa fixa."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = db.query(DespesaFixa).filter(DespesaFixa.id == item_id, DespesaFixa.tenant_id == current_user.tenant_id).first()
        if not obj:
            return error_response(code="NOT_FOUND", message="Despesa fixa não encontrada", status_code=404, request_id=request_id)
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        return success_response(data=serialize_data(obj), request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao atualizar despesa fixa: {e}", exc_info=True)
        db.rollback()
        return error_response(code="UPDATE_ERROR", message=str(e), status_code=500, request_id=request_id)


@router.delete("/despesas-fixas/{item_id}")
def delete_despesa_fixa(
    request: Request,
    item_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("financeiro", "delete"))],
):
    """Deleta uma despesa fixa."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = db.query(DespesaFixa).filter(DespesaFixa.id == item_id, DespesaFixa.tenant_id == current_user.tenant_id).first()
        if not obj:
            return error_response(code="NOT_FOUND", message="Despesa fixa não encontrada", status_code=404, request_id=request_id)
        db.delete(obj)
        db.commit()
        return success_response(data={"deleted": True}, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao deletar despesa fixa: {e}", exc_info=True)
        db.rollback()
        return error_response(code="DELETE_ERROR", message=str(e), status_code=500, request_id=request_id)


@router.post("/despesas-fixas/gerar-mes")
def gerar_despesas_fixas_mes(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("financeiro", "create"))],
    mes: Optional[int] = Query(None, ge=1, le=12),
    ano: Optional[int] = Query(None),
):
    """Gera contas a pagar para todas as despesas fixas ativas do mês informado (ou mês atual)."""
    request_id = getattr(request.state, "request_id", None)
    try:
        today = date.today()
        target_mes = mes or today.month
        target_ano = ano or today.year

        despesas = db.query(DespesaFixa).filter(DespesaFixa.ativo == True, DespesaFixa.tenant_id == current_user.tenant_id).all()
        geradas = 0
        for d in despesas:
            conta = _gerar_conta_pagar_despesa_fixa(db, d, target_mes, target_ano, user_id=current_user.id)
            if conta:
                geradas += 1

        db.commit()
        return success_response(
            data={"geradas": geradas, "mes": target_mes, "ano": target_ano},
            request_id=request_id,
        )
    except Exception as e:
        logger.error(f"Erro ao gerar despesas fixas do mês: {e}", exc_info=True)
        db.rollback()
        return error_response(code="GERAR_ERROR", message=str(e), status_code=500, request_id=request_id)
