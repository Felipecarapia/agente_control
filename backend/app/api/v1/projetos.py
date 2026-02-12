import uuid
from typing import Annotated
import logging
from pydantic import ValidationError

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.response import success_response, error_response, serialize_data
from app.core.validators import IDValidator
# Removida restrição de permissão - qualquer usuário autenticado pode cobrar
from app.models.projeto import Projeto, ProjectExpense, ExpenseCategory
from app.models.usuario import Usuario
from app.schemas.projeto import (
    ProjetoCreate, ProjetoUpdate, ProjetoResponse,
    ProjectExpenseCreate, ProjectExpenseUpdate, ProjectFinancialsResponse
)
from app.schemas.mensagem import ProjectNudgeRequest
from app.services.mensagem_service import send_project_nudge, get_project_members

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/projetos", tags=["projetos"])


@router.get("")
def list_projetos(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Lista todos os projetos.
    Retorna sempre 200 com lista vazia se não houver projetos (nunca retorna 500).
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        projetos = db.query(Projeto).all()
        # Converter usando serialize_data para serialização correta (datas/decimal)
        projetos_data = [serialize_data(p) for p in projetos]
        return success_response(data=projetos_data if projetos_data else [], request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao listar projetos: {e}", exc_info=True, extra={"request_id": request_id})
        # Em caso de erro, retornar lista vazia ao invés de quebrar
        return success_response(data=[], request_id=request_id)


@router.get("/{projeto_id}")
def get_projeto(

    request: Request,
    projeto_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Busca um projeto por ID.
    Retorna 404 padronizado se não encontrado.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        obj = db.query(Projeto).filter(Projeto.id == projeto_id).first()
        if not obj:
            return error_response(
                code="PROJECT_NOT_FOUND",
                message=f"Projeto com ID {projeto_id} não encontrado",
                status_code=404,
                request_id=request_id
            )
        projeto_data = serialize_data(obj)
        return success_response(data=projeto_data, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao buscar projeto {projeto_id}: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="INTERNAL_ERROR",
            message="Erro ao buscar projeto",
            status_code=500,
            request_id=request_id
        )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_projeto(
    request: Request,
    data: ProjetoCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Cria um novo projeto.
    Valida payload com Pydantic -> 400 com details se inválido.
    Retorna 409 se projeto duplicado (mesmo nome + cliente).
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Validação Pydantic já é feita automaticamente pelo FastAPI
        # Verificar duplicado: mesmo nome + cliente_id
        existing = db.query(Projeto).filter(
            Projeto.nome == data.nome,
            Projeto.cliente_id == data.cliente_id
        ).first()
        if existing:
            return error_response(
                code="PROJECT_DUPLICATE",
                message=f"Projeto '{data.nome}' já existe para este cliente",
                details={"existing_project_id": existing.id, "field": "nome"},
                status_code=409,
                request_id=request_id
            )
        
        # Verificar se cliente existe
        from app.models.cliente import Cliente
        cliente = db.query(Cliente).filter(Cliente.id == data.cliente_id).first()
        if not cliente:
            return error_response(
                code="CLIENT_NOT_FOUND",
                message=f"Cliente com ID {data.cliente_id} não encontrado",
                status_code=404,
                request_id=request_id
            )
        
        # Criar projeto
        obj = Projeto(**data.model_dump(), usuario_id=current_user.id)
        db.add(obj)
        db.commit()
        db.refresh(obj)
        
        projeto_data = serialize_data(obj)
        return success_response(data=projeto_data, status_code=status.HTTP_201_CREATED, request_id=request_id)
    except ValidationError as e:
        # Validação Pydantic falhou
        return error_response(
            code="VALIDATION_ERROR",
            message="Dados inválidos",
            details=e.errors(),
            status_code=400,
            request_id=request_id
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao criar projeto: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="CREATE_ERROR",
            message=f"Erro ao criar projeto: {str(e)}",
            status_code=500,
            request_id=request_id
        )


@router.patch("/{projeto_id}")
def update_projeto(
    request: Request,
    projeto_id: uuid.UUID,
    data: ProjetoUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Atualiza um projeto existente.
    Valida payload com Pydantic -> 400 com details se inválido.
    Retorna 404 se projeto não encontrado.
    Retorna 409 se nome+cliente duplicado.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        obj = db.query(Projeto).filter(Projeto.id == projeto_id).first()
        if not obj:
            return error_response(
                code="PROJECT_NOT_FOUND",
                message=f"Projeto com ID {projeto_id} não encontrado",
                status_code=404,
                request_id=request_id
            )
        
        # Verificar duplicados se nome ou cliente_id estão sendo atualizados
        update_data = data.model_dump(exclude_unset=True)
        if "nome" in update_data or "cliente_id" in update_data:
            nome = update_data.get("nome", obj.nome)
            cliente_id = update_data.get("cliente_id", obj.cliente_id)
            existing = db.query(Projeto).filter(
                Projeto.nome == nome,
                Projeto.cliente_id == cliente_id,
                Projeto.id != projeto_id
            ).first()
            if existing:
                return error_response(
                    code="PROJECT_DUPLICATE",
                    message=f"Projeto '{nome}' já existe para este cliente",
                    details={"existing_project_id": existing.id, "field": "nome"},
                    status_code=409,
                    request_id=request_id
                )
        
        # Verificar se cliente existe (se cliente_id está sendo atualizado)
        if "cliente_id" in update_data:
            from app.models.cliente import Cliente
            cliente = db.query(Cliente).filter(Cliente.id == update_data["cliente_id"]).first()
            if not cliente:
                return error_response(
                    code="CLIENT_NOT_FOUND",
                    message=f"Cliente com ID {update_data['cliente_id']} não encontrado",
                    status_code=404,
                    request_id=request_id
                )
        
        # Atualizar campos
        for k, v in update_data.items():
            setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        
        projeto_data = serialize_data(obj)
        return success_response(data=projeto_data, request_id=request_id)
    except ValidationError as e:
        # Validação Pydantic falhou
        return error_response(
            code="VALIDATION_ERROR",
            message="Dados inválidos",
            details=e.errors(),
            status_code=400,
            request_id=request_id
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao atualizar projeto {projeto_id}: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="UPDATE_ERROR",
            message=f"Erro ao atualizar projeto: {str(e)}",
            status_code=500,
            request_id=request_id
        )


@router.delete("/{projeto_id}")
def delete_projeto(
    request: Request,
    projeto_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Deleta um projeto.
    Retorna 404 padronizado se projeto não encontrado.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        obj = db.query(Projeto).filter(Projeto.id == projeto_id).first()
        if not obj:
            return error_response(
                code="PROJECT_NOT_FOUND",
                message=f"Projeto com ID {projeto_id} não encontrado",
                status_code=404,
                request_id=request_id
            )
        db.delete(obj)
        db.commit()
        return success_response(data={"deleted": True, "projeto_id": projeto_id}, request_id=request_id)
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao deletar projeto {projeto_id}: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="DELETE_ERROR",
            message=f"Erro ao deletar projeto: {str(e)}",
            status_code=500,
            request_id=request_id
        )


@router.get("/{projeto_id}/members", response_model=list[dict])
def get_projeto_members(
    projeto_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Lista membros envolvidos no projeto."""
    projeto = db.query(Projeto).filter(Projeto.id == projeto_id).first()
    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return get_project_members(db, projeto_id)


@router.post("/{projeto_id}/nudge", status_code=status.HTTP_201_CREATED)
def nudge_projeto(
    projeto_id: uuid.UUID,
    data: ProjectNudgeRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],  # Removida restrição de permissão
):
    """Envia notificação de cobrança para membros do projeto."""
    projeto = db.query(Projeto).filter(Projeto.id == projeto_id).first()
    if not projeto:
        return error_response(
            code="PROJECT_NOT_FOUND",
            message="Projeto não encontrado",
            status_code=404
        )

    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    try:
        notifications = send_project_nudge(
            db=db,
            project_id=projeto_id,
            recipient_user_ids=data.recipient_user_ids,
            preset=data.preset,
            custom_message=data.custom_message,
            author_user_id=current_user.id,
            request_ip=ip_address,
            user_agent=user_agent,
        )
        return success_response(
            data={
                "message": f"{len(notifications)} notificações enviadas",
                "count": len(notifications),
            },
            status_code=201
        )
    except ValueError as e:
        return error_response(
            code="VALIDATION_ERROR",
            message=str(e),
            status_code=400
        )

@router.patch("/{projeto_id}/expenses/{expense_id}")
def update_project_expense(
    request: Request,
    projeto_id: uuid.UUID,
    expense_id: uuid.UUID,
    data: ProjectExpenseUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Atualiza uma despesa existente.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        expense = db.query(ProjectExpense).filter(
            ProjectExpense.id == expense_id,
            ProjectExpense.project_id == projeto_id
        ).first()
        
        if not expense:
             return error_response(
                code="EXPENSE_NOT_FOUND",
                message=f"Despesa não encontrada",
                status_code=404,
                request_id=request_id
            )
            
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(expense, key, value)
            
        db.commit()
        db.refresh(expense)
        
        return success_response(data=serialize_data(expense), request_id=request_id)
        
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao atualizar despesa {expense_id}: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="UPDATE_ERROR",
            message=f"Erro ao atualizar despesa: {str(e)}",
            status_code=500,
            request_id=request_id
        )



# ──────────────────── Financials ────────────────────

@router.get("/{projeto_id}/financials")
def get_project_financials(
    request: Request,
    projeto_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Retorna dados financeiros do projeto including budget, expenses, ROI e KPIs.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        projeto = db.query(Projeto).filter(Projeto.id == projeto_id).options(joinedload(Projeto.expenses)).first()
        if not projeto:
             return error_response(
                code="PROJECT_NOT_FOUND",
                message=f"Projeto com ID {projeto_id} não encontrado",
                status_code=404,
                request_id=request_id
            )
        
        # Calculate Aggregates
        expenses = projeto.expenses
        total_spent = sum(e.amount_cents for e in expenses)
        remaining = projeto.budget_cents - total_spent
        percent_used = (total_spent / projeto.budget_cents * 100) if projeto.budget_cents > 0 else 0.0
        
        # ROI Calculation
        roi = None
        roi_mode = None
        
        if projeto.actual_revenue_cents > 0:
            roi_mode = "actual"
            investment = total_spent
            if investment > 0:
                roi = ((projeto.actual_revenue_cents - investment) / investment) * 100
            else:
                roi = 0 # Or infinite? Usually 0 or None if no investment yet but revenue exists
        elif projeto.expected_revenue_cents > 0:
            roi_mode = "expected"
            investment = total_spent
            if investment > 0:
                roi = ((projeto.expected_revenue_cents - investment) / investment) * 100
        
        # Group by Category
        by_category = {}
        for e in expenses:
            cat = e.category.value if hasattr(e.category, 'value') else e.category
            by_category[cat] = by_category.get(cat, 0) + e.amount_cents
            
        expenses_by_category = [
            {"category": k, "total_cents": v} for k, v in by_category.items()
        ]
        
        response_data = {
            "budget_cents": projeto.budget_cents,
            "currency": projeto.moeda,
            "expected_revenue_cents": projeto.expected_revenue_cents,
            "actual_revenue_cents": projeto.actual_revenue_cents,
            "total_spent_cents": total_spent,
            "remaining_cents": remaining,
            "percent_used": round(percent_used, 2),
            "roi": round(roi, 2) if roi is not None else None,
            "roi_mode": roi_mode,
            "expenses_by_category": expenses_by_category,
            "expenses": [serialize_data(e) for e in expenses] # serialize dates/UUIDs
        }
        
        return success_response(data=response_data, request_id=request_id)

    except Exception as e:
        logger.error(f"Erro ao buscar financeiro do projeto {projeto_id}: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="INTERNAL_ERROR",
            message=f"Erro ao buscar dados financeiros: {str(e)}",
            status_code=500,
            request_id=request_id
        )


@router.patch("/{projeto_id}/budget")
def update_project_budget(
    request: Request,
    projeto_id: uuid.UUID,
    data: ProjetoUpdate, # Using generic update or should I check for budget fields only? existing ProjetoUpdate has new fields.
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Atualiza apenas o orçamento e previsões do projeto.
    """
    # Reuse generic update but explicit endpoint for clarity in API usage
    return update_projeto(request, projeto_id, data, db, current_user)


@router.post("/{projeto_id}/expenses", status_code=status.HTTP_201_CREATED)
def create_project_expense(
    request: Request,
    projeto_id: uuid.UUID,
    data: ProjectExpenseCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Cria uma nova despesa para o projeto.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        projeto = db.query(Projeto).filter(Projeto.id == projeto_id).first()
        if not projeto:
             return error_response(
                code="PROJECT_NOT_FOUND",
                message=f"Projeto com ID {projeto_id} não encontrado",
                status_code=404,
                request_id=request_id
            )
            
        expense = ProjectExpense(
            **data.model_dump(),
            project_id=projeto_id,
            created_by_id=current_user.id
        )
        db.add(expense)
        db.commit()
        db.refresh(expense)
        
        return success_response(data=serialize_data(expense), status_code=201, request_id=request_id)
        
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao criar despesa para projeto {projeto_id}: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="CREATE_ERROR",
            message=f"Erro ao criar despesa: {str(e)}",
            status_code=500,
            request_id=request_id
        )

@router.delete("/{projeto_id}/expenses/{expense_id}")
def delete_project_expense(
    request: Request,
    projeto_id: uuid.UUID,
    expense_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Remove uma despesa do projeto.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        expense = db.query(ProjectExpense).filter(
            ProjectExpense.id == expense_id,
            ProjectExpense.project_id == projeto_id
        ).first()
        
        if not expense:
             return error_response(
                code="EXPENSE_NOT_FOUND",
                message=f"Despesa não encontrada",
                status_code=404,
                request_id=request_id
            )
            
        db.delete(expense)
        db.commit()
        
        return success_response(data={"deleted": True}, request_id=request_id)
        
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao deletar despesa {expense_id}: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="DELETE_ERROR",
            message=f"Erro ao deletar despesa: {str(e)}",
            status_code=500,
            request_id=request_id
        )

