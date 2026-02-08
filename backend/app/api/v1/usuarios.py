from typing import Annotated, Optional
import logging
from pydantic import ValidationError

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session, joinedload, selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.response import success_response, error_response, serialize_data
from app.core.security import get_password_hash
from app.core.rbac import require_role, ROLE_ADMIN
from app.models.usuario import Usuario
from app.models.role import UserRole, Role
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate, UsuarioResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/usuarios", tags=["usuarios"])


@router.get("")
def list_usuarios(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_role(ROLE_ADMIN))],
):
    """
    Lista usuários com seus cargos.
    Requer role ADMIN.
    Retorna sempre 200 com lista vazia se não houver usuários (nunca retorna 500).
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Carregar usuários com roles usando selectinload para evitar N+1
        users = db.query(Usuario).options(
            selectinload(Usuario.user_roles).joinedload(UserRole.role)
        ).all()
        
        result = []
        for user in users:
            roles = []
            # Extrair roles dos relacionamentos carregados
            for user_role in user.user_roles:
                if user_role.role:
                    roles.append({
                        "id": user_role.role.id,
                        "key": user_role.role.key,
                        "name": user_role.role.name
                    })
            
            # Usar serialize_data para serialização correta (datas)
            user_dict = serialize_data(user)
            user_dict["roles"] = roles
            result.append(user_dict)
        
        return success_response(data=result if result else [], request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao listar usuários: {e}", exc_info=True, extra={"request_id": request_id})
        # Em caso de erro, retornar lista vazia ao invés de quebrar
        return success_response(data=[], request_id=request_id)


@router.get("/{usuario_id}")
def get_usuario(
    request: Request,
    usuario_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_role(ROLE_ADMIN))],
):
    """
    Obtém um usuário específico.
    Requer role ADMIN.
    Retorna 404 padronizado se usuário não encontrado.
    """
    request_id = getattr(request.state, "request_id", None)
    
    # Validar ID
    if usuario_id <= 0:
        return error_response(
            code="INVALID_ID",
            message="ID do usuário deve ser maior que 0",
            status_code=400,
            request_id=request_id
        )
    
    try:
        user = db.query(Usuario).options(
            selectinload(Usuario.user_roles).joinedload(UserRole.role)
        ).filter(Usuario.id == usuario_id).first()
        
        if not user:
            return error_response(
                code="USER_NOT_FOUND",
                message=f"Usuário com ID {usuario_id} não encontrado",
                status_code=404,
                request_id=request_id
            )
        
        # Serializar usuário com roles
        user_dict = serialize_data(user)
        roles = []
        for user_role in user.user_roles:
            if user_role.role:
                roles.append({
                    "id": user_role.role.id,
                    "key": user_role.role.key,
                    "name": user_role.role.name
                })
        user_dict["roles"] = roles
        
        return success_response(data=user_dict, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao buscar usuário {usuario_id}: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="INTERNAL_ERROR",
            message="Erro ao buscar usuário",
            status_code=500,
            request_id=request_id
        )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_usuario(
    request: Request,
    data: UsuarioCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_role(ROLE_ADMIN))],
):
    """
    Cria um novo usuário.
    Requer role ADMIN.
    Valida payload com Pydantic -> 400 com details se inválido.
    Retorna 409 se email já existe.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Validação Pydantic já é feita automaticamente pelo FastAPI
        # Verificar duplicado: mesmo email
        existing = db.query(Usuario).filter(Usuario.email == data.email).first()
        if existing:
            return error_response(
                code="EMAIL_ALREADY_EXISTS",
                message=f"Email '{data.email}' já está cadastrado",
                details={"existing_user_id": existing.id, "field": "email"},
                status_code=409,
                request_id=request_id
            )
        
        # Criar usuário
        user = Usuario(
            email=data.email,
            hashed_password=get_password_hash(data.password),
            nome=data.nome,
            ativo=data.ativo,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Recarregar com roles
        user = db.query(Usuario).options(
            selectinload(Usuario.user_roles).joinedload(UserRole.role)
        ).filter(Usuario.id == user.id).first()
        
        # Serializar
        user_dict = serialize_data(user)
        roles = []
        for user_role in user.user_roles:
            if user_role.role:
                roles.append({
                    "id": user_role.role.id,
                    "key": user_role.role.key,
                    "name": user_role.role.name
                })
        user_dict["roles"] = roles
        
        return success_response(data=user_dict, status_code=status.HTTP_201_CREATED, request_id=request_id)
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
        logger.error(f"Erro ao criar usuário: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="CREATE_ERROR",
            message=f"Erro ao criar usuário: {str(e)}",
            status_code=500,
            request_id=request_id
        )


@router.patch("/{usuario_id}")
def update_usuario(
    request: Request,
    usuario_id: int,
    data: UsuarioUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_role(ROLE_ADMIN))],
):
    """
    Atualiza um usuário existente.
    Requer role ADMIN.
    Valida payload com Pydantic -> 400 com details se inválido.
    Retorna 404 se usuário não encontrado.
    Retorna 409 se email duplicado.
    """
    request_id = getattr(request.state, "request_id", None)
    
    # Validar ID
    if usuario_id <= 0:
        return error_response(
            code="INVALID_ID",
            message="ID do usuário deve ser maior que 0",
            status_code=400,
            request_id=request_id
        )
    
    try:
        user = db.query(Usuario).filter(Usuario.id == usuario_id).first()
        if not user:
            return error_response(
                code="USER_NOT_FOUND",
                message=f"Usuário com ID {usuario_id} não encontrado",
                status_code=404,
                request_id=request_id
            )
        
        update = data.model_dump(exclude_unset=True)
        
        # Verificar duplicado se email está sendo atualizado
        if "email" in update and update["email"] != user.email:
            existing = db.query(Usuario).filter(
                Usuario.email == update["email"],
                Usuario.id != usuario_id
            ).first()
            if existing:
                return error_response(
                    code="EMAIL_ALREADY_EXISTS",
                    message=f"Email '{update['email']}' já está cadastrado",
                    details={"existing_user_id": existing.id, "field": "email"},
                    status_code=409,
                    request_id=request_id
                )
        
        # Atualizar senha se fornecida
        if "password" in update:
            update["hashed_password"] = get_password_hash(update.pop("password"))
        
        # Atualizar campos
        for k, v in update.items():
            setattr(user, k, v)
        
        db.commit()
        db.refresh(user)
        
        # Recarregar com roles
        user = db.query(Usuario).options(
            selectinload(Usuario.user_roles).joinedload(UserRole.role)
        ).filter(Usuario.id == usuario_id).first()
        
        # Serializar
        user_dict = serialize_data(user)
        roles = []
        for user_role in user.user_roles:
            if user_role.role:
                roles.append({
                    "id": user_role.role.id,
                    "key": user_role.role.key,
                    "name": user_role.role.name
                })
        user_dict["roles"] = roles
        
        return success_response(data=user_dict, request_id=request_id)
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
        logger.error(f"Erro ao atualizar usuário {usuario_id}: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="UPDATE_ERROR",
            message=f"Erro ao atualizar usuário: {str(e)}",
            status_code=500,
            request_id=request_id
        )


