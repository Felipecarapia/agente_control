"""
API de Produtividade Mensal
"""
import uuid
from datetime import datetime, timedelta, timezone, date
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, cast, Date

from app.api.deps import get_current_user, get_db
from app.core.response import success_response, error_response
from app.models.usuario import Usuario
from app.models.tarefa import Tarefa
from app.models.productivity import UserProductivityMetric

router = APIRouter()


def get_current_month_period():
    """
    Retorna o período do mês de produtividade (dia 20 do mês anterior até dia 19 do mês atual)
    Garante que os objetos retornados são aware (UTC) para evitar erros de comparação.
    """
    now = datetime.now(timezone.utc)
    
    # Se estamos antes do dia 20, o período começou no dia 20 do mês passado
    if now.day < 20:
        # Mês anterior
        prev_month = now.month - 1 if now.month > 1 else 12
        prev_year = now.year if now.month > 1 else now.year - 1
        
        start_date = datetime(prev_year, prev_month, 20, 0, 0, 0, tzinfo=timezone.utc)
        end_date = datetime(now.year, now.month, 19, 23, 59, 59, tzinfo=timezone.utc)
        month_key = f"{prev_year}-{prev_month:02d}"
    else:
        # Estamos após o dia 20, período começou dia 20 deste mês
        start_date = datetime(now.year, now.month, 20, 0, 0, 0, tzinfo=timezone.utc)
        
        next_month = now.month + 1 if now.month < 12 else 1
        next_year = now.year if now.month < 12 else now.year + 1
        
        end_date = datetime(next_year, next_month, 19, 23, 59, 59, tzinfo=timezone.utc)
        month_key = f"{now.year}-{now.month:02d}"
    
    return start_date, end_date, month_key


def calculate_productivity_score(
    db: Session,
    user_id: uuid.UUID,
    start_date: datetime,
    end_date: datetime
):
    """
    Calcula a pontuação de produtividade baseada em:
    - Apenas tarefas COM data de vencimento são consideradas
    - Tarefas concluídas NO PRAZO: contam positivamente
    - Tarefas concluídas ATRASADAS: não contam
    - Score = (tarefas_no_prazo / total_tarefas_com_prazo) * 100
    - Se não houver tarefas, score = 0%
    """
    now_utc = datetime.now(timezone.utc)
    
    # Tarefas concluídas no prazo (COM data de vencimento)
    # Convertemos completed_at para DATE para comparar com data_vencimento de forma segura
    completed_on_time = db.query(func.count(Tarefa.id)).filter(
        and_(
            Tarefa.responsavel_id == user_id,
            Tarefa.status == "concluida",
            Tarefa.completed_at >= start_date,
            Tarefa.completed_at <= end_date,
            Tarefa.data_vencimento.isnot(None),  # DEVE ter prazo
            cast(Tarefa.completed_at, Date) <= Tarefa.data_vencimento  # Concluída antes ou no prazo
        )
    ).scalar() or 0
    
    # Tarefas concluídas atrasadas (COM data de vencimento, não contam pontos)
    completed_late = db.query(func.count(Tarefa.id)).filter(
        and_(
            Tarefa.responsavel_id == user_id,
            Tarefa.status == "concluida",
            Tarefa.completed_at >= start_date,
            Tarefa.completed_at <= end_date,
            Tarefa.data_vencimento.isnot(None),  # DEVE ter prazo
            cast(Tarefa.completed_at, Date) > Tarefa.data_vencimento  # Concluída APÓS o prazo
        )
    ).scalar() or 0
    
    # Total de tarefas concluídas com prazo no período
    total_completed_with_deadline = completed_on_time + completed_late
    
    # Tarefas pendentes criadas no período
    pending = db.query(func.count(Tarefa.id)).filter(
        and_(
            Tarefa.responsavel_id == user_id,
            Tarefa.status.in_(["pendente", "em_andamento"]),
            Tarefa.created_at >= start_date
        )
    ).scalar() or 0
    
    # Tarefas atrasadas (vencimento passou) - HOJE
    # Comparamos data_vencimento (DATE) com now_utc.date()
    today = now_utc.date()
    overdue = db.query(func.count(Tarefa.id)).filter(
        and_(
            Tarefa.responsavel_id == user_id,
            Tarefa.status.in_(["pendente", "em_andamento"]),
            Tarefa.data_vencimento.isnot(None),
            Tarefa.data_vencimento < today
        )
    ).scalar() or 0
    
    # Cálculo do score: percentual de tarefas concluídas no prazo
    # Se não houver tarefas concluídas com prazo, score = 0%
    if total_completed_with_deadline > 0:
        raw_score = (completed_on_time / total_completed_with_deadline) * 100
    else:
        raw_score = 0
    
    return {
        "productivity_score": Decimal(str(round(raw_score, 2))),
        "tasks_completed_on_time": completed_on_time,
        "tasks_completed_late": completed_late,
        "tasks_pending": pending,
        "tasks_overdue": overdue
    }


