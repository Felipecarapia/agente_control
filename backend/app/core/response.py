"""
Helper para padronizar respostas da API.
"""
import json
from decimal import Decimal
from typing import Any, Optional
from fastapi import Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel


def json_serializer(obj: Any) -> Any:
    """
    Serializador customizado para tipos não nativos do JSON.
    Converte Decimal, BigInt, DateTime e outros tipos problemáticos.
    """
    from datetime import datetime, date
    
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, int) and obj > 2**53 - 1:  # BigInt que excede JavaScript Number.MAX_SAFE_INTEGER
        return str(obj)
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if hasattr(obj, '__table__'):
        # Objeto SQLAlchemy - converter para dict manualmente
        try:
            result = {}
            for column in obj.__table__.columns:
                value = getattr(obj, column.name, None)
                if value is not None:
                    result[column.name] = json_serializer(value)
            return result
        except:
            # Fallback: usar __dict__
            try:
                return {k: json_serializer(v) for k, v in obj.__dict__.items() if not k.startswith('_')}
            except:
                return str(obj)
    if hasattr(obj, '__dict__'):
        # Outro objeto - tentar converter para dict
        try:
            return {k: json_serializer(v) for k, v in obj.__dict__.items() if not k.startswith('_')}
        except:
            return str(obj)
    if isinstance(obj, (list, tuple)):
        return [json_serializer(item) for item in obj]
    if isinstance(obj, dict):
        return {k: json_serializer(v) for k, v in obj.items()}
    return obj


def serialize_data(data: Any) -> Any:
    """
    Serializa dados garantindo que tipos problemáticos sejam convertidos.
    Pydantic models já são serializáveis, mas objetos SQLAlchemy precisam ser convertidos.
    """
    try:
        # Se for lista de objetos Pydantic, já são serializáveis
        if isinstance(data, list) and len(data) > 0:
            # Verificar se são objetos Pydantic
            if hasattr(data[0], 'model_dump'):
                # Pydantic models - usar model_dump com mode='json' para serializar Decimal corretamente
                result = []
                for item in data:
                    if hasattr(item, 'model_dump'):
                        # Pydantic v2 usa model_dump(mode='json')
                        try:
                            result.append(item.model_dump(mode='json'))
                        except:
                            # Fallback para Pydantic v1 ou erro
                            result.append(item.model_dump())
                    else:
                        result.append(item)
                return result
            # Se for lista de objetos SQLAlchemy, converter para dict
            elif hasattr(data[0], '__table__'):
                # Converter usando Pydantic se possível, senão usar dict
                return [json_serializer(item) for item in data]
        # Se for objeto Pydantic único
        elif hasattr(data, 'model_dump'):
            try:
                return data.model_dump(mode='json')
            except:
                return data.model_dump()
        # Se for objeto SQLAlchemy único
        elif hasattr(data, '__table__'):
            return json_serializer(data)
        # Se for dict ou lista simples, serializar recursivamente
        return json_serializer(data)
    except Exception as e:
        # Se falhar, tentar serialização básica usando jsonable_encoder do FastAPI
        try:
            from fastapi.encoders import jsonable_encoder
            return jsonable_encoder(data)
        except:
            # Último recurso: string representation
            return str(data)


def get_request_id_from_request(request: Optional[Request] = None) -> Optional[str]:
    """Helper para obter request_id de um Request object."""
    if request:
        return getattr(request.state, "request_id", None)
    return None


def success_response(
    data: Any,
    status_code: int = 200,
    meta: Optional[dict] = None,
    request_id: Optional[str] = None,
    request: Optional[Request] = None
) -> JSONResponse:
    """
    Retorna resposta padronizada de sucesso.
    
    Formato: { ok: true, data: ..., meta?: ..., requestId?: ... }
    
    Args:
        data: Dados a serem retornados
        status_code: Código HTTP (padrão: 200)
        meta: Metadados opcionais
        request_id: ID da requisição (opcional, pode ser obtido de request)
        request: Objeto Request do FastAPI (opcional, usado para obter request_id)
    """
    # Obter request_id do request se não fornecido
    if not request_id and request:
        request_id = get_request_id_from_request(request)
    
    # Serializar dados para garantir compatibilidade JSON
    try:
        serialized_data = serialize_data(data)
    except Exception as e:
        # Se falhar serialização, retornar erro
        return error_response(
            code="SERIALIZATION_ERROR",
            message=f"Erro ao serializar resposta: {str(e)}",
            status_code=500,
            request_id=request_id
        )
    
    response_data = {
        "ok": True,
        "data": serialized_data
    }
    
    if meta:
        response_data["meta"] = meta
    
    if request_id:
        response_data["requestId"] = request_id
    
    response = JSONResponse(
        status_code=status_code,
        content=response_data
    )
    
    # Garantir que requestId está no header também
    if request_id:
        response.headers["X-Request-ID"] = request_id
    
    return response


def error_response(
    code: str,
    message: str,
    status_code: int = 400,
    details: Optional[Any] = None,
    request_id: Optional[str] = None,
    request: Optional[Request] = None
) -> JSONResponse:
    """
    Retorna resposta padronizada de erro.
    
    Formato: { ok: false, error: { code, message, details?, request_id? } }
    
    Args:
        code: Código do erro (ex: "NOT_FOUND", "VALIDATION_ERROR")
        message: Mensagem de erro amigável
        status_code: Código HTTP (padrão: 400)
        details: Detalhes adicionais do erro (opcional)
        request_id: ID da requisição (opcional, pode ser obtido de request)
        request: Objeto Request do FastAPI (opcional, usado para obter request_id)
    """
    # Obter request_id do request se não fornecido
    if not request_id and request:
        request_id = get_request_id_from_request(request)
    
    error_data = {
        "code": code,
        "message": message
    }
    
    if details is not None:
        error_data["details"] = details
    
    if request_id:
        error_data["request_id"] = request_id
    
    response_data = {
        "ok": False,
        "error": error_data
    }
    
    if request_id:
        response_data["requestId"] = request_id  # Também no nível raiz para compatibilidade
    
    response = JSONResponse(
        status_code=status_code,
        content=response_data
    )
    
    # Garantir que requestId está no header também
    if request_id:
        response.headers["X-Request-ID"] = request_id
    
    return response

