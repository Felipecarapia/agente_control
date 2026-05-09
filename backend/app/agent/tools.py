import logging
from app.core.context import get_current_tenant_id
from app.core.database import SessionLocal
from app.models.tenant import Tenant

logger = logging.getLogger(__name__)

def get_tenant_google_token() -> str:
    """
    Ferramenta para recuperar o token do Google Calendar do Tenant atual.
    Usado pelas 'tools' do agente para autenticação descentralizada.
    """
    tenant_id = get_current_tenant_id()
    if not tenant_id:
        return ""
    
    db = SessionLocal()
    try:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        return tenant.google_calendar_token or ""
    finally:
        db.close()

# Exemplo de ferramenta que seria chamada pelo agente
async def list_calendar_events(calendar_id: str = "primary"):
    token = get_tenant_google_token()
    if not token:
        return "Erro: Token do Google Calendar não configurado para este cliente."
    
    # Lógica de chamada à API do Google usando o token...
    logger.info(f"Listando eventos para o token: {token[:10]}...")
    return "Eventos listados com sucesso (simulação)."
