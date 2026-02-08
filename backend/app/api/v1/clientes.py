from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.response import success_response, error_response
from app.core.validators import IDValidator
from app.models.cliente import Cliente
from app.models.usuario import Usuario
from app.schemas.cliente import ClienteCreate, ClienteUpdate, ClienteResponse

router = APIRouter(prefix="/clientes", tags=["clientes"])


@router.get("")
def list_clientes(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Lista todos os clientes.
    Retorna lista vazia se não houver clientes (nunca retorna 500).
    """
    try:
        clientes = db.query(Cliente).all()
        # Converter para schema Pydantic para serialização correta
        from app.schemas.cliente import ClienteResponse
        clientes_data = [ClienteResponse.model_validate(c) for c in clientes]
        return success_response(data=clientes_data)
    except Exception as e:
        # Em caso de erro, retornar lista vazia ao invés de quebrar
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erro ao listar clientes: {e}", exc_info=True)
        return success_response(data=[])


@router.get("/{cliente_id}", response_model=ClienteResponse)
def get_cliente(
    cliente_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    # Validar ID
    if cliente_id <= 0:
        return error_response(
            code="INVALID_ID",
            message="ID do cliente deve ser maior que 0",
            status_code=400
        )
    
    obj = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not obj:
        return error_response(
            code="CLIENT_NOT_FOUND",
            message="Cliente não encontrado",
            status_code=404
        )
    return success_response(data=obj)


@router.post("", response_model=ClienteResponse, status_code=status.HTTP_201_CREATED)
def create_cliente(
    data: ClienteCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    obj = Cliente(**data.model_dump(), usuario_id=current_user.id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return success_response(data=obj, status_code=201)


@router.patch("/{cliente_id}", response_model=ClienteResponse)
def update_cliente(
    cliente_id: int,
    data: ClienteUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    obj = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return success_response(data=obj)


@router.delete("/{cliente_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cliente(
    cliente_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    obj = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    db.delete(obj)
    db.commit()
