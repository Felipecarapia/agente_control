import logging
import uuid
from typing import Annotated, Optional
from datetime import date
from pydantic import ValidationError

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.response import success_response, error_response, serialize_data
from app.models.contrato import Contrato
from app.models.usuario import Usuario
from app.models.cliente import Cliente
from app.models.projeto import Projeto
from app.models.proposta import Proposta
from app.schemas.contrato import ContratoCreate, ContratoUpdate, ContratoResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/contratos", tags=["contratos"])

# Status válidos (defaults)
VALID_STATUSES = ["draft", "active", "expired", "canceled"]


@router.get("")
def list_contratos(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Lista todos os contratos com relacionamentos carregados.
    Retorna sempre 200 com lista vazia se não houver contratos (nunca retorna 500).
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Carregar contratos com relacionamentos
        contratos = db.query(Contrato).options(
            joinedload(Contrato.cliente),
            joinedload(Contrato.projeto),
            joinedload(Contrato.proposta)
        ).all()
        
        # Converter usando serialize_data para serialização correta (datas/decimal)
        contratos_data = [serialize_data(c) for c in contratos]
        
        return success_response(data=contratos_data if contratos_data else [], request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao listar contratos: {e}", exc_info=True, extra={"request_id": request_id})
        # Em caso de erro, retornar lista vazia ao invés de quebrar
        return success_response(data=[], request_id=request_id)


@router.get("/{contrato_id}")
def get_contrato(
    request: Request,
    contrato_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Obtém um contrato específico.
    Retorna 404 padronizado se contrato não encontrado.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        obj = db.query(Contrato).options(
            joinedload(Contrato.cliente),
            joinedload(Contrato.projeto),
            joinedload(Contrato.proposta)
        ).filter(Contrato.id == contrato_id).first()
        
        if not obj:
            return error_response(
                code="CONTRACT_NOT_FOUND",
                message=f"Contrato com ID {contrato_id} não encontrado",
                status_code=404,
                request_id=request_id
            )
        
        # Converter usando serialize_data para serialização correta
        contrato_dict = serialize_data(obj)
        
        return success_response(data=contrato_dict, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao buscar contrato {contrato_id}: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="INTERNAL_ERROR",
            message="Erro ao buscar contrato",
            status_code=500,
            request_id=request_id
        )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_contrato(
    request: Request,
    data: ContratoCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Cria um novo contrato.
    Valida payload com Pydantic -> 400 com details se inválido.
    Valida status -> 400 se inválido.
    Retorna 404 se cliente/proposta/projeto não encontrado.
    Retorna 409 se contrato duplicado (mesmo número).
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Validação Pydantic já é feita automaticamente pelo FastAPI
        # Validar status
        if data.status and data.status.lower() not in VALID_STATUSES:
            return error_response(
                code="VALIDATION_ERROR",
                message=f"Status inválido. Valores válidos: {', '.join(VALID_STATUSES)}",
                details=[{"loc": ["body", "status"], "msg": f"Status deve ser um de: {', '.join(VALID_STATUSES)}"}],
                status_code=400,
                request_id=request_id
            )
        
        # Verificar se cliente existe
        cliente = db.query(Cliente).filter(Cliente.id == data.cliente_id).first()
        if not cliente:
            return error_response(
                code="CLIENT_NOT_FOUND",
                message=f"Cliente com ID {data.cliente_id} não encontrado",
                status_code=404,
                request_id=request_id
            )
        
        # Verificar se proposta existe (se fornecido)
        if data.proposta_id:
            proposta = db.query(Proposta).filter(Proposta.id == data.proposta_id).first()
            if not proposta:
                return error_response(
                    code="PROPOSAL_NOT_FOUND",
                    message=f"Proposta com ID {data.proposta_id} não encontrada",
                    status_code=404,
                    request_id=request_id
                )
        
        # Verificar se projeto existe (se fornecido)
        if data.projeto_id:
            projeto = db.query(Projeto).filter(Projeto.id == data.projeto_id).first()
            if not projeto:
                return error_response(
                    code="PROJECT_NOT_FOUND",
                    message=f"Projeto com ID {data.projeto_id} não encontrado",
                    status_code=404,
                    request_id=request_id
                )
        
        # Verificar duplicado: mesmo número
        existing = db.query(Contrato).filter(Contrato.numero == data.numero).first()
        if existing:
            return error_response(
                code="CONTRACT_DUPLICATE",
                message=f"Contrato com número '{data.numero}' já existe",
                details={"existing_contract_id": existing.id, "field": "numero"},
                status_code=409,
                request_id=request_id
            )
        
        # Normalizar status (lowercase)
        create_data = data.model_dump()
        if create_data.get("status"):
            create_data["status"] = create_data["status"].lower()
        
        # Criar contrato
        obj = Contrato(**create_data)
        db.add(obj)
        db.commit()
        db.refresh(obj)
        
        # Recarregar com relacionamentos
        obj = db.query(Contrato).options(
            joinedload(Contrato.cliente),
            joinedload(Contrato.projeto),
            joinedload(Contrato.proposta)
        ).filter(Contrato.id == obj.id).first()
        
        # Converter usando serialize_data
        contrato_dict = serialize_data(obj)
        
        return success_response(data=contrato_dict, status_code=status.HTTP_201_CREATED, request_id=request_id)
    except ValidationError as e:
        # Validação Pydantic falhou
        return error_response(
            code="VALIDATION_ERROR",
            message="Dados inválidos",
            details=e.errors(),
            status_code=400,
            request_id=request_id
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao criar contrato: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="CREATE_ERROR",
            message=f"Erro ao criar contrato: {str(e)}",
            status_code=500,
            request_id=request_id
        )


@router.patch("/{contrato_id}")
@router.patch("/{contrato_id}")
def update_contrato(
    request: Request,
    contrato_id: uuid.UUID,
    data: ContratoUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Atualiza um contrato existente.
    Valida payload com Pydantic -> 400 com details se inválido.
    Valida status -> 400 se inválido.
    Retorna 404 se contrato/cliente/proposta/projeto não encontrado.
    Retorna 409 se número duplicado.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        obj = db.query(Contrato).filter(Contrato.id == contrato_id).first()
        if not obj:
            return error_response(
                code="CONTRACT_NOT_FOUND",
                message=f"Contrato com ID {contrato_id} não encontrado",
                status_code=404,
                request_id=request_id
            )
        
        update_data = data.model_dump(exclude_unset=True)
        
        # Validar status (se está sendo atualizado)
        if "status" in update_data and update_data["status"]:
            if update_data["status"].lower() not in VALID_STATUSES:
                return error_response(
                    code="VALIDATION_ERROR",
                    message=f"Status inválido. Valores válidos: {', '.join(VALID_STATUSES)}",
                    details=[{"loc": ["body", "status"], "msg": f"Status deve ser um de: {', '.join(VALID_STATUSES)}"}],
                    status_code=400,
                    request_id=request_id
                )
            update_data["status"] = update_data["status"].lower()
        
        # Verificar duplicados se número está sendo atualizado
        if "numero" in update_data:
            existing = db.query(Contrato).filter(
                Contrato.numero == update_data["numero"],
                Contrato.id != contrato_id
            ).first()
            if existing:
                return error_response(
                    code="CONTRACT_DUPLICATE",
                    message=f"Contrato com número '{update_data['numero']}' já existe",
                    details={"existing_contract_id": existing.id, "field": "numero"},
                    status_code=409,
                    request_id=request_id
                )
        
        # Verificar se cliente existe (se cliente_id está sendo atualizado)
        if "cliente_id" in update_data:
            cliente = db.query(Cliente).filter(Cliente.id == update_data["cliente_id"]).first()
            if not cliente:
                return error_response(
                    code="CLIENT_NOT_FOUND",
                    message=f"Cliente com ID {update_data['cliente_id']} não encontrado",
                    status_code=404,
                    request_id=request_id
                )
        
        # Verificar se proposta existe (se proposta_id está sendo atualizado)
        if "proposta_id" in update_data and update_data["proposta_id"]:
            proposta = db.query(Proposta).filter(Proposta.id == update_data["proposta_id"]).first()
            if not proposta:
                return error_response(
                    code="PROPOSAL_NOT_FOUND",
                    message=f"Proposta com ID {update_data['proposta_id']} não encontrada",
                    status_code=404,
                    request_id=request_id
                )
        
        # Verificar se projeto existe (se projeto_id está sendo atualizado)
        if "projeto_id" in update_data and update_data["projeto_id"]:
            projeto = db.query(Projeto).filter(Projeto.id == update_data["projeto_id"]).first()
            if not projeto:
                return error_response(
                    code="PROJECT_NOT_FOUND",
                    message=f"Projeto com ID {update_data['projeto_id']} não encontrado",
                    status_code=404,
                    request_id=request_id
                )
        
        # Atualizar campos
        for k, v in update_data.items():
            setattr(obj, k, v)
        
        db.commit()
        db.refresh(obj)
        
        # Recarregar com relacionamentos
        obj = db.query(Contrato).options(
            joinedload(Contrato.cliente),
            joinedload(Contrato.projeto),
            joinedload(Contrato.proposta)
        ).filter(Contrato.id == contrato_id).first()
        
        # Converter usando serialize_data
        contrato_dict = serialize_data(obj)
        
        return success_response(data=contrato_dict, request_id=request_id)
    except ValidationError as e:
        # Validação Pydantic falhou
        return error_response(
            code="VALIDATION_ERROR",
            message="Dados inválidos",
            details=e.errors(),
            status_code=400,
            request_id=request_id
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao atualizar contrato {contrato_id}: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="UPDATE_ERROR",
            message=f"Erro ao atualizar contrato: {str(e)}",
            status_code=500,
            request_id=request_id
        )


@router.delete("/{contrato_id}")
@router.delete("/{contrato_id}")
def delete_contrato(
    request: Request,
    contrato_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Deleta um contrato.
    Retorna 404 padronizado se contrato não encontrado.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        obj = db.query(Contrato).filter(Contrato.id == contrato_id).first()
        if not obj:
            return error_response(
                code="CONTRACT_NOT_FOUND",
                message=f"Contrato com ID {contrato_id} não encontrado",
                status_code=404,
                request_id=request_id
            )
        db.delete(obj)
        db.commit()
        return success_response(data={"deleted": True, "contrato_id": contrato_id}, request_id=request_id)
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao deletar contrato {contrato_id}: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="DELETE_ERROR",
            message=f"Erro ao deletar contrato: {str(e)}",
            status_code=500,
            request_id=request_id
        )
