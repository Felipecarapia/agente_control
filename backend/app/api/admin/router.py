from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.models.tenant import Tenant, PlanType
from app.models.usuario import Usuario
from app.core.security import get_password_hash

router = APIRouter(prefix="/admin/onboarding", tags=["Admin/Onboarding"])

class OnboardingRequest(BaseModel):
    nome_negocio: str
    admin_email: EmailStr
    admin_password: str
    admin_nome: str
    openai_api_key: Optional[str] = None
    system_prompt: Optional[str] = "Você é a Sofia, uma assistente virtual inteligente focada em conversão de leads."
    evolution_instance_name: Optional[str] = None
    evolution_api_key: Optional[str] = None
    evolution_api_url: Optional[str] = None

@router.post("/setup-first-tenant")
def setup_first_tenant(data: OnboardingRequest, db: Session = Depends(get_db)):
    """
    Rota de onboarding inicial para cadastrar o primeiro cliente (Tenant) 
    e seu administrador no novo sistema multi-tenant.
    """
    # 1. Verificar se já existe o inquilino
    existing_tenant = db.query(Tenant).filter(Tenant.nome_negocio == data.nome_negocio).first()
    if existing_tenant:
        raise HTTPException(status_code=400, detail="Este negócio já está cadastrado.")

    # 2. Criar o Tenant
    new_tenant = Tenant(
        nome_negocio=data.nome_negocio,
        plano=PlanType.PRO,
        llm_model="gpt-4o-mini",
        system_prompt=data.system_prompt,
        openai_api_key=data.openai_api_key,
        evolution_api_url=data.evolution_api_url,
        evolution_api_key=data.evolution_api_key,
        evolution_instance_name=data.evolution_instance_name
    )
    db.add(new_tenant)
    db.flush()

    # 3. Criar o Usuário Administrador
    hashed_pwd = get_password_hash(data.admin_password)
    new_user = Usuario(
        tenant_id=new_tenant.id,
        email=data.admin_email,
        hashed_password=hashed_pwd,
        nome=data.admin_nome,
        ativo=True
    )
    db.add(new_user)
    
    db.commit()
    db.refresh(new_tenant)

    return {
        "status": "success",
        "message": "Sistema inicializado com sucesso para o primeiro Tenant.",
        "tenant_id": str(new_tenant.id),
        "admin_user": data.admin_email
    }
