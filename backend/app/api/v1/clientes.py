import logging
from typing import Annotated
from pydantic import ValidationError

from fastapi import APIRouter, Depends, Request, UploadFile, File, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.response import success_response, error_response, serialize_data
from app.core.validators import IDValidator
from app.core.storage import get_storage_service
from app.models.cliente import Cliente
from app.models.usuario import Usuario
from app.schemas.cliente import ClienteCreate, ClienteUpdate, ClienteResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/clientes", tags=["clientes"])


@router.get("")
def list_clientes(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Lista todos os clientes.
    Retorna sempre 200 com lista vazia se não houver clientes (nunca retorna 500).
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        clientes = db.query(Cliente).all()
        # Converter usando serialize_data para serialização correta
        clientes_data = [serialize_data(c) for c in clientes]
        return success_response(data=clientes_data if clientes_data else [], request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao listar clientes: {e}", exc_info=True, extra={"request_id": request_id})
        # Em caso de erro, retornar lista vazia ao invés de quebrar
        return success_response(data=[], request_id=request_id)


@router.get("/{cliente_id}")
def get_cliente(
    request: Request,
    cliente_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Busca um cliente por ID.
    Retorna 404 padronizado se não encontrado.
    """
    request_id = getattr(request.state, "request_id", None)
    
    # Validar ID
    if cliente_id <= 0:
        return error_response(
            code="INVALID_ID",
            message="ID do cliente deve ser maior que 0",
            status_code=400,
            request_id=request_id
        )
    
    try:
        obj = db.query(Cliente).filter(Cliente.id == cliente_id).first()
        if not obj:
            return error_response(
                code="CLIENT_NOT_FOUND",
                message=f"Cliente com ID {cliente_id} não encontrado",
                status_code=404,
                request_id=request_id
            )
        cliente_data = serialize_data(obj)
        return success_response(data=cliente_data, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao buscar cliente {cliente_id}: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="INTERNAL_ERROR",
            message="Erro ao buscar cliente",
            status_code=500,
            request_id=request_id
        )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_cliente(
    request: Request,
    data: ClienteCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Cria um novo cliente.
    Valida payload com Pydantic -> 400 com details se inválido.
    Retorna 409 se cliente duplicado (mesmo CPF/CNPJ/email).
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Validação Pydantic já é feita automaticamente pelo FastAPI
        # Verificar duplicados: CPF (PF) ou CNPJ (PJ) ou email
        if data.cpf:
            existing = db.query(Cliente).filter(Cliente.cpf == data.cpf).first()
            if existing:
                return error_response(
                    code="CLIENT_DUPLICATE",
                    message=f"Cliente com CPF {data.cpf} já existe",
                    details={"existing_client_id": existing.id, "field": "cpf"},
                    status_code=409,
                    request_id=request_id
                )
        if data.cnpj:
            existing = db.query(Cliente).filter(Cliente.cnpj == data.cnpj).first()
            if existing:
                return error_response(
                    code="CLIENT_DUPLICATE",
                    message=f"Cliente com CNPJ {data.cnpj} já existe",
                    details={"existing_client_id": existing.id, "field": "cnpj"},
                    status_code=409,
                    request_id=request_id
                )
        if data.email:
            existing = db.query(Cliente).filter(Cliente.email == data.email).first()
            if existing:
                return error_response(
                    code="CLIENT_DUPLICATE",
                    message=f"Cliente com email {data.email} já existe",
                    details={"existing_client_id": existing.id, "field": "email"},
                    status_code=409,
                    request_id=request_id
                )
        
        # Criar cliente
        obj = Cliente(**data.model_dump(), usuario_id=current_user.id)
        db.add(obj)
        db.commit()
        db.refresh(obj)
        
        cliente_data = serialize_data(obj)
        return success_response(data=cliente_data, status_code=status.HTTP_201_CREATED, request_id=request_id)
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
        logger.error(f"Erro ao criar cliente: {e}", exc_info=True, extra={"request_id": request_id})
        db.rollback()
        return error_response(
            code="CREATE_ERROR",
            message=f"Erro ao criar cliente: {str(e)}",
            status_code=500,
            request_id=request_id
        )


@router.patch("/{cliente_id}")
def update_cliente(
    request: Request,
    cliente_id: int,
    data: ClienteUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Atualiza um cliente existente.
    Valida payload com Pydantic -> 400 com details se inválido.
    Retorna 404 se cliente não encontrado.
    Retorna 409 se CPF/CNPJ/email duplicado.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        obj = db.query(Cliente).filter(Cliente.id == cliente_id).first()
        if not obj:
            return error_response(
                code="CLIENT_NOT_FOUND",
                message=f"Cliente com ID {cliente_id} não encontrado",
                status_code=404,
                request_id=request_id
            )
        
        # Verificar duplicados se campos estão sendo atualizados
        update_data = data.model_dump(exclude_unset=True)
        if "cpf" in update_data and update_data["cpf"]:
            existing = db.query(Cliente).filter(
                Cliente.cpf == update_data["cpf"],
                Cliente.id != cliente_id
            ).first()
            if existing:
                return error_response(
                    code="CLIENT_DUPLICATE",
                    message=f"Cliente com CPF {update_data['cpf']} já existe",
                    details={"existing_client_id": existing.id, "field": "cpf"},
                    status_code=409,
                    request_id=request_id
                )
        if "cnpj" in update_data and update_data["cnpj"]:
            existing = db.query(Cliente).filter(
                Cliente.cnpj == update_data["cnpj"],
                Cliente.id != cliente_id
            ).first()
            if existing:
                return error_response(
                    code="CLIENT_DUPLICATE",
                    message=f"Cliente com CNPJ {update_data['cnpj']} já existe",
                    details={"existing_client_id": existing.id, "field": "cnpj"},
                    status_code=409,
                    request_id=request_id
                )
        if "email" in update_data and update_data["email"]:
            existing = db.query(Cliente).filter(
                Cliente.email == update_data["email"],
                Cliente.id != cliente_id
            ).first()
            if existing:
                return error_response(
                    code="CLIENT_DUPLICATE",
                    message=f"Cliente com email {update_data['email']} já existe",
                    details={"existing_client_id": existing.id, "field": "email"},
                    status_code=409,
                    request_id=request_id
                )
        
        # Atualizar campos
        for k, v in update_data.items():
            setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        
        cliente_data = serialize_data(obj)
        return success_response(data=cliente_data, request_id=request_id)
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
        logger.error(f"Erro ao atualizar cliente {cliente_id}: {e}", exc_info=True, extra={"request_id": request_id})
        db.rollback()
        return error_response(
            code="UPDATE_ERROR",
            message=f"Erro ao atualizar cliente: {str(e)}",
            status_code=500,
            request_id=request_id
        )


@router.delete("/{cliente_id}")
def delete_cliente(
    request: Request,
    cliente_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Deleta um cliente.
    Retorna 404 padronizado se cliente não encontrado.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        obj = db.query(Cliente).filter(Cliente.id == cliente_id).first()
        if not obj:
            return error_response(
                code="CLIENT_NOT_FOUND",
                message=f"Cliente com ID {cliente_id} não encontrado",
                status_code=404,
                request_id=request_id
            )
        db.delete(obj)
        db.commit()
        return success_response(data={"deleted": True, "cliente_id": cliente_id}, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao deletar cliente {cliente_id}: {e}", exc_info=True, extra={"request_id": request_id})
        db.rollback()
        return error_response(
            code="DELETE_ERROR",
            message=f"Erro ao deletar cliente: {str(e)}",
            status_code=500,
            request_id=request_id
        )


@router.post("/{cliente_id}/upload-logo", response_model=ClienteResponse)
async def upload_logo(
    cliente_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
    file: UploadFile = File(...),
):
    """Upload da logo do cliente para o MinIO."""
    obj = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    storage = get_storage_service()
    if not storage.is_configured():
        raise HTTPException(status_code=500, detail="Storage não configurado")

    content = await file.read()
    ext_allowed = {"jpg", "jpeg", "png", "webp", "gif", "svg"}
    unique_name = storage.generate_unique_filename(file.filename or "logo.png", ext_allowed)
    folder = f"clientes/{cliente_id}/logo"

    logger.info(f"[LOGO] Upload: {file.filename} -> {folder}/{unique_name}")

    url = storage.upload_file(
        file_content=content,
        folder=folder,
        filename=unique_name,
        content_type=file.content_type or "image/png",
    )

    # Remove logo anterior do storage se existir
    if obj.logo_url:
        try:
            storage.delete_file(obj.logo_url)
        except Exception:
            pass

    obj.logo_url = url
    db.commit()
    db.refresh(obj)
    return obj
