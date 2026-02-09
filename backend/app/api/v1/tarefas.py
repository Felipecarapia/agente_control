import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.tarefa import Tarefa
from app.models.usuario import Usuario
from app.schemas.tarefa import TarefaCreate, TarefaUpdate, TarefaResponse

router = APIRouter(prefix="/tarefas", tags=["tarefas"])


@router.get("", response_model=list[TarefaResponse])
def list_tarefas(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
    projeto_id: uuid.UUID | None = None,
):
    q = db.query(Tarefa)
    if projeto_id is not None:
        q = q.filter(Tarefa.projeto_id == projeto_id)
    return q.all()


@router.get("/{tarefa_id}", response_model=TarefaResponse)
def get_tarefa(
    tarefa_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    obj = db.query(Tarefa).filter(Tarefa.id == tarefa_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    return obj


@router.post("", response_model=TarefaResponse, status_code=status.HTTP_201_CREATED)
def create_tarefa(
    data: TarefaCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    obj = Tarefa(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/{tarefa_id}", response_model=TarefaResponse)
def update_tarefa(
    tarefa_id: uuid.UUID,
    data: TarefaUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    obj = db.query(Tarefa).filter(Tarefa.id == tarefa_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{tarefa_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tarefa(
    tarefa_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    obj = db.query(Tarefa).filter(Tarefa.id == tarefa_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    db.delete(obj)
    db.commit()
