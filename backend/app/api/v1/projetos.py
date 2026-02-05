from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.projeto import Projeto
from app.models.usuario import Usuario
from app.schemas.projeto import ProjetoCreate, ProjetoUpdate, ProjetoResponse

router = APIRouter(prefix="/projetos", tags=["projetos"])


@router.get("", response_model=list[ProjetoResponse])
def list_projetos(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    return db.query(Projeto).all()


@router.get("/{projeto_id}", response_model=ProjetoResponse)
def get_projeto(
    projeto_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    obj = db.query(Projeto).filter(Projeto.id == projeto_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return obj


@router.post("", response_model=ProjetoResponse, status_code=status.HTTP_201_CREATED)
def create_projeto(
    data: ProjetoCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    obj = Projeto(**data.model_dump(), usuario_id=current_user.id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/{projeto_id}", response_model=ProjetoResponse)
def update_projeto(
    projeto_id: int,
    data: ProjetoUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    obj = db.query(Projeto).filter(Projeto.id == projeto_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{projeto_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_projeto(
    projeto_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    obj = db.query(Projeto).filter(Projeto.id == projeto_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    db.delete(obj)
    db.commit()
