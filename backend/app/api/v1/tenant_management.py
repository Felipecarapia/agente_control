from typing import Annotated, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.response import success_response, error_response, serialize_data
from app.core.rbac import require_role, ROLE_ADMIN
from app.core.plans import PLAN_FEATURES, PLAN_LIMITS
from app.models.tenant import Tenant
from app.models.usuario import Usuario

router = APIRouter(prefix="/tenant", tags=["tenant"])


class TenantSelfUpdate(BaseModel):
    nome_negocio: Optional[str] = None
    site_url: Optional[str] = None
    llm_model: Optional[str] = None
    system_prompt: Optional[str] = None
    evolution_api_url: Optional[str] = None
    evolution_api_key: Optional[str] = None
    evolution_instance_name: Optional[str] = None


@router.get("/me")
def get_my_tenant(
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        return error_response(code="TENANT_NOT_FOUND", message="Tenant não encontrado", status_code=404)

    tenant_data = serialize_data(tenant)
    tenant_data["features"] = sorted(list(PLAN_FEATURES.get(str(tenant.plano), set())))
    tenant_data["limits"] = PLAN_LIMITS.get(str(tenant.plano), {})
    return success_response(data=tenant_data)


@router.patch("/me")
def update_my_tenant(
    data: TenantSelfUpdate,
    current_user: Annotated[Usuario, Depends(require_role(ROLE_ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        return error_response(code="TENANT_NOT_FOUND", message="Tenant não encontrado", status_code=404)

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(tenant, key, value)
    db.commit()
    db.refresh(tenant)
    return success_response(data=serialize_data(tenant))
