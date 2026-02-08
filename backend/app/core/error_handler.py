"""
Middleware global para tratamento de erros padronizado.
"""
import logging
import os
import traceback
from typing import Any
from fastapi import Request, status, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from pydantic import ValidationError

logger = logging.getLogger(__name__)


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handler global para capturar todas as exceções não tratadas.
    Retorna resposta padronizada: { ok: false, error: { code, message, details? } }
    """
    request_id = getattr(request.state, "request_id", None)
    
    # Log do erro completo SEMPRE (não só em DEBUG)
    is_dev = os.getenv("DEBUG", "").lower() == "true" or os.getenv("ENVIRONMENT", "").lower() == "development"
    logger.error(
        f"Unhandled exception: {type(exc).__name__}: {str(exc)}",
        exc_info=True,
        extra={"request_id": request_id, "path": request.url.path, "method": request.method}
    )
    
    # Determinar código e mensagem baseado no tipo de exceção
    details = None
    
    if isinstance(exc, HTTPException):
        status_code = exc.status_code
        error_code = f"HTTP_{status_code}"
        message = str(exc.detail) if exc.detail else "Erro na requisição"
    elif isinstance(exc, RequestValidationError):
        status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        error_code = "VALIDATION_ERROR"
        message = "Dados de entrada inválidos"
        details = exc.errors()
    elif isinstance(exc, SQLAlchemyError):
        status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        error_code = "DATABASE_ERROR"
        # SEMPRE expor o erro real em desenvolvimento
        is_dev = os.getenv("DEBUG", "").lower() == "true" or os.getenv("ENVIRONMENT", "").lower() == "development"
        if is_dev:
            message = f"Erro ao acessar o banco de dados: {str(exc)}"
            details = {
                "error_type": type(exc).__name__,
                "error_message": str(exc),
                "traceback": traceback.format_exc()
            }
        else:
            message = "Erro ao acessar o banco de dados"
            details = {"error_type": type(exc).__name__}
        logger.error(f"Database error: {exc}", exc_info=True)
    elif isinstance(exc, ValidationError):
        status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        error_code = "VALIDATION_ERROR"
        message = "Erro de validação"
        details = exc.errors()
    else:
        status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        error_code = "INTERNAL_ERROR"
        is_dev = os.getenv("DEBUG", "").lower() == "true" or os.getenv("ENVIRONMENT", "").lower() == "development"
        if is_dev:
            message = f"Erro interno do servidor: {str(exc)}"
            details = {
                "error_type": type(exc).__name__,
                "error_message": str(exc),
                "traceback": traceback.format_exc()
            }
        else:
            message = "Erro interno do servidor"
            details = {"error_type": type(exc).__name__}
        logger.error(f"Unhandled exception: {type(exc).__name__}: {exc}", exc_info=True)
    
    response_data = {
        "ok": False,
        "error": {
            "code": error_code,
            "message": message,
        }
    }
    
    if details:
        response_data["error"]["details"] = details
    
    if request_id:
        response_data["error"]["request_id"] = request_id
    
    return JSONResponse(
        status_code=status_code,
        content=response_data
    )

