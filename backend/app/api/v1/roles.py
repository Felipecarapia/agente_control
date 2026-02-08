from typing import Annotated, Optional
import logging
from pydantic import ValidationError

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import ProgrammingError, OperationalError

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.rbac import require_role, ROLE_ADMIN, has_role
from app.core.response import success_response, error_response, serialize_data
from app.models.usuario import Usuario
from app.models.role import Role, UserRole
from app.models.permission import Permission, RolePermission
from app.schemas.permission import (
    RoleCreate, RoleUpdate, RoleResponse, RoleWithPermissionsResponse,
    PermissionResponse, PermissionCreate, UpdateRolePermissionsRequest
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/roles", tags=["roles"])


# ============== ROLES ==============

@router.get("")
def list_roles(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Lista todas as roles disponíveis.
    Retorna sempre 200 com lista vazia se não houver roles (nunca retorna 500).
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        roles = db.query(Role).order_by(Role.name).all()
        # Usar serialize_data para serialização correta (datas)
        roles_data = [serialize_data(r) for r in roles]
        return success_response(data=roles_data if roles_data else [], request_id=request_id)
    except (ProgrammingError, OperationalError) as e:
        # Tabela não existe ainda
        logger.warning(f"Tabela de roles não existe: {e}", extra={"request_id": request_id})
        return success_response(data=[], request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao listar roles: {e}", exc_info=True, extra={"request_id": request_id})
        # Em caso de erro, retornar lista vazia ao invés de quebrar
        return success_response(data=[], request_id=request_id)


@router.get("/{role_id}")
def get_role(
    request: Request,
    role_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Obtém uma role com suas permissões.
    Retorna 404 padronizado se role não encontrada.
    """
    request_id = getattr(request.state, "request_id", None)
    
    # Validar ID
    if role_id <= 0:
        return error_response(
            code="INVALID_ID",
            message="ID da role deve ser maior que 0",
            status_code=400,
            request_id=request_id
        )
    
    try:
        # Carregar role com permissões usando selectinload para evitar N+1
        role = db.query(Role).options(
            selectinload(Role.role_permissions).joinedload(RolePermission.permission)
        ).filter(Role.id == role_id).first()
        
        if not role:
            return error_response(
                code="ROLE_NOT_FOUND",
                message=f"Role com ID {role_id} não encontrada",
                status_code=404,
                request_id=request_id
            )
        
        # Extrair permissões dos relacionamentos carregados
        permissions_data = []
        for rp in role.role_permissions:
            if rp.permission:
                permissions_data.append(serialize_data(rp.permission))
        
        # Serializar role
        role_dict = serialize_data(role)
        role_dict["permissions"] = permissions_data
        
        return success_response(data=role_dict, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao buscar role {role_id}: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="INTERNAL_ERROR",
            message="Erro ao buscar role",
            status_code=500,
            request_id=request_id
        )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_role(
    request: Request,
    data: RoleCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_role(ROLE_ADMIN))],
):
    """
    Cria uma nova role (apenas ADMIN).
    Valida payload com Pydantic -> 400 com details se inválido.
    Retorna 409 se key já existe (duplicado).
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Validação Pydantic já é feita automaticamente pelo FastAPI
        # Verificar duplicado: mesmo key
        key_upper = data.key.upper()
        existing = db.query(Role).filter(Role.key == key_upper).first()
        if existing:
            return error_response(
                code="ROLE_DUPLICATE",
                message=f"Role com key '{key_upper}' já existe",
                details={"existing_role_id": existing.id, "field": "key"},
                status_code=409,
                request_id=request_id
            )
        
        # Criar role
        role = Role(key=key_upper, name=data.name)
        db.add(role)
        db.commit()
        db.refresh(role)
        
        # Serializar usando serialize_data
        role_dict = serialize_data(role)
        
        return success_response(data=role_dict, status_code=status.HTTP_201_CREATED, request_id=request_id)
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
        logger.error(f"Erro ao criar role: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="CREATE_ERROR",
            message=f"Erro ao criar role: {str(e)}",
            status_code=500,
            request_id=request_id
        )


@router.patch("/{role_id}")
def update_role(
    request: Request,
    role_id: int,
    data: RoleUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_role(ROLE_ADMIN))],
):
    """
    Atualiza uma role (apenas ADMIN).
    Valida payload com Pydantic -> 400 com details se inválido.
    Retorna 404 se role não encontrada.
    """
    request_id = getattr(request.state, "request_id", None)
    
    # Validar ID
    if role_id <= 0:
        return error_response(
            code="INVALID_ID",
            message="ID da role deve ser maior que 0",
            status_code=400,
            request_id=request_id
        )
    
    try:
        role = db.query(Role).filter(Role.id == role_id).first()
        if not role:
            return error_response(
                code="ROLE_NOT_FOUND",
                message=f"Role com ID {role_id} não encontrada",
                status_code=404,
                request_id=request_id
            )
        
        # Atualizar nome se fornecido
        if data.name is not None:
            role.name = data.name
        
        db.commit()
        db.refresh(role)
        
        # Serializar usando serialize_data
        role_dict = serialize_data(role)
        
        return success_response(data=role_dict, request_id=request_id)
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
        logger.error(f"Erro ao atualizar role {role_id}: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="UPDATE_ERROR",
            message=f"Erro ao atualizar role: {str(e)}",
            status_code=500,
            request_id=request_id
        )


@router.delete("/{role_id}")
def delete_role(
    request: Request,
    role_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_role(ROLE_ADMIN))],
):
    """
    Deleta uma role (apenas ADMIN).
    Retorna 404 padronizado se role não encontrada.
    """
    request_id = getattr(request.state, "request_id", None)
    
    # Validar ID
    if role_id <= 0:
        return error_response(
            code="INVALID_ID",
            message="ID da role deve ser maior que 0",
            status_code=400,
            request_id=request_id
        )
    
    try:
        role = db.query(Role).filter(Role.id == role_id).first()
        if not role:
            return error_response(
                code="ROLE_NOT_FOUND",
                message=f"Role com ID {role_id} não encontrada",
                status_code=404,
                request_id=request_id
            )
        
        # Remover todas as associações de usuários com esta role primeiro
        db.query(UserRole).filter(UserRole.role_id == role_id).delete()
        
        # Remover todas as permissões associadas (CASCADE deve fazer isso, mas vamos garantir)
        db.query(RolePermission).filter(RolePermission.role_id == role_id).delete()
        
        # Agora pode deletar a role
        db.delete(role)
        db.commit()
        
        return success_response(data={"deleted": True, "role_id": role_id}, request_id=request_id)
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao deletar role {role_id}: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="DELETE_ERROR",
            message=f"Erro ao deletar role: {str(e)}",
            status_code=500,
            request_id=request_id
        )