@router.get("/my-productivity")
def get_my_productivity(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Retorna a produtividade do usuário logado no período atual
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        start_date, end_date, month_key = get_current_month_period()
        
        # Buscar ou criar métrica
        metric = db.query(UserProductivityMetric).filter(
            and_(
                UserProductivityMetric.user_id == current_user.id,
                UserProductivityMetric.month_year == month_key
            )
        ).first()
        
        # Calcular score atual
        stats = calculate_productivity_score(db, current_user.id, start_date, end_date)
        
        if not metric:
            metric = UserProductivityMetric(
                user_id=current_user.id,
                month_year=month_key,
                **stats
            )
            db.add(metric)
        else:
            # Atualizar
            for key, value in stats.items():
                setattr(metric, key, value)
            metric.last_calculated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(metric)
        
        return success_response(
            data={
                "user_id": str(current_user.id),
                "user_name": current_user.nome,
                "month_period": month_key,
                "period_start": start_date.isoformat(),
                "period_end": end_date.isoformat(),
                "productivity_score": float(metric.productivity_score) if metric.productivity_score is not None else 0.0,
                "tasks_completed_on_time": metric.tasks_completed_on_time,
                "tasks_completed_late": metric.tasks_completed_late,
                "tasks_pending": metric.tasks_pending,
                "tasks_overdue": metric.tasks_overdue,
                "last_updated": metric.last_calculated_at.isoformat() if metric.last_calculated_at else None
            },
            request_id=request_id
        )
    except Exception as e:
        import traceback
        print(f"Error in get_my_productivity: {str(e)}")
        print(traceback.format_exc())
        return error_response(
            code="PRODUCTIVITY_ERROR",
            message=f"Erro ao calcular produtividade: {str(e)}",
            status_code=500,
            request_id=request_id
        )


@router.get("/check-overdue")
def check_overdue_tasks(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Verifica se o usuário tem tarefas atrasadas
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        today = datetime.now(timezone.utc).date()
        overdue_count = db.query(func.count(Tarefa.id)).filter(
            and_(
                Tarefa.responsavel_id == current_user.id,
                Tarefa.status.in_(["pendente", "em_andamento"]),
                Tarefa.data_vencimento.isnot(None),
                Tarefa.data_vencimento < today
            )
        ).scalar() or 0
        
        return success_response(
            data={
                "has_overdue": overdue_count > 0,
                "overdue_count": overdue_count,
                "message": f"Você tem {overdue_count} tarefa(s) atrasada(s). Isso vai diminuir sua taxa de produtividade. Realize imediatamente!" if overdue_count > 0 else "Parabéns! Você não tem tarefas atrasadas."
            },
            request_id=request_id
        )
    except Exception as e:
        return error_response(
            code="CHECK_OVERDUE_ERROR",
            message=f"Erro ao verificar tarefas atrasadas: {str(e)}",
            status_code=500,
            request_id=request_id
        )
