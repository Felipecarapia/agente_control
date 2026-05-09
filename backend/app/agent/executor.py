import logging
from typing import List, Dict, Any
from app.core.context import get_current_tenant_id
from app.core.database import SessionLocal
from app.models.tenant import Tenant
from app.services.openai_agent import OpenAIAgentService
from app.core.config import settings

logger = logging.getLogger(__name__)

class AgentExecutor:
    """
    Executor central que gerencia a inteligência de cada Tenant.
    Puxa configurações (Modelos, Keys, Prompts) dinamicamente.
    """
    
    def __init__(self, tenant_id=None):
        self._tenant_id = tenant_id or get_current_tenant_id()
        self._tenant_data = None

    def _get_tenant_config(self):
        if self._tenant_data:
            return self._tenant_data
        
        if not self._tenant_id:
            logger.warning("AgentExecutor chamado sem tenant_id no contexto.")
            return None

        db = SessionLocal()
        try:
            tenant = db.query(Tenant).filter(Tenant.id == self._tenant_id).first()
            if tenant:
                self._tenant_data = {
                    "openai_api_key": tenant.openai_api_key or settings.OPENAI_API_KEY,
                    "system_prompt": tenant.system_prompt,
                    "llm_model": tenant.llm_model or "gpt-4o-mini",
                    "google_calendar_token": tenant.google_calendar_token
                }
            return self._tenant_data
        finally:
            db.close()

    async def run_chat(self, messages: List[Dict[str, str]], **kwargs):
        config = self._get_tenant_config()
        if not config:
            raise ValueError("Configuração do Tenant não encontrada.")

        svc = OpenAIAgentService(api_key=config["openai_api_key"])
        
        # Injeta o System Prompt do Tenant se não for passado explicitamente
        if not any(m["role"] == "system" for m in messages):
            messages.insert(0, {"role": "system", "content": config["system_prompt"]})

        return await svc.create_chat_completion(
            messages=messages,
            model=config["llm_model"],
            **kwargs
        )
