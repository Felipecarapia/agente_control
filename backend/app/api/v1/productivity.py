"""
API de Produtividade Mensal
"""
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.api.deps import get_current_user, get_db
from app.core.response import success_response, error_response
from app.models.usuario import Usuario
from app.models.tarefa import Tarefa
from app.models.productivity import UserProductivityMetric

router = APIRouter()


def get_current_month_period():
    """
    Retorna o período do mês de produtividade (dia 20 do mês anterior até dia 19 do mês atual)
    """
    now = datetime.now()
    
    # Se estamos antes do dia 20, o período começou no dia 20 do mês passado
    if now.day < 20:
        start_date = datetime(now.year, now.month - 1 if now.month > 1 else 12, 20, 0, 0, 0)
        if now.month == 1:
            start_date = start_date.replace(year=now.year - 1)
        end_date = datetime(now.year, now.month, 19, 23, 59, 59)
        month_key = f"{start_date.year}-{start_date.month:02d}"
    else:
        # Estamos após o dia 20, período começou dia 20 deste mês
        start_date = datetime(now.year, now.month, 20, 0, 0, 0)
        next_month = now.month + 1 if now.month < 12 else 1
        next_year = now.year if now.month < 12 else now.year + 1
        end_date = datetime(next_year, next_month, 19, 23, 59, 59)
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
    # Tarefas concluídas no prazo (COM data de vencimento)
    completed_on_time = db.query(func.count(Tarefa.id)).filter(
        and_(
            Tarefa.responsavel_id == user_id,
            Tarefa.status == "concluida",
            Tarefa.completed_at >= start_date,
            Tarefa.completed_at <= end_date,
            Tarefa.data_vencimento.isnot(None),  # DEVE ter prazo
            Tarefa.completed_at <= Tarefa.data_vencimento  # Concluída antes ou no prazo
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
            Tarefa.completed_at > Tarefa.data_vencimento  # Concluída APÓS o prazo
        )
    ).scalar() or 0
    
    # Total de tarefas concluídas com prazo no período
    total_completed_with_deadline = completed_on_time + completed_late
    
    # Tarefas pendentes
    pending = db.query(func.count(Tarefa.id)).filter(
        and_(
            Tarefa.responsavel_id == user_id,
            Tarefa.status.in_(["pendente", "em_andamento"]),
            Tarefa.created_at >= start_date
        )
    ).scalar() or 0
    
    # Tarefas atrasadas (vencimento passou)
    overdue = db.query(func.count(Tarefa.id)).filter(
        and_(
            Tarefa.responsavel_id == user_id,
            Tarefa.status.in_(["pendente", "em_andamento"]),
            Tarefa.data_vencimento.isnot(None),
            Tarefa.data_vencimento < datetime.now()
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
        metric.last_calculated_at = datetime.now()
    
    db.commit()
    db.refresh(metric)
    
    return success_response(
        data={
            "user_id": str(current_user.id),
            "user_name": current_user.nome,
            "month_period": month_key,
            "period_start": start_date.isoformat(),
            "period_end": end_date.isoformat(),
            "productivity_score": float(metric.productivity_score),
            "tasks_completed_on_time": metric.tasks_completed_on_time,
            "tasks_completed_late": metric.tasks_completed_late,
            "tasks_pending": metric.tasks_pending,
            "tasks_overdue": metric.tasks_overdue,
            "last_updated": metric.last_calculated_at.isoformat() if metric.last_calculated_at else None
        },
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
    
    overdue_count = db.query(func.count(Tarefa.id)).filter(
        and_(
            Tarefa.responsavel_id == current_user.id,
            Tarefa.status.in_(["pendente", "em_andamento"]),
            Tarefa.data_vencimento.isnot(None),
            Tarefa.data_vencimento < datetime.now()
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
