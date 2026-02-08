"""
Middleware para adicionar request_id a cada requisição.
"""
import uuid
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import logging

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




