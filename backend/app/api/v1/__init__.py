from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.usuarios import router as usuarios_router
from app.api.v1.clientes import router as clientes_router
from app.api.v1.projetos import router as projetos_router
from app.api.v1.tarefas import router as tarefas_router
from app.api.v1.propostas import router as propostas_router
from app.api.v1.contratos import router as contratos_router
from app.api.v1.tracking import router as tracking_router
from app.api.v1.onboarding import router as onboarding_router
from app.api.v1.cliente_docs import router as cliente_docs_router
from app.api.v1.leads import router as leads_router
from app.api.v1.leads_public import router as leads_public_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(usuarios_router)
api_router.include_router(clientes_router)
api_router.include_router(projetos_router)
api_router.include_router(tarefas_router)
api_router.include_router(propostas_router)
api_router.include_router(contratos_router)
api_router.include_router(tracking_router)
api_router.include_router(onboarding_router)
api_router.include_router(cliente_docs_router)
api_router.include_router(leads_router)
api_router.include_router(leads_public_router)
