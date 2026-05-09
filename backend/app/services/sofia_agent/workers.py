import asyncio
import logging
from datetime import datetime, timedelta, timezone
from app.core.database import SessionLocal
from app.models.lead import Lead
from app.models.tenant import Tenant
from app.services.evolution_api import EvolutionAPIService
from app.services.sofia_agent.crud import update_lead_status

logger = logging.getLogger(__name__)

def get_evolution_client(tenant: Tenant):
    api_key = tenant.evolution_api_key
    api_url = tenant.evolution_api_url
    if not api_key or not api_url:
        return None
    return EvolutionAPIService(api_url, api_key)

async def handoff_worker():
    """Worker re-activates leads from human handoff after timeout."""
    logger.info("🚀 Motor de Reativação de Handoff Iniciado")
    while True:
        try:
            db = SessionLocal()
            try:
                # Buscamos leads em Em_atendimento_humano
                leads_to_reactivate = db.query(Lead).filter(Lead.status == "Em_atendimento_humano").all()
                now = datetime.now(timezone.utc)
                for lead in leads_to_reactivate:
                    tenant = lead.tenant
                    if not tenant:
                        continue
                        
                    # Verifica timeout (padrão 24h)
                    timeout = getattr(tenant, "handoff_timeout_hours", 24)
                    
                    last_msg_at = lead.ultimo_contato
                    if last_msg_at and last_msg_at.tzinfo is None:
                        last_msg_at = last_msg_at.replace(tzinfo=timezone.utc)
                    
                    if last_msg_at and last_msg_at + timedelta(hours=timeout) <= now:
                        logger.info(f"🔄 Reativando robô para lead {lead.id} (timeout expirado)")
                        lead.status = "novo" # sistemavitus status default
                db.commit()
            finally:
                db.close()
        except Exception as e:
            logger.error(f"❌ Erro no Worker de Handoff: {e}")
        await asyncio.sleep(600) # Check every 10 mins

async def start_workers():
    """Starts all background workers."""
    try:
        from app.services.sofia_agent.premium_worker import start_premium_worker
        asyncio.create_task(start_premium_worker())
    except ImportError:
        pass
    except Exception as e:
        logger.error(f"Erro ao iniciar premium worker: {e}")
        
    asyncio.create_task(handoff_worker())
