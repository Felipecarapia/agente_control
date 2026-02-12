
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, case, and_, or_
import uuid
import datetime
from dateutil.relativedelta import relativedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user
from app.models.usuario import Usuario
from app.models.projeto import Projeto, ProjectExpense, ExpenseCategory
from app.core.response import success_response, error_response

router = APIRouter(prefix="/projects", tags=["dashboard-projects"])

@router.get("/summary")
def get_dashboard_summary(
    request: Request,
    range: str = Query("30d", description="Time range: 7d, 14d, 30d, 90d, all"),
    status: Optional[str] = Query(None, description="Filter by project status"),
    cliente_id: Optional[uuid.UUID] = Query(None, description="Filter by client"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    request_id = getattr(request.state, "request_id", None)
    
    # Date filtering logic
    now = datetime.datetime.now()
    start_date = None
    if range == "7d":
        start_date = now - datetime.timedelta(days=7)
    elif range == "14d":
        start_date = now - datetime.timedelta(days=14)
    elif range == "30d":
        start_date = now - datetime.timedelta(days=30)
    elif range == "90d":
        start_date = now - datetime.timedelta(days=90)
    # "all" or custom implementation would go here

    # Base query for projects
    query = db.query(Projeto)
    if status and status != "all":
        query = query.filter(Projeto.status == status)
    if cliente_id:
        query = query.filter(Projeto.cliente_id == cliente_id)
        
    projects = query.all()
    project_ids = [p.id for p in projects]

    # Aggregations
    total_budget = sum(p.budget_cents for p in projects)
    total_expected_revenue = sum(p.expected_revenue_cents for p in projects)
    total_actual_revenue = sum(p.actual_revenue_cents for p in projects)

    # Expenses query
    expense_query = db.query(func.sum(ProjectExpense.amount_cents)).filter(
        ProjectExpense.project_id.in_(project_ids)
    )
    if start_date:
        expense_query = expense_query.filter(ProjectExpense.occurred_at >= start_date)
    
    total_spent = expense_query.scalar() or 0

    # Business Logic Calculations
    # Assuming we use ACTUAL revenue for profit calc in this dashboard context, 
    # but the user asked for "Receita (Real/Prevista)". We'll send both.
    # Profit (based on Actual)
    profit = total_actual_revenue - total_spent
    
    # ROI = (Revenue - Cost) / Cost * 100
    roi = 0
    if total_spent > 0:
        roi = ((total_actual_revenue - total_spent) / total_spent) * 100
        
    # Margin = (Revenue - Cost) / Revenue * 100
    margin = 0
    if total_actual_revenue > 0:
        margin = ((total_actual_revenue - total_spent) / total_actual_revenue) * 100

    budget_used_percent = 0
    if total_budget > 0:
        budget_used_percent = (total_spent / total_budget) * 100
        
    # Projects at risk (ROI < 0 or Over Budget)
    # This is complex to do in SQL efficiently without a subquery, we can approximate in python for now or optimize later
    projects_at_risk_count = 0
    for p in projects:
        p_expenses = db.query(func.sum(ProjectExpense.amount_cents)).filter(ProjectExpense.project_id == p.id).scalar() or 0
        if p.budget_cents > 0 and p_expenses > p.budget_cents:
            projects_at_risk_count += 1
        else:
            p_roi = 0
            if p_expenses > 0:
                p_roi = ((p.actual_revenue_cents - p_expenses) / p_expenses) * 100
            if p_expenses > 0 and p_roi < 0:
                projects_at_risk_count += 1

    return success_response(data={
        "currency": "BRL",
        "revenue_cents": total_actual_revenue,
        "expected_revenue_cents": total_expected_revenue,
        "spent_cents": total_spent,
        "profit_cents": profit,
        "roi_percent": round(roi, 2),
        "margin_percent": round(margin, 2),
        "total_budget_cents": total_budget,
        "budget_used_percent": round(budget_used_percent, 2),
        "projects_count": len(projects),
        "projects_at_risk_count": projects_at_risk_count,
        "last_updated_at": now.isoformat()
    }, request_id=request_id)

@router.get("/timeseries")
def get_dashboard_timeseries(
    request: Request,
    range: str = Query("30d"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    request_id = getattr(request.state, "request_id", None)
    
    # Simplified timeseries: Group expenses by date
    # Revenue timeseries would require a "RevenueTransaction" table which we might not have perfectly.
    # We will simulate revenue spread or use created_at if better data missing.
    # For now, let's focus on Expenses over time.
    
    now = datetime.datetime.now()
    start_date = now - datetime.timedelta(days=30) # default
    if range == "7d": start_date = now - datetime.timedelta(days=7)
    elif range == "14d": start_date = now - datetime.timedelta(days=14)
    elif range == "90d": start_date = now - datetime.timedelta(days=90)

    expenses = db.query(
        ProjectExpense.occurred_at,
        func.sum(ProjectExpense.amount_cents).label("total")
    ).filter(
        ProjectExpense.occurred_at >= start_date
    ).group_by(ProjectExpense.occurred_at).order_by(ProjectExpense.occurred_at).all()
    
    points = []
    for date, total in expenses:
        points.append({
            "date": date.isoformat(),
            "spent_cents": total,
            # Placeholder for revenue if we don't have a date-based revenue table
            "revenue_cents": 0, 
            "profit_cents": 0 - total
        })
        
    return success_response(data={"points": points}, request_id=request_id)

@router.get("/by-category")
def get_dashboard_by_category(
    request: Request,
    range: str = Query("30d"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    request_id = getattr(request.state, "request_id", None)
    
    now = datetime.datetime.now()
    start_date = now - datetime.timedelta(days=30)
    if range == "7d": start_date = now - datetime.timedelta(days=7)
    elif range == "14d": start_date = now - datetime.timedelta(days=14)
    elif range == "90d": start_date = now - datetime.timedelta(days=90)

    results = db.query(
        ProjectExpense.category,
        func.sum(ProjectExpense.amount_cents).label("total")
    ).filter(
        ProjectExpense.occurred_at >= start_date
    ).group_by(ProjectExpense.category).all()
    
    categories = []
    total_overall = sum(r.total for r in results) or 1
    
    for cat, total in results:
        categories.append({
            "category": cat,
            "spent_cents": total,
            "percent": round((total / total_overall) * 100, 2)
        })
        
    return success_response(data={"categories": categories}, request_id=request_id)

@router.get("/ranking")
def get_dashboard_ranking(
    request: Request,
    sort: str = "profit",
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    request_id = getattr(request.state, "request_id", None)
    
    # Python-side processing for complex ranking involving calculated fields (profit, roi)
    # Ideally should be SQL, but for MVP/speed and complexity of logic:
    
    projects = db.query(Projeto).all()
    ranked_projects = []
    
    for p in projects:
        spent = db.query(func.sum(ProjectExpense.amount_cents)).filter(ProjectExpense.project_id == p.id).scalar() or 0
        revenue = p.actual_revenue_cents
        profit = revenue - spent
        roi = ((revenue - spent) / spent * 100) if spent > 0 else 0
        
        ranked_projects.append({
            "id": p.id,
            "name": p.nome,
            "revenue_cents": revenue,
            "spent_cents": spent,
            "profit_cents": profit,
            "roi": roi
        })
        
    # Sort
    if sort == "profit":
        ranked_projects.sort(key=lambda x: x["profit_cents"], reverse=True)
    elif sort == "roi":
        ranked_projects.sort(key=lambda x: x["roi"], reverse=True)
    elif sort == "revenue":
        ranked_projects.sort(key=lambda x: x["revenue_cents"], reverse=True)
    elif sort == "spent":
        ranked_projects.sort(key=lambda x: x["spent_cents"], reverse=True)
        
    return success_response(data=ranked_projects[:limit], request_id=request_id)
