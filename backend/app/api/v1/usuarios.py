from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.response import success_response, error_response
from app.core.security import get_password_hash
from app.models.usuario import Usuario
from app.models.role import UserRole, Role
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate, UsuarioResponse

router = APIRouter(prefix="/usuarios", tags=["usuarios"])


@router.get("")
def list_usuarios(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Lista usuários com seus cargos."""
    from sqlalchemy.exc import ProgrammingError, OperationalError
    from app.core.response import success_response
    
    users = db.query(Usuario).all()
    result = []
    
    for user in users:
        roles = []
        # Tentar buscar roles, mas não falhar se as tabelas não existirem
        try:
            user_roles = db.query(UserRole).join(Role).filter(UserRole.user_id == user.id).all()
            for ur in user_roles:
                if ur.role:
                    roles.append({"id": ur.role.id, "key": ur.role.key, "name": ur.role.name})
        except (ProgrammingError, OperationalError, AttributeError):
            # Tabelas não existem ou erro de schema - retornar sem roles
            roles = []
        except Exception:
            # Qualquer outro erro - retornar sem roles
            roles = []
        
        result.append({
            "id": user.id,
            "email": user.email,
            "nome": user.nome,
            "ativo": user.ativo,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None,
            "roles": roles,
        })
    
    return success_response(data=result if result else [])


@router.get("/{usuario_id}", response_model=UsuarioResponse)
def get_usuario(
    usuario_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    user = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not user:
        return error_response(
            code="USER_NOT_FOUND",
            message="Usuário não encontrado",
            status_code=404
        )
    return success_response(data=user)


@router.post("", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def create_usuario(
    data: UsuarioCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    if db.query(Usuario).filter(Usuario.email == data.email).first():
        return error_response(
            code="EMAIL_ALREADY_EXISTS",
            message="Email já cadastrado",
            status_code=400
        )
    user = Usuario(
        email=data.email,
        hashed_password=get_password_hash(data.password),
        nome=data.nome,
        ativo=data.ativo,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return success_response(data=user, status_code=201)


@router.patch("/{usuario_id}", response_model=UsuarioResponse)
def update_usuario(
    usuario_id: int,
    data: UsuarioUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    user = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not user:
        return error_response(
            code="USER_NOT_FOUND",
            message="Usuário não encontrado",
            status_code=404
        )
    update = data.model_dump(exclude_unset=True)
    if "password" in update:
        update["hashed_password"] = get_password_hash(update.pop("password"))
    for k, v in update.items():
        setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return success_response(data=user)


@router.delete("/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_usuario(
    usuario_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    user = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not user:
        return error_response(
            code="USER_NOT_FOUND",
            message="Usuário não encontrado",
            status_code=404
        )
    db.delete(user)
    db.commit()