@router.delete("/{usuario_id}")
def delete_usuario(
    request: Request,
    usuario_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_role(ROLE_ADMIN))],
):
    """
    Deleta um usuário.
    Requer role ADMIN.
    Retorna 404 padronizado se usuário não encontrado.
    """
    request_id = getattr(request.state, "request_id", None)
    
    # Validar ID
    if usuario_id <= 0:
        return error_response(
            code="INVALID_ID",
            message="ID do usuário deve ser maior que 0",
            status_code=400,
            request_id=request_id
        )
    
    try:
        user = db.query(Usuario).filter(Usuario.id == usuario_id).first()
        if not user:
            return error_response(
                code="USER_NOT_FOUND",
                message=f"Usuário com ID {usuario_id} não encontrado",
                status_code=404,
                request_id=request_id
            )
        
        # Não permitir deletar a si mesmo
        if user.id == current_user.id:
            return error_response(
                code="CANNOT_DELETE_SELF",
                message="Não é possível deletar seu próprio usuário",
                status_code=400,
                request_id=request_id
            )
        
        db.delete(user)
        db.commit()
        return success_response(data={"deleted": True, "usuario_id": usuario_id}, request_id=request_id)
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao deletar usuário {usuario_id}: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="DELETE_ERROR",
            message=f"Erro ao deletar usuário: {str(e)}",
            status_code=500,
            request_id=request_id
        )
