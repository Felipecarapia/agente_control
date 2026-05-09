from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.response import success_response, error_response
from app.core.security import verify_password, get_password_hash, create_access_token, decode_token
from app.models.usuario import Usuario
from app.models.role import UserRole, Role
from app.schemas.auth import LoginRequest, TokenResponse, RegisterRequest
from app.schemas.usuario import UsuarioResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    try:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"TENTATIVA DE LOGIN - Email: {data.email}")
        
        user = db.query(Usuario).filter(Usuario.email == data.email).first()
        if not user:
            logger.warning(f"Usuário não encontrado: {data.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou senha inválidos",
            )
        
        if not verify_password(data.password, user.hashed_password):
            logger.warning(f"Senha incorreta para usuário: {data.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou senha inválidos",
            )

        if not user.ativo:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário inativo",
            )
        token = create_access_token(subject=user.id, tenant_id=user.tenant_id)
        return TokenResponse(access_token=token)
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erro no login: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro interno do servidor: {str(e)}",
        )


@router.get("/me")
def get_current_user_info(
    request: Request,
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Retorna informações do usuário atual logado."""
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Buscar roles do usuário
        roles = []
        try:
            user_roles = db.query(UserRole).join(Role).filter(UserRole.user_id == current_user.id).all()
            for ur in user_roles:
                if ur.role:
                    roles.append({"id": ur.role.id, "key": ur.role.key, "name": ur.role.name})
        except Exception:
            # Se houver erro ao buscar roles (tabela não existe), retornar sem roles (não quebrar)
            roles = []
        
        # Retornar usuário com roles e perfil
        user_data = {
            "id": current_user.id,
            "email": current_user.email,
            "nome": current_user.nome,
            "ativo": current_user.ativo,
            "avatar_url": current_user.avatar_url,
            "bio": current_user.bio,
            "phone": current_user.phone,
            "presence_status": current_user.presence_status,
            "notification_prefs": current_user.notification_prefs,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
            "updated_at": current_user.updated_at.isoformat() if current_user.updated_at else None,
            "roles": roles,
        }
        
        return success_response(data=user_data, request_id=request_id)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erro ao buscar informações do usuário: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="INTERNAL_ERROR",
            message="Erro ao buscar informações do usuário",
            status_code=500,
            request_id=request_id
        )


@router.post("/register", response_model=TokenResponse)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(Usuario).filter(Usuario.email == data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado",
        )
    user = Usuario(
        email=data.email,
        hashed_password=get_password_hash(data.password),
        nome=data.nome,
        ativo=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(subject=user.id, tenant_id=user.tenant_id)
    return TokenResponse(access_token=token)
