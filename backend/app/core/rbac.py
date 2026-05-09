from typing import Annotated
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.usuario import Usuario
from app.models.role import Role, UserRole
from app.models.permission import Permission, RolePermission
from app.models.tenant import Tenant
from app.core.plans import PLAN_FEATURES


def get_user_roles(db: Session, user_id: int) -> list[str]:
    """Retorna lista de keys de roles do usuário."""
    user_roles = db.query(UserRole).join(Role).filter(UserRole.user_id == user_id).all()
    return [ur.role.key for ur in user_roles]


def has_role(db: Session, user_id: int, role_key: str) -> bool:
    """Verifica se usuário tem uma role específica."""
    return db.query(UserRole).join(Role).filter(
        UserRole.user_id == user_id,
        Role.key == role_key
    ).first() is not None


def has_any_role(db: Session, user_id: int, role_keys: list[str]) -> bool:
    """Verifica se usuário tem pelo menos uma das roles."""
    return db.query(UserRole).join(Role).filter(
        UserRole.user_id == user_id,
        Role.key.in_(role_keys)
    ).first() is not None


def require_role(role_key: str):
    """Dependency para exigir uma role específica."""
    def _check_role(
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[Usuario, Depends(get_current_user)],
    ) -> Usuario:
        if not has_role(db, current_user.id, role_key):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requer role: {role_key}"
            )
        return current_user
    return _check_role


def require_any_role(role_keys: list[str]):
    """Dependency para exigir pelo menos uma das roles."""
    def _check_roles(
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[Usuario, Depends(get_current_user)],
    ) -> Usuario:
        if not has_any_role(db, current_user.id, role_keys):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requer uma das roles: {', '.join(role_keys)}"
            )
        return current_user
    return _check_roles


# Roles padrão do sistema
ROLE_ADMIN = "ADMIN"
ROLE_PROJECT_MANAGER = "PROJECT_MANAGER"
ROLE_TRAFFIC_MANAGER = "TRAFFIC_MANAGER"
ROLE_MARKETING_MANAGER = "MARKETING_MANAGER"
ROLE_MARKETING = "MARKETING"
ROLE_DEVELOPMENT = "DEVELOPMENT"

# Permissões para enviar nudge e DM
CAN_SEND_NUDGE = [ROLE_ADMIN, ROLE_PROJECT_MANAGER]
CAN_SEND_DM = [ROLE_ADMIN, ROLE_PROJECT_MANAGER]


def has_permission(db: Session, user_id: int, module: str, action: str) -> bool:
    """Verifica se o usuário tem uma permissão específica através de suas roles."""
    # Buscar todas as roles do usuário
    user_roles = db.query(UserRole).join(Role).filter(UserRole.user_id == user_id).all()
    if not user_roles:
        return False
    
    role_ids = [ur.role_id for ur in user_roles]
    
    # Buscar permissão
    permission = db.query(Permission).filter(
        Permission.module == module,
        Permission.action == action
    ).first()
    
    if not permission:
        return False
    
    # Verificar se alguma role do usuário tem essa permissão
    role_permission = db.query(RolePermission).filter(
        RolePermission.role_id.in_(role_ids),
        RolePermission.permission_id == permission.id
    ).first()
    
    return role_permission is not None


def require_permission(module: str, action: str):
    """Dependency para exigir uma permissão específica."""
    def _check_permission(
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[Usuario, Depends(get_current_user)],
    ) -> Usuario:
        if not has_permission(db, current_user.id, module, action):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requer permissão: {module}.{action}"
            )
        return current_user
    return _check_permission


def require_feature(feature_key: str):
    """Dependency para exigir recurso habilitado no plano do tenant."""
    def _check_feature(
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[Usuario, Depends(get_current_user)],
    ) -> Usuario:
        tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tenant não encontrado"
            )

        feature_set = PLAN_FEATURES.get(str(tenant.plano), set())
        if feature_key not in feature_set:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Recurso indisponível no plano atual: {feature_key}"
            )
        return current_user
    return _check_feature
