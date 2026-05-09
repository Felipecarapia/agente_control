import uuid
import logging
from datetime import date
from decimal import Decimal
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.rbac import require_permission
from app.core.response import success_response, error_response, serialize_data
from app.models.rh import Funcionario, TipoContrato
from app.models.financeiro import DespesaFixa
from app.models.usuario import Usuario
from app.schemas.rh import FuncionarioCreate, FuncionarioUpdate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/rh", tags=["rh"])


def _custo_total_funcionario(func_data) -> Decimal:
    """Calcula o custo total (salário + benefícios)."""
    salario = Decimal(str(func_data.salario_bruto or 0))
    vt = Decimal(str(func_data.vale_transporte or 0))
    vr = Decimal(str(func_data.vale_refeicao or 0))
    ps = Decimal(str(func_data.plano_saude or 0))
    outros = Decimal(str(func_data.outros_beneficios or 0))
    return salario + vt + vr + ps + outros


# ══════════════════════════════════════════════════════════
#  FUNCIONÁRIOS
# ══════════════════════════════════════════════════════════

@router.get("/funcionarios")
def list_funcionarios(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("rh", "read"))],
):
    """Lista todos os funcionários."""
    request_id = getattr(request.state, "request_id", None)
    try:
        items = db.query(Funcionario).filter(Funcionario.tenant_id == current_user.tenant_id).order_by(Funcionario.nome).all()
        return success_response(data=[serialize_data(i) for i in items], request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao listar funcionários: {e}", exc_info=True)
        return success_response(data=[], request_id=request_id)


@router.post("/funcionarios", status_code=status.HTTP_201_CREATED)
def create_funcionario(
    request: Request,
    data: FuncionarioCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("rh", "create"))],
):
    """Cria um funcionário e gera automaticamente uma despesa fixa de salário."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = Funcionario(
            **data.model_dump(),
            tenant_id=current_user.tenant_id,
            created_by_user_id=current_user.id,
        )
        db.add(obj)
        db.flush()

        # Gerar despesa fixa de salário automaticamente
        custo = _custo_total_funcionario(obj)
        if custo > 0:
            tipo_label = {
                "clt": "CLT",
                "pj": "PJ",
                "estagiario": "Estagiário",
                "temporario": "Temporário",
            }.get(obj.tipo_contrato, obj.tipo_contrato)

            despesa = DespesaFixa(
                tenant_id=current_user.tenant_id,
                descricao=f"Salário - {obj.nome} ({tipo_label})",
                valor=custo,
                categoria="salario",
                dia_vencimento=5,  # Dia 5 padrão para folha
                ativo=True,
                observacoes=f"Gerado automaticamente do cadastro de funcionário. Cargo: {obj.cargo or 'N/A'}",
                created_by_user_id=current_user.id,
                centro_custo_id=obj.centro_custo_id,
            )
            db.add(despesa)
            db.flush()

            # Gerar conta a pagar do mês atual
            from app.api.v1.financeiro import _gerar_conta_pagar_despesa_fixa
            today = date.today()
            _gerar_conta_pagar_despesa_fixa(db, despesa, today.month, today.year, user_id=current_user.id)

        db.commit()
        db.refresh(obj)
        return success_response(data=serialize_data(obj), request_id=request_id, status_code=201)
    except Exception as e:
        logger.error(f"Erro ao criar funcionário: {e}", exc_info=True)
        db.rollback()
        return error_response(code="CREATE_ERROR", message=str(e), status_code=500, request_id=request_id)


@router.get("/funcionarios/{func_id}")
def get_funcionario(
    request: Request,
    func_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("rh", "read"))],
):
    """Busca um funcionário pelo ID."""
    request_id = getattr(request.state, "request_id", None)
    obj = db.query(Funcionario).filter(Funcionario.id == func_id, Funcionario.tenant_id == current_user.tenant_id).first()
    if not obj:
        return error_response(code="NOT_FOUND", message="Funcionário não encontrado", status_code=404, request_id=request_id)
    return success_response(data=serialize_data(obj), request_id=request_id)


@router.put("/funcionarios/{func_id}")
def update_funcionario(
    request: Request,
    func_id: uuid.UUID,
    data: FuncionarioUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("rh", "update"))],
):
    """Atualiza um funcionário."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = db.query(Funcionario).filter(Funcionario.id == func_id, Funcionario.tenant_id == current_user.tenant_id).first()
        if not obj:
            return error_response(code="NOT_FOUND", message="Funcionário não encontrado", status_code=404, request_id=request_id)
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        return success_response(data=serialize_data(obj), request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao atualizar funcionário: {e}", exc_info=True)
        db.rollback()
        return error_response(code="UPDATE_ERROR", message=str(e), status_code=500, request_id=request_id)


@router.delete("/funcionarios/{func_id}")
def delete_funcionario(
    request: Request,
    func_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("rh", "delete"))],
):
    """Deleta um funcionário."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = db.query(Funcionario).filter(Funcionario.id == func_id, Funcionario.tenant_id == current_user.tenant_id).first()
        if not obj:
            return error_response(code="NOT_FOUND", message="Funcionário não encontrado", status_code=404, request_id=request_id)
        db.delete(obj)
        db.commit()
        return success_response(data={"deleted": True}, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao deletar funcionário: {e}", exc_info=True)
        db.rollback()
        return error_response(code="DELETE_ERROR", message=str(e), status_code=500, request_id=request_id)


# ══════════════════════════════════════════════════════════
#  RESUMO RH
# ══════════════════════════════════════════════════════════

@router.get("/resumo")
def resumo_rh(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_permission("rh", "read"))],
):
    """Retorna resumo de RH: totais de funcionários, folha e benefícios."""
    request_id = getattr(request.state, "request_id", None)
    try:
        tenant_id = current_user.tenant_id
        total = db.query(Funcionario).filter(Funcionario.tenant_id == tenant_id).count()
        ativos = db.query(Funcionario).filter(Funcionario.tenant_id == tenant_id, Funcionario.ativo == True).count()
        total_clt = db.query(Funcionario).filter(Funcionario.tenant_id == tenant_id, Funcionario.ativo == True, Funcionario.tipo_contrato == "clt").count()
        total_pj = db.query(Funcionario).filter(Funcionario.tenant_id == tenant_id, Funcionario.ativo == True, Funcionario.tipo_contrato == "pj").count()
        total_estagiarios = db.query(Funcionario).filter(Funcionario.tenant_id == tenant_id, Funcionario.ativo == True, Funcionario.tipo_contrato == "estagiario").count()

        total_folha = (
            db.query(func.coalesce(func.sum(Funcionario.salario_bruto), 0))
            .filter(Funcionario.tenant_id == tenant_id, Funcionario.ativo == True)
            .scalar()
        )

        total_vt = db.query(func.coalesce(func.sum(Funcionario.vale_transporte), 0)).filter(Funcionario.tenant_id == tenant_id, Funcionario.ativo == True).scalar()
        total_vr = db.query(func.coalesce(func.sum(Funcionario.vale_refeicao), 0)).filter(Funcionario.tenant_id == tenant_id, Funcionario.ativo == True).scalar()
        total_ps = db.query(func.coalesce(func.sum(Funcionario.plano_saude), 0)).filter(Funcionario.tenant_id == tenant_id, Funcionario.ativo == True).scalar()
        total_ob = db.query(func.coalesce(func.sum(Funcionario.outros_beneficios), 0)).filter(Funcionario.tenant_id == tenant_id, Funcionario.ativo == True).scalar()

        total_beneficios = Decimal(str(total_vt)) + Decimal(str(total_vr)) + Decimal(str(total_ps)) + Decimal(str(total_ob))
        custo_total = Decimal(str(total_folha)) + total_beneficios

        return success_response(
            data={
                "total_funcionarios": total,
                "total_ativos": ativos,
                "total_clt": total_clt,
                "total_pj": total_pj,
                "total_estagiarios": total_estagiarios,
                "total_folha": float(total_folha),
                "total_beneficios": float(total_beneficios),
                "custo_total": float(custo_total),
            },
            request_id=request_id,
        )
    except Exception as e:
        logger.error(f"Erro ao calcular resumo RH: {e}", exc_info=True)
        return error_response(code="RESUMO_ERROR", message=str(e), status_code=500, request_id=request_id)
