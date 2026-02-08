from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.lead import Lead
from app.models.usuario import Usuario
from app.schemas.lead import LeadCreate, LeadUpdate, LeadResponse

router = APIRouter(prefix="/leads", tags=["leads"])


@router.get("", response_model=list[LeadResponse])
def list_leads(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
    status_filter: Optional[str] = Query(None, alias="status"),
    temperatura: Optional[str] = Query(None),
    origem: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
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
    return q.order_by(desc(Lead.created_at)).all()


@router.get("/stats/overview")
def leads_stats(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Estatísticas rápidas dos leads."""
    total = db.query(Lead).count()
    novos = db.query(Lead).filter(Lead.status == "novo").count()
    quentes = db.query(Lead).filter(Lead.temperatura == "quente").count()
    ganhos = db.query(Lead).filter(Lead.status == "ganho").count()
    perdidos = db.query(Lead).filter(Lead.status == "perdido").count()
    return {
        "total": total,
        "novos": novos,
        "quentes": quentes,
        "ganhos": ganhos,
        "perdidos": perdidos,
    }


@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead(
    lead_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    obj = db.query(Lead).filter(Lead.id == lead_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    return obj


@router.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
def create_lead(
    data: LeadCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    obj = Lead(**data.model_dump(), criado_por_id=current_user.id)
    if not obj.responsavel_id:
        obj.responsavel_id = current_user.id
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/{lead_id}", response_model=LeadResponse)
def update_lead(
    lead_id: int,
    data: LeadUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    obj = db.query(Lead).filter(Lead.id == lead_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(
    lead_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    obj = db.query(Lead).filter(Lead.id == lead_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    db.delete(obj)
    db.commit()
