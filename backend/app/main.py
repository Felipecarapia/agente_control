import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Configura logging ANTES de tudo
logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s:     %(name)s - %(message)s",
)

logger = logging.getLogger(__name__)

# Log das variáveis de ambiente importantes (sem expor secrets)
logger.info(f"Starting application...")
logger.info(f"DATABASE_URL configured: {'Yes' if os.getenv('DATABASE_URL') else 'No'}")
logger.info(f"PORT: {os.getenv('PORT', 'not set')}")

from app.api.v1 import api_router

app = FastAPI(title="Sistemaxi CRM", version="0.1.0")

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
    """Health check endpoint."""
    return {"status": "ok"}
