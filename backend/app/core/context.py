import contextvars
from typing import Optional
from uuid import UUID

# ContextVar para armazenar o ID do Tenant atual durante a execução de uma request ou tarefa
tenant_id_context: contextvars.ContextVar[Optional[UUID]] = contextvars.ContextVar("tenant_id", default=None)

def get_current_tenant_id() -> Optional[UUID]:
    """Retorna o ID do Tenant do contexto atual."""
    return tenant_id_context.get()

def set_current_tenant_id(tenant_id: Optional[UUID]) -> contextvars.Token:
    """Define o ID do Tenant no contexto atual."""
    return tenant_id_context.set(tenant_id)