# ============== PERMISSIONS ==============

@router.get("/permissions/all")
def list_all_permissions(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Lista todas as permissões disponíveis.
    Retorna sempre 200 com lista vazia se não houver permissões (nunca retorna 500).
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        permissions = db.query(Permission).order_by(Permission.module, Permission.action).all()
        # Usar serialize_data para serialização correta (datas)
        permissions_data = [serialize_data(p) for p in permissions]
        return success_response(data=permissions_data if permissions_data else [], request_id=request_id)
    except (ProgrammingError, OperationalError) as e:
        # Tabela não existe ainda
        logger.warning(f"Tabela de permissões não existe: {e}", extra={'request_id': request_id})
        return success_response(data=[], request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao listar permissões: {e}", exc_info=True, extra={"request_id": request_id})
        # Em caso de erro, retornar lista vazia ao invés de quebrar
        return success_response(data=[], request_id=request_id)


@router.get("/permissions/by-module")
def list_permissions_by_module(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Lista permissões agrupadas por módulo.
    Retorna sempre 200 com dict vazio se não houver permissões (nunca retorna 500).
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        permissions = db.query(Permission).order_by(Permission.module, Permission.action).all()
        grouped = {}
        for perm in permissions:
            if perm.module not in grouped:
                grouped[perm.module] = []
            # Usar serialize_data para serialização correta (datas)
            grouped[perm.module].append(serialize_data(perm))
        return success_response(data=grouped if grouped else {}, request_id=request_id)
    except (ProgrammingError, OperationalError) as e:
        # Tabela não existe ainda
        logger.warning(f"Tabela de permissões não existe: {e}", extra={"request_id": request_id})
        return success_response(data={}, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao listar permissões por módulo: {e}", exc_info=True, extra={"request_id": request_id})
        # Em caso de erro, retornar dict vazio ao invés de quebrar
        return success_response(data={}, request_id=request_id)


@router.post("/permissions", status_code=status.HTTP_201_CREATED)
def create_permission(
    request: Request,
    data: PermissionCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_role(ROLE_ADMIN))],
):
    """
    Cria uma nova permissão (apenas ADMIN).
    Valida payload com Pydantic -> 400 com details se inválido.
    Retorna 409 se module.action já existe (duplicado).
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Validação Pydantic já é feita automaticamente pelo FastAPI
        # Verificar duplicado: mesmo module + action
        existing = db.query(Permission).filter(
            Permission.module == data.module,
            Permission.action == data.action
        ).first()
        if existing:
            return error_response(
                code="PERMISSION_DUPLICATE",
                message=f"Permissão '{data.module}.{data.action}' já existe",
                details={"existing_permission_id": existing.id, "field": "module.action"},
                status_code=409,
                request_id=request_id
            )
        
        # Criar permissão
        permission = Permission(
            module=data.module,
            action=data.action,
            name=data.name,
            description=data.description
        )
        db.add(permission)
        db.commit()
        db.refresh(permission)
        
        # Serializar usando serialize_data
        permission_dict = serialize_data(permission)
        
        return success_response(data=permission_dict, status_code=status.HTTP_201_CREATED, request_id=request_id)
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
        logger.error(f"Erro ao criar permissão: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="CREATE_ERROR",
            message=f"Erro ao criar permissão: {str(e)}",
            status_code=500,
            request_id=request_id
        )


@router.patch("/permissions/{permission_id}")
def update_permission(
    request: Request,
    permission_id: int,
    data: PermissionCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_role(ROLE_ADMIN))],
):
    """
    Atualiza uma permissão (apenas ADMIN).
    Valida payload com Pydantic -> 400 com details se inválido.
    Retorna 404 se permissão não encontrada.
    Retorna 409 se module.action duplicado.
    """
    request_id = getattr(request.state, "request_id", None)
    
    # Validar ID
    if permission_id <= 0:
        return error_response(
            code="INVALID_ID",
            message="ID da permissão deve ser maior que 0",
            status_code=400,
            request_id=request_id
        )
    
    try:
        permission = db.query(Permission).filter(Permission.id == permission_id).first()
        if not permission:
            return error_response(
                code="PERMISSION_NOT_FOUND",
                message=f"Permissão com ID {permission_id} não encontrada",
                status_code=404,
                request_id=request_id
            )
        
        # Verificar duplicado se module/action está sendo atualizado
        if data.module != permission.module or data.action != permission.action:
            existing = db.query(Permission).filter(
                Permission.module == data.module,
                Permission.action == data.action,
                Permission.id != permission_id
            ).first()
            if existing:
                return error_response(
                    code="PERMISSION_DUPLICATE",
                    message=f"Permissão '{data.module}.{data.action}' já existe",
                    details={"existing_permission_id": existing.id, "field": "module.action"},
                    status_code=409,
                    request_id=request_id
                )
        
        # Atualizar campos
        permission.module = data.module
        permission.action = data.action
        permission.name = data.name
        permission.description = data.description
        
        db.commit()
        db.refresh(permission)
        
        # Serializar usando serialize_data
        permission_dict = serialize_data(permission)
        
        return success_response(data=permission_dict, request_id=request_id)
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
        logger.error(f"Erro ao atualizar permissão {permission_id}: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="UPDATE_ERROR",
            message=f"Erro ao atualizar permissão: {str(e)}",
            status_code=500,
            request_id=request_id
        )


@router.delete("/permissions/{permission_id}")
def delete_permission(
    request: Request,
    permission_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_role(ROLE_ADMIN))],
):
    """
    Deleta uma permissão (apenas ADMIN).
    Retorna 404 padronizado se permissão não encontrada.
    """
    request_id = getattr(request.state, "request_id", None)
    
    # Validar ID
    if permission_id <= 0:
        return error_response(
            code="INVALID_ID",
            message="ID da permissão deve ser maior que 0",
            status_code=400,
            request_id=request_id
        )
    
    try:
        permission = db.query(Permission).filter(Permission.id == permission_id).first()
        if not permission:
            return error_response(
                code="PERMISSION_NOT_FOUND",
                message=f"Permissão com ID {permission_id} não encontrada",
                status_code=404,
                request_id=request_id
            )
        
        db.delete(permission)
        db.commit()
        
        return success_response(data={"deleted": True, "permission_id": permission_id}, request_id=request_id)
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao deletar permissão {permission_id}: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="DELETE_ERROR",
            message=f"Erro ao deletar permissão: {str(e)}",
            status_code=500,
            request_id=request_id
        )


@router.put("/{role_id}/permissions")
def update_role_permissions(
    request: Request,
    role_id: int,
    data: UpdateRolePermissionsRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_role(ROLE_ADMIN))],
):
    """
    Atualiza permissões de uma role (apenas ADMIN).
    Valida payload com Pydantic -> 400 com details se inválido.
    Retorna 404 se role não encontrada.
    Retorna 400 se alguma permissão não encontrada.
    Usa transação para garantir atomicidade (rollback se falhar).
    """
    request_id = getattr(request.state, "request_id", None)
    
    # Validar ID
    if role_id <= 0:
        return error_response(
            code="INVALID_ID",
            message="ID da role deve ser maior que 0",
            status_code=400,
            request_id=request_id
        )
    
    try:
        role = db.query(Role).filter(Role.id == role_id).first()
        if not role:
            return error_response(
                code="ROLE_NOT_FOUND",
                message=f"Role com ID {role_id} não encontrada",
                status_code=404,
                request_id=request_id
            )
        
        # Verificar se todas as permissões existem
        if data.permission_ids:
            permissions = db.query(Permission).filter(Permission.id.in_(data.permission_ids)).all()
            found_ids = {p.id for p in permissions}
            missing_ids = set(data.permission_ids) - found_ids
            if missing_ids:
                return error_response(
                    code="PERMISSIONS_NOT_FOUND",
                    message=f"Permissões não encontradas: {list(missing_ids)}",
                    details={"missing_permission_ids": list(missing_ids)},
                    status_code=400,
                    request_id=request_id
                )
        
        # Usar transação para garantir atomicidade
        # Remover permissões antigas
        db.query(RolePermission).filter(RolePermission.role_id == role_id).delete()
        
        # Adicionar novas permissões
        for perm_id in data.permission_ids:
            role_perm = RolePermission(role_id=role_id, permission_id=perm_id)
            db.add(role_perm)
        
        db.commit()
        
        # Recarregar role com permissões usando selectinload
        role = db.query(Role).options(
            selectinload(Role.role_permissions).joinedload(RolePermission.permission)
        ).filter(Role.id == role_id).first()
        
        # Extrair permissões dos relacionamentos carregados
        permissions_data = []
        for rp in role.role_permissions:
            if rp.permission:
                permissions_data.append(serialize_data(rp.permission))
        
        # Serializar role
        role_dict = serialize_data(role)
        role_dict["permissions"] = permissions_data
        
        return success_response(data=role_dict, request_id=request_id)
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
        logger.error(f"Erro ao atualizar permissões da role {role_id}: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="UPDATE_ERROR",
            message=f"Erro ao atualizar permissões: {str(e)}",
            status_code=500,
            request_id=request_id
        )


# ============== USER ROLES (mantido para compatibilidade) ==============

@router.get("/users/{user_id}", response_model=dict)
def get_user_roles(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Lista roles de um usuário."""
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        return error_response(
            code="USER_NOT_FOUND",
            message="Usuário não encontrado",
            status_code=404
        )
    
    try:
        user_roles = db.query(UserRole).join(Role).filter(UserRole.user_id == user_id).all()
        roles = []
        for ur in user_roles:
            if ur.role:
                roles.append({"id": ur.role.id, "key": ur.role.key, "name": ur.role.name})
    except (ProgrammingError, OperationalError, AttributeError):
        roles = []
    
    return success_response(data={
        "user_id": user_id,
        "roles": roles,
    })


@router.post("/users/{user_id}/assign", status_code=status.HTTP_204_NO_CONTENT)
def assign_role(
    user_id: int,
    data: dict,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_role(ROLE_ADMIN))],
):
    """Atribui uma role a um usuário (apenas ADMIN)."""
    role_id = data.get("role_id")
    if not role_id:
        return error_response(
            code="MISSING_ROLE_ID",
            message="role_id é obrigatório",
            status_code=400
        )
    
    try:
        user = db.query(Usuario).filter(Usuario.id == user_id).first()
        if not user:
            return error_response(
                code="USER_NOT_FOUND",
                message="Usuário não encontrado",
                status_code=404
            )
        
        role = db.query(Role).filter(Role.id == role_id).first()
        if not role:
            return error_response(
                code="ROLE_NOT_FOUND",
                message="Role não encontrada",
                status_code=404
            )
        
        # Verificar se já existe
        existing = db.query(UserRole).filter(
            UserRole.user_id == user_id,
            UserRole.role_id == role_id,
        ).first()
        
        if existing:
            return None
        
        user_role = UserRole(user_id=user_id, role_id=role_id)
        db.add(user_role)
        db.commit()
        return None
    except (ProgrammingError, OperationalError) as e:
        return error_response(
            code="DATABASE_ERROR",
            message="Tabelas de cargos não foram criadas. Execute: alembic upgrade head",
            status_code=500
        )


@router.delete("/users/{user_id}/remove/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_role(
    user_id: int,
    role_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_role(ROLE_ADMIN))],
):
    """Remove uma role de um usuário (apenas ADMIN)."""
    try:
        user_role = db.query(UserRole).filter(
            UserRole.user_id == user_id,
            UserRole.role_id == role_id,
        ).first()
        
        if not user_role:
            return error_response(
                code="USER_ROLE_NOT_FOUND",
                message="Role não atribuída ao usuário",
                status_code=404
            )
        
        db.delete(user_role)
        db.commit()
        return None
    except (ProgrammingError, OperationalError) as e:
        return error_response(
            code="DATABASE_ERROR",
            message="Tabelas de cargos não foram criadas. Execute: alembic upgrade head",
            status_code=500
        )
