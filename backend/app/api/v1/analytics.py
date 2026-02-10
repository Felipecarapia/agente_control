from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, func, case, extract
from datetime import datetime, timedelta

from app.core.database import get_db, SessionLocal
from app.api.deps import get_current_user
from app.models.usuario import Usuario
from app.models.tarefa import Tarefa, TarefaAssignee
from app.models.task_event import TaskEvent

router = APIRouter(prefix="/analytics", tags=["Analytics & Performance"])

@router.get("/actions-bank")
def get_actions_bank(
    range_days: int = Query(30, description="Dias para considerar em métricas de performance"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Retorna dados consolidados para o Banco de Ações:
    - Lista de usuários com KPIs de tarefas pendentes
    - Top 5 tarefas prioritárias por usuário
    - Scores de eficiência
    """
    
    # 1. Buscar métricas de usuários (SQL Otimizado)
    # Agrega por usuário: Total Pendentes, Atrasadas, Média de Idade (Aging), Carga Ponderada
    # Considera apenas usuários ativos
    
    sql_users = text("""
    SELECT 
        u.id, 
        u.nome, 
        u.email,
        'Member' as role,
        COUNT(t.id) FILTER (WHERE t.status NOT IN ('concluida', 'cancelada')) as total_pending,
        COUNT(t.id) FILTER (WHERE t.status NOT IN ('concluida', 'cancelada') AND t.data_vencimento < NOW()) as overdue_count,
        COALESCE(AVG(EXTRACT(DAY FROM NOW() - t.created_at)) FILTER (WHERE t.status NOT IN ('concluida', 'cancelada')), 0) as avg_timing_days,
        SUM(
            CASE 
                WHEN t.prioridade = 'urgente' THEN 5 
                WHEN t.prioridade = 'alta' THEN 3 
                WHEN t.prioridade = 'media' THEN 2 
                ELSE 1 
            END
        ) FILTER (WHERE t.status NOT IN ('concluida', 'cancelada')) as weighted_load,
        COUNT(t.id) FILTER (WHERE t.status = 'concluida' AND t.completed_at > NOW() - INTERVAL '30 days') as recent_completed
    FROM usuarios u
    LEFT JOIN tarefas t ON t.responsavel_id = u.id
    WHERE u.ativo = true
    GROUP BY u.id, u.nome, u.email
    ORDER BY overdue_count DESC, weighted_load DESC
    """)
    
    users_result = db.execute(sql_users).fetchall()
    
    dashboard_data = []
    
    # 2. Para cada usuário, buscar as top 5 tarefas críticas
    # Isso evita trazer todas as tarefas e sobrecarregar o JSON
    # Poderia ser feito com WINDOW FUNCTION no SQL acima, mas aqui fica mais legível para manutenção
    
    for row in users_result:
        user_id = row.id
        
        # Query Top 5 Tasks
        tasks = db.query(Tarefa).filter(
            Tarefa.responsavel_id == user_id,
            Tarefa.status.notin_(['concluida', 'cancelada'])
        ).order_by(
            case(
                (Tarefa.prioridade == 'urgente', 1),
                (Tarefa.prioridade == 'alta', 2),
                (Tarefa.prioridade == 'media', 3),
                else_=4
            ),
            Tarefa.data_vencimento.asc().nullslast()
        ).limit(5).all()
        
        # Serializar tarefas
        tasks_data = []
        for t in tasks:
            tasks_data.append({
                "id": str(t.id),
                "titulo": t.titulo,
                "status": t.status,
                "prioridade": t.prioridade,
                "vencimento": t.data_vencimento.isoformat() if t.data_vencimento else None,
                "projeto": t.projeto.nome if t.projeto else "Sem Projeto", # Assume lazy load ok for 5 items
                "timing": (datetime.now().date() - t.created_at.date()).days if t.created_at else 0
            })
            
        # Calcular Efficiency Score (0-100)
        # Score baseado em tarefas concluídas vs total de tarefas
        # Penalidades por tarefas atrasadas e aging
        total_tasks = (row.total_pending or 0) + (row.recent_completed or 0)
        
        if total_tasks > 0:
            # Base: percentual de tarefas concluídas
            completion_rate = ((row.recent_completed or 0) / total_tasks) * 100
            
            # Penalidades
            overdue_penalty = (row.overdue_count or 0) * 10  # -10% por tarefa atrasada
            timing_penalty = min((row.avg_timing_days or 0) * 2, 30)  # -2% por dia, max -30%
            
            score = completion_rate - overdue_penalty - timing_penalty
        else:
            # Sem tarefas = 0%
            score = 0
        
        score = max(0, min(100, score))  # Limit 0-100
        
        user_data = {
            "user": {
                "id": str(row.id),
                "nome": row.nome,
                "email": row.email,
                "role": row.role,
                "avatar": None # Frontend gera cor pelo nome
            },
            "kpis": {
                "total_pending": row.total_pending or 0,
                "overdue_count": row.overdue_count or 0,
                "avg_timing": round(row.avg_timing_days or 0, 1),
                "weighted_load": row.weighted_load or 0,
                "recent_completed": row.recent_completed or 0,
                "efficiency_score": round(score)
            },
            "top_tasks": tasks_data
        }
        dashboard_data.append(user_data)
        
    # 3. Sumário Geral
    total_pending = sum(d['kpis']['total_pending'] for d in dashboard_data)
    total_overdue = sum(d['kpis']['overdue_count'] for d in dashboard_data)
    avg_score = sum(d['kpis']['efficiency_score'] for d in dashboard_data) / len(dashboard_data) if dashboard_data else 0
    
    return {
        "summary": {
            "total_pending": total_pending,
            "total_overdue": total_overdue,
            "avg_efficiency": round(avg_score)
        },
        "users": dashboard_data
    }

@router.get("/performance")
def get_performance_charts(
    range_days: int = Query(30),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Retorna dados para gráficos de performance:
    - Burndown/Produtividade (Concluídas por dia)
    - Aging Buckets
    - Status Distribution
    """
    start_date = datetime.now() - timedelta(days=range_days)
    
    # 1. Produtividade Diária (Completed Tasks)
    # Agrupa por data de conclusão
    daily_completed = db.query(
        func.date_trunc('day', Tarefa.completed_at).label('date'),
        func.count(Tarefa.id).label('count')
    ).filter(
        Tarefa.status == 'concluida',
        Tarefa.completed_at >= start_date
    ).group_by(text('1')).order_by(text('1')).all()
    
    chart_productivity = [
        {"date": row.date.strftime('%Y-%m-%d'), "completed": row.count}
        for row in daily_completed
    ]
    
    # 2. Aging Distribution (Buckets)
    # < 3 dias, 3-7 dias, 7-14 dias, 15+ dias
    timing_sql = text("""
    SELECT 
        CASE 
            WHEN extract(day from now() - created_at) < 3 THEN '0-2d'
            WHEN extract(day from now() - created_at) BETWEEN 3 AND 7 THEN '3-7d'
            WHEN extract(day from now() - created_at) BETWEEN 8 AND 14 THEN '8-14d'
            ELSE '15d+'
        END as bucket,
        COUNT(*) as count
    FROM tarefas
    WHERE status NOT IN ('concluida', 'cancelada')
    GROUP BY bucket
    ORDER BY bucket
    """)
    timing_buckets = db.execute(timing_sql).fetchall()
    chart_timing = [{"bucket": row.bucket, "count": row.count} for row in timing_buckets]
    
    return {
        "productivity_trend": chart_productivity,
        "timing_distribution": chart_timing
    }
