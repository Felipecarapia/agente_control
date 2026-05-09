"""
Middleware para adicionar request_id a cada requisição e validar Content-Type.
"""
import uuid
import logging
from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.context import set_current_tenant_id
from app.core.security import decode_token

logger = logging.getLogger(__name__)


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Middleware que adiciona um request_id único a cada requisição."""
    
    async def dispatch(self, request: Request, call_next):
        # Gerar request_id único
        request_id = str(uuid.uuid4())
        
        # Adicionar ao state da requisição
        request.state.request_id = request_id
        
        # Adicionar ao header da resposta
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        
        return response


class ContentTypeValidationMiddleware(BaseHTTPMiddleware):
    """
    Middleware que valida Content-Type para métodos mutáveis (POST/PATCH/PUT).
    Retorna 415 se Content-Type não for application/json (exceto para uploads).
    """
    
    async def dispatch(self, request: Request, call_next):
        # Métodos que requerem JSON
        mutating_methods = {"POST", "PATCH", "PUT"}
        
        if request.method in mutating_methods:
            # Exceções: uploads, webhooks, etc
            path = request.url.path
            is_upload = any(keyword in path for keyword in ["upload", "file", "image", "avatar"])
            is_webhook = "webhook" in path
            
            if not (is_upload or is_webhook):
                content_type = request.headers.get("content-type", "").lower()
                
                # Verificar se é JSON
                if not content_type.startswith("application/json"):
                    request_id = getattr(request.state, "request_id", None)
                    return JSONResponse(
                        status_code=415,
                        content={
                            "ok": False,
                            "error": {
                                "code": "UNSUPPORTED_MEDIA_TYPE",
                                "message": "Content-Type deve ser application/json",
                                "request_id": request_id
                            },
                            "requestId": request_id
                        },
                        headers={"X-Request-ID": request_id} if request_id else {}
                    )
        
        response = await call_next(request)
        return response


class TenantContextMiddleware(BaseHTTPMiddleware):
    """
    Middleware que extrai o tenant_id do JWT e define no ContextVar.
    Isso permite que qualquer parte do código acesse o tenant_id sem passá-lo explicitamente.
    """
    
    async def dispatch(self, request: Request, call_next):
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "")
            payload = decode_token(token)
            if payload and "tenant_id" in payload:
                tenant_id = payload["tenant_id"]
                # Definir no ContextVar
                set_current_tenant_id(tenant_id)
                logger.debug(f"Contexto definido para Tenant: {tenant_id}")
        
        response = await call_next(request)
        return response
