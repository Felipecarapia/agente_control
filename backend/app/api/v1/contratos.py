import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.contrato import Contrato
from app.models.usuario import Usuario
from app.schemas.contrato import ContratoCreate, ContratoUpdate, ContratoResponse

router = APIRouter(prefix="/contratos", tags=["contratos"])


@router.get("", response_model=list[ContratoResponse])
def list_contratos(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    return db.query(Contrato).all()


@router.get("/{contrato_id}", response_model=ContratoResponse)
def get_contrato(
    contrato_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    obj = db.query(Contrato).filter(Contrato.id == contrato_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    return obj


@router.post("", response_model=ContratoResponse, status_code=status.HTTP_201_CREATED)
def create_contrato(
    data: ContratoCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    obj = Contrato(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/{contrato_id}", response_model=ContratoResponse)
def update_contrato(
    contrato_id: uuid.UUID,
    data: ContratoUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    obj = db.query(Contrato).filter(Contrato.id == contrato_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{contrato_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contrato(
    contrato_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    obj = db.query(Contrato).filter(Contrato.id == contrato_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    db.delete(obj)
    db.commit()
