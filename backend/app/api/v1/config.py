"""
Endpoints de configuração do sistema.
"""
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.response import success_response, error_response
from app.core.rbac import require_role, ROLE_ADMIN
from app.models.usuario import Usuario

router = APIRouter(prefix="/config", tags=["config"])


class EmpresaConfigResponse(BaseModel):
    """Configurações da empresa."""
    logo_url: Optional[str] = None
    company_name: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None


@router.get("/empresa")
def get_empresa_config(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
):
    """
    Retorna configurações de branding da empresa.
    Endpoint PÚBLICO (sem autenticação) para permitir uso na página de login.
    Por enquanto retorna valores padrão, mas pode ser estendido para buscar do banco.
    """
    request_id = getattr(request.state, "request_id", None)
    
    # TODO: Buscar do banco quando tabela de configurações for criada
    # Por enquanto, retornar valores padrão
    return success_response(
        data={
            "logo_url": "https://i.imgur.com/e9Gntop.png",
            "company_name": "Sistemaxi CRM",
            "primary_color": None,
            "secondary_color": None
        },
        request_id=request_id
    )


@router.patch("/empresa", response_model=EmpresaConfigResponse)
def update_empresa_config(
    data: EmpresaConfigResponse,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_role(ROLE_ADMIN))],
):
    """
    Atualiza configurações de branding da empresa (apenas ADMIN).
    Por enquanto apenas valida, mas pode ser estendido para salvar no banco.
    """
    # TODO: Salvar no banco quando tabela de configurações for criada
    # Por enquanto, apenas retornar os dados validados
    return success_response(
        data=data,
        status_code=200
    )




