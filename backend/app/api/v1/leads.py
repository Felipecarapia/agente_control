from typing import Annotated, Optional
import logging

from fastapi import APIRouter, Depends, Request, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import ValidationError

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.response import success_response, error_response
from app.models.lead import Lead
from app.models.usuario import Usuario
from app.schemas.lead import LeadCreate, LeadUpdate, LeadResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/leads", tags=["leads"])


@router.get("")
def list_leads(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
    status_filter: Optional[str] = Query(None, alias="status"),
    temperatura: Optional[str] = Query(None),
    origem: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    """
    Lista todos os leads com filtros opcionais.
    Retorna sempre 200 com lista vazia se não houver leads.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        q = db.query(Lead)
        if status_filter:
            q = q.filter(Lead.status == status_filter)
        if temperatura:
            q = q.filter(Lead.temperatura == temperatura)
        if origem:
            q = q.filter(Lead.origem == origem)
        if search:
            pattern = f"%{search}%"
            q = q.filter(
                (Lead.nome.ilike(pattern)) |
                (Lead.email.ilike(pattern)) |
                (Lead.empresa.ilike(pattern)) |
                (Lead.telefone.ilike(pattern))
            )
        leads = q.order_by(desc(Lead.created_at)).all()
        # Converter para dict para serialização
        leads_data = [lead.__dict__ for lead in leads]
        # Remover _sa_instance_state
        for lead_dict in leads_data:
            lead_dict.pop("_sa_instance_state", None)
        return success_response(data=leads_data if leads_data else [], request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao listar leads: {str(e)}", exc_info=True, extra={"request_id": request_id})
        # Retornar lista vazia em vez de erro
        return success_response(data=[], request_id=request_id)


@router.get("/stats/overview")
def leads_stats(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Estatísticas rápidas dos leads.
    Retorna sempre 200 com valores zerados se não houver leads.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        total = db.query(Lead).count()
        novos = db.query(Lead).filter(Lead.status == "novo").count()
        quentes = db.query(Lead).filter(Lead.temperatura == "quente").count()
        ganhos = db.query(Lead).filter(Lead.status == "ganho").count()
        perdidos = db.query(Lead).filter(Lead.status == "perdido").count()
        return success_response(
            data={
                "total": total or 0,
                "novos": novos or 0,
                "quentes": quentes or 0,
                "ganhos": ganhos or 0,
                "perdidos": perdidos or 0,
            },
            request_id=request_id
        )
    except Exception as e:
        logger.error(f"Erro ao calcular estatísticas de leads: {str(e)}", exc_info=True, extra={"request_id": request_id})
        # Retornar valores zerados em vez de erro
        return success_response(
            data={
                "total": 0,
                "novos": 0,
                "quentes": 0,
                "ganhos": 0,
                "perdidos": 0,
            },
            request_id=request_id
        )


@router.get("/{lead_id}")
def get_lead(
    request: Request,
    lead_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Busca um lead por ID. Retorna 404 se não encontrado."""
    request_id = getattr(request.state, "request_id", None)
    
    try:
        obj = db.query(Lead).filter(Lead.id == lead_id).first()
        if not obj:
            return error_response(
                code="LEAD_NOT_FOUND",
                message=f"Lead com ID {lead_id} não encontrado",
                status_code=404,
                request_id=request_id
            )
        # Converter para dict
        lead_dict = {k: v for k, v in obj.__dict__.items() if not k.startswith("_")}
        return success_response(data=lead_dict, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao buscar lead {lead_id}: {str(e)}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="INTERNAL_ERROR",
            message="Erro ao buscar lead",
            status_code=500,
            request_id=request_id
        )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_lead(
    request: Request,
    data: LeadCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Cria um novo lead.
    Valida payload com Pydantic -> 400 com details se inválido.
    Retorna 409 se lead duplicado (mesmo email).
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Validação Pydantic já é feita automaticamente pelo FastAPI
        # Verificar se email já existe (duplicado)
        if data.email:
            existing = db.query(Lead).filter(Lead.email == data.email).first()
            if existing:
                return error_response(
                    code="LEAD_DUPLICATE",
                    message=f"Lead com email {data.email} já existe",
                    details={"existing_lead_id": existing.id},
                    status_code=409,
                    request_id=request_id
                )
        
        # Criar lead
        obj = Lead(**data.model_dump(), criado_por_id=current_user.id)
        if not obj.responsavel_id:
            obj.responsavel_id = current_user.id
        db.add(obj)
        db.commit()
        db.refresh(obj)
        
        # Converter para dict
        lead_dict = {k: v for k, v in obj.__dict__.items() if not k.startswith("_")}
        return success_response(data=lead_dict, request_id=request_id, status_code=status.HTTP_201_CREATED)
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
        logger.error(f"Erro ao criar lead: {str(e)}", exc_info=True, extra={"request_id": request_id})
        db.rollback()
        return error_response(
            code="CREATE_ERROR",
            message=f"Erro ao criar lead: {str(e)}",
            status_code=500,
            request_id=request_id
        )


@router.patch("/{lead_id}")
def update_lead(
    request: Request,
    lead_id: int,
    data: LeadUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Atualiza um lead existente.
    Valida payload com Pydantic -> 400 com details se inválido.
    Retorna 404 se lead não encontrado.
    Retorna 409 se email duplicado.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        obj = db.query(Lead).filter(Lead.id == lead_id).first()
        if not obj:
            return error_response(
                code="LEAD_NOT_FOUND",
                message=f"Lead com ID {lead_id} não encontrado",
                status_code=404,
                request_id=request_id
            )
        
        # Verificar se email está sendo atualizado e se já existe em outro lead
        update_data = data.model_dump(exclude_unset=True)
        if "email" in update_data and update_data["email"]:
            existing = db.query(Lead).filter(
                Lead.email == update_data["email"],
                Lead.id != lead_id
            ).first()
            if existing:
                return error_response(
                    code="LEAD_DUPLICATE",
                    message=f"Lead com email {update_data['email']} já existe",
                    details={"existing_lead_id": existing.id},
                    status_code=409,
                    request_id=request_id
                )
        
        # Atualizar campos
        for k, v in update_data.items():
            setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        
        # Converter para dict
        lead_dict = {k: v for k, v in obj.__dict__.items() if not k.startswith("_")}
        return success_response(data=lead_dict, request_id=request_id)
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
        logger.error(f"Erro ao atualizar lead {lead_id}: {str(e)}", exc_info=True, extra={"request_id": request_id})
        db.rollback()
        return error_response(
            code="UPDATE_ERROR",
            message=f"Erro ao atualizar lead: {str(e)}",
            status_code=500,
            request_id=request_id
        )


@router.delete("/{lead_id}")
def delete_lead(
    request: Request,
    lead_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Deleta um lead.
    Retorna 404 se lead não encontrado.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        obj = db.query(Lead).filter(Lead.id == lead_id).first()
        if not obj:
            return error_response(
                code="LEAD_NOT_FOUND",
                message=f"Lead com ID {lead_id} não encontrado",
                status_code=404,
                request_id=request_id
            )
        db.delete(obj)
        db.commit()
        return success_response(data={"deleted": True, "lead_id": lead_id}, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao deletar lead {lead_id}: {str(e)}", exc_info=True, extra={"request_id": request_id})
        db.rollback()
        return error_response(
            code="DELETE_ERROR",
            message=f"Erro ao deletar lead: {str(e)}",
            status_code=500,
            request_id=request_id
        )
