from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.models.tenant import Tenant, PlanType
from app.models.usuario import Usuario
from app.core.security import get_password_hash

router = APIRouter(prefix="/tenants", tags=["Admin/Tenants"])


class TenantCreate(BaseModel):
    nome_negocio: str
    plano: PlanType = PlanType.BASIC
    llm_model: str = "gpt-4o-mini"
    system_prompt: str | None = None
    openai_api_key: str | None = None
    evolution_api_url: str | None = None
    evolution_api_key: str | None = None
    evolution_instance_name: str | None = None
    # Dados do dono do tenant
    admin_email: str
    admin_password: str
    admin_nome: str


class TenantResponse(BaseModel):
    id: UUID
    nome_negocio: str
    plano: PlanType
    evolution_instance_name: str | None
    
    class Config:
        from_attributes = True


@router.post("/", response_model=TenantResponse)
def create_tenant(data: TenantCreate, db: Session = Depends(get_db)):
    """
    Cria um novo Tenant (Cliente SaaS) e seu primeiro usuário Admin.
    """
    # Verificar se o e-mail do admin já existe em toda a base
    existing_user = db.query(Usuario).filter(Usuario.email == data.admin_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe um usuário com esse e-mail na plataforma."
        )

    # 1. Criar o Tenant
    new_tenant = Tenant(
        nome_negocio=data.nome_negocio,
        plano=data.plano,
        llm_model=data.llm_model,
        system_prompt=data.system_prompt,
        openai_api_key=data.openai_api_key,
        evolution_api_url=data.evolution_api_url,
        evolution_api_key=data.evolution_api_key,
        evolution_instance_name=data.evolution_instance_name
    )
    db.add(new_tenant)
    db.flush()

    # 2. Criar o Usuário Dono (Admin) do Tenant
    new_user = Usuario(
        tenant_id=new_tenant.id,
        email=data.admin_email,
        hashed_password=get_password_hash(data.admin_password),
        nome=data.admin_nome,
        ativo=True
    )
    db.add(new_user)
    
    # OBS: O ideal é também atrelar a Role de ADMIN a ele.
    # Mas como as roles são universais, você precisaria adicionar as RolePermissions aqui ou no seed.
    
    db.commit()
    db.refresh(new_tenant)
    
    return new_tenant


@router.get("/", response_model=List[TenantResponse])
def list_tenants(db: Session = Depends(get_db)):
    """Lista todos os Tenants do sistema."""
    return db.query(Tenant).all()
