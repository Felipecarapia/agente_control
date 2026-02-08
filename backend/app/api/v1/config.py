"""
Endpoints de configuração do sistema.
"""
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
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
    logo_url: str | None = None
    company_name: str | None = None
    primary_color: str | None = None
    secondary_color: str | None = None


@router.get("/empresa")
def get_empresa_config(
    db: Annotated[Session, Depends(get_db)],
):
    """
    Retorna configurações de branding da empresa.
    Endpoint PÚBLICO (sem autenticação) para permitir uso na página de login.
    Por enquanto retorna valores padrão, mas pode ser estendido para buscar do banco.
    """
    # TODO: Buscar do banco quando tabela de configurações for criada
    # Por enquanto, retornar valores padrão
    return success_response(data={
        "logo_url": "https://i.imgur.com/e9Gntop.png",
        "company_name": "Sistemaxi CRM",
        "primary_color": None,
        "secondary_color": None
    })


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




