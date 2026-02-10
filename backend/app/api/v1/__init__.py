from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.usuarios import router as usuarios_router
from app.api.v1.clientes import router as clientes_router
from app.api.v1.projetos import router as projetos_router
from app.api.v1.tarefas import router as tarefas_router
from app.api.v1.propostas import router as propostas_router
from app.api.v1.contratos import router as contratos_router
from app.api.v1.tracking import router as tracking_router
# Módulos novos da main
from app.api.v1.onboarding import router as onboarding_router
from app.api.v1.cliente_docs import router as cliente_docs_router
from app.api.v1.leads import router as leads_router
from app.api.v1.leads_public import router as leads_public_router
# Módulos novos criados localmente
from app.api.v1.notificacoes import router as notificacoes_router
from app.api.v1.mensagens import router as mensagens_router
from app.api.v1.stream import router as stream_router
from app.api.v1.roles import router as roles_router
from app.api.v1.pipelines import router as pipelines_router
from app.api.v1.deals import router as deals_router
from app.api.v1.profile import router as profile_router
from app.api.v1.pre_propostas import router as pre_propostas_router
from app.api.v1.propostas_enhanced import router as propostas_enhanced_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.task_notion import router as task_notion_router
from app.api.v1.health import router as health_router
from app.api.v1.config import router as config_router
# Novos módulos: WhatsApp, Agentes IA, Campanhas
from app.api.v1.whatsapp import router as whatsapp_router
from app.api.v1.agents import router as agents_router
from app.api.v1.campaigns import router as campaigns_router
from app.api.v1.financeiro import router as financeiro_router
from app.api.v1.rh import router as rh_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(usuarios_router)
api_router.include_router(clientes_router)
api_router.include_router(projetos_router)
api_router.include_router(tarefas_router)
api_router.include_router(propostas_router)
api_router.include_router(contratos_router)
api_router.include_router(tracking_router)
# Módulos novos da main
api_router.include_router(onboarding_router)
api_router.include_router(cliente_docs_router)
api_router.include_router(leads_router)
api_router.include_router(leads_public_router)
# Módulos novos criados localmente
api_router.include_router(notificacoes_router)
api_router.include_router(mensagens_router)
api_router.include_router(stream_router)
api_router.include_router(roles_router)
api_router.include_router(pipelines_router)
api_router.include_router(deals_router)
api_router.include_router(profile_router)
api_router.include_router(pre_propostas_router)
api_router.include_router(propostas_enhanced_router)
api_router.include_router(analytics_router)
api_router.include_router(task_notion_router)
api_router.include_router(health_router)
api_router.include_router(config_router)
# Novos módulos
api_router.include_router(whatsapp_router)
api_router.include_router(agents_router)
api_router.include_router(campaigns_router)
api_router.include_router(financeiro_router)
api_router.include_router(rh_router)