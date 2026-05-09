import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# Configura logging ANTES de tudo
logging.basicConfig(
    level=logging.WARNING,
    format="%(levelname)s:     %(name)s - %(message)s",
)

logger = logging.getLogger(__name__)

# Habilita INFO para módulos da aplicação que precisam de logs visíveis
for _mod in (
    "app.api.v1.whatsapp",
    "app.api.v1.leads",
    "app.api.v1.agents",
    "app.api.v1.campaigns",
    "app.services.evolution_api",
    "app.services.openai_agent",
    "app.services.google_search",
):
    logging.getLogger(_mod).setLevel(logging.INFO)

# Log das variáveis de ambiente importantes (sem expor secrets)
# Apenas em modo debug
if os.getenv("DEBUG", "").lower() == "true":
    logger.setLevel(logging.INFO)
    logger.info(f"Starting application...")
    logger.info(f"DATABASE_URL configured: {'Yes' if os.getenv('DATABASE_URL') else 'No'}")
    logger.info(f"PORT: {os.getenv('PORT', 'not set')}")

from app.api.v1 import api_router
from app.core.error_handler import global_exception_handler
from app.core.middleware import RequestIDMiddleware, ContentTypeValidationMiddleware, TenantContextMiddleware
from app.core.bootstrap import bootstrap
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError

app = FastAPI(title="Sistemaxi CRM", version="0.1.0")

# Executar bootstrap automático no startup
@app.on_event("startup")
async def startup_event():
    """Executa bootstrap automático ao iniciar a aplicação."""
    logger.info("Executando bootstrap automático...")
    try:
        bootstrap()
        logger.info("✅ Bootstrap concluído")
    except Exception as e:
        logger.warning(f"⚠️  Erro no bootstrap (pode ser normal se tabelas não existem ainda): {e}")
        
    try:
        from app.services.sofia_agent.workers import start_workers
        import asyncio
        asyncio.create_task(start_workers())
        logger.info("✅ Sofia Agent Workers iniciados")
    except Exception as e:
        logger.error(f"⚠️ Erro ao iniciar Sofia Agent Workers: {e}")

# Adicionar middleware de request_id (deve ser o primeiro)
app.add_middleware(RequestIDMiddleware)

# Adicionar middleware de contexto de Tenant
app.add_middleware(TenantContextMiddleware)

# Adicionar middleware de validação de Content-Type (após request_id)
app.add_middleware(ContentTypeValidationMiddleware)

# Adicionar handler global de exceções
app.add_exception_handler(Exception, global_exception_handler)
app.add_exception_handler(RequestValidationError, global_exception_handler)
app.add_exception_handler(SQLAlchemyError, global_exception_handler)

# CORS - configuração para desenvolvimento e produção
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    # Produção - Railway e Vercel
    "https://sistemaxi-crm-production.up.railway.app",
    "https://*.railway.app",
    "https://*.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, permitir qualquer origem por enquanto
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

# Servir arquivos estáticos (avatars)
upload_dir = Path("uploads")
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/")
def root():
    """Endpoint raiz - health check básico."""
    return {
        "status": "ok",
        "app": "Sistemaxi CRM API",
        "version": "0.1.0",
        "docs": "/docs"
    }


@app.get("/health")
def health():
    """Health check endpoint básico (sem DB)."""
    return {"status": "ok"}

# Health check com DB está em /api/v1/health
