"""
Dependências comuns para endpoints.
"""
from fastapi import Request
from typing import Optional


def get_request_id(request: Request) -> Optional[str]:
    """
    Helper para obter request_id do request state.
    Usar como dependência: request_id: str = Depends(get_request_id)
    """
    return getattr(request.state, "request_id", None)

