from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.response import success_response, error_response
from app.core.validators import IDValidator
from app.models.contrato import Contrato
from app.models.usuario import Usuario
from app.schemas.contrato import ContratoCreate, ContratoUpdate, ContratoResponse

router = APIRouter(prefix="/contratos", tags=["contratos"])


@router.get("")
def list_contratos(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Lista todos os contratos com relacionamentos carregados.
    Retorna lista vazia se não houver contratos (nunca retorna 500).
    """
    try:
        # Carregar contratos com relacionamentos
        contratos = db.query(Contrato).options(
            joinedload(Contrato.cliente),
            joinedload(Contrato.projeto),
            joinedload(Contrato.proposta)
        ).all()
        
        # Converter para dict para garantir serialização correta
        contratos_data = []
        for c in contratos:
            contrato_dict = {
                "id": c.id,
                "numero": c.numero,
                "proposta_id": c.proposta_id,
                "cliente_id": c.cliente_id,
                "projeto_id": c.projeto_id,
                "valor": str(c.valor) if c.valor else None,  # Converter Decimal para string
                "data_inicio": c.data_inicio.isoformat() if c.data_inicio else None,
                "data_fim": c.data_fim.isoformat() if c.data_fim else None,
                "arquivo_url": c.arquivo_url,
                "status": c.status,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            }
            contratos_data.append(contrato_dict)
        
        return success_response(data=contratos_data)
    except Exception as e:
        # Em caso de erro, retornar lista vazia ao invés de quebrar
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erro ao listar contratos: {e}", exc_info=True)
        return success_response(data=[])


@router.get("/{contrato_id}")
def get_contrato(
    contrato_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    # Validar ID
    if contrato_id <= 0:
        return error_response(
            code="INVALID_ID",
            message="ID do contrato deve ser maior que 0",
            status_code=400
        )
    
    obj = db.query(Contrato).options(
        joinedload(Contrato.cliente),
        joinedload(Contrato.projeto),
        joinedload(Contrato.proposta)
    ).filter(Contrato.id == contrato_id).first()
    
    if not obj:
        return error_response(
            code="CONTRACT_NOT_FOUND",
            message="Contrato não encontrado",
            status_code=404
        )
    
    # Converter para dict
    contrato_dict = {
        "id": obj.id,
        "numero": obj.numero,
        "proposta_id": obj.proposta_id,
        "cliente_id": obj.cliente_id,
        "projeto_id": obj.projeto_id,
        "valor": str(obj.valor) if obj.valor else None,
        "data_inicio": obj.data_inicio.isoformat() if obj.data_inicio else None,
        "data_fim": obj.data_fim.isoformat() if obj.data_fim else None,
        "arquivo_url": obj.arquivo_url,
        "status": obj.status,
        "created_at": obj.created_at.isoformat() if obj.created_at else None,
        "updated_at": obj.updated_at.isoformat() if obj.updated_at else None,
    }
    
    return success_response(data=contrato_dict)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_contrato(
    data: ContratoCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    try:
        obj = Contrato(**data.model_dump())
        db.add(obj)
        db.commit()
        db.refresh(obj)
        
        # Recarregar com relacionamentos
        obj = db.query(Contrato).options(
            joinedload(Contrato.cliente),
            joinedload(Contrato.projeto),
            joinedload(Contrato.proposta)
        ).filter(Contrato.id == obj.id).first()
        
        # Converter para dict
        contrato_dict = {
            "id": obj.id,
            "numero": obj.numero,
            "proposta_id": obj.proposta_id,
            "cliente_id": obj.cliente_id,
            "projeto_id": obj.projeto_id,
            "valor": str(obj.valor) if obj.valor else None,
            "data_inicio": obj.data_inicio.isoformat() if obj.data_inicio else None,
            "data_fim": obj.data_fim.isoformat() if obj.data_fim else None,
            "arquivo_url": obj.arquivo_url,
            "status": obj.status,
            "created_at": obj.created_at.isoformat() if obj.created_at else None,
            "updated_at": obj.updated_at.isoformat() if obj.updated_at else None,
        }
        
        return success_response(data=contrato_dict, status_code=201)
    except Exception as e:
        db.rollback()
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erro ao criar contrato: {e}", exc_info=True)
        return error_response(
            code="CREATE_ERROR",
            message=f"Erro ao criar contrato: {str(e)}",
            status_code=400
        )


@router.patch("/{contrato_id}")
def update_contrato(
    contrato_id: int,
    data: ContratoUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    # Validar ID
    if contrato_id <= 0:
        return error_response(
            code="INVALID_ID",
            message="ID do contrato deve ser maior que 0",
            status_code=400
        )
    
    obj = db.query(Contrato).filter(Contrato.id == contrato_id).first()
    if not obj:
        return error_response(
            code="CONTRACT_NOT_FOUND",
            message="Contrato não encontrado",
            status_code=404
        )
    
    try:
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(obj, k, v)
        db.commit()
        
        # Recarregar com relacionamentos
        obj = db.query(Contrato).options(
            joinedload(Contrato.cliente),
            joinedload(Contrato.projeto),
            joinedload(Contrato.proposta)
        ).filter(Contrato.id == contrato_id).first()
        
        # Converter para dict
        contrato_dict = {
            "id": obj.id,
            "numero": obj.numero,
            "proposta_id": obj.proposta_id,
            "cliente_id": obj.cliente_id,
            "projeto_id": obj.projeto_id,
            "valor": str(obj.valor) if obj.valor else None,
            "data_inicio": obj.data_inicio.isoformat() if obj.data_inicio else None,
            "data_fim": obj.data_fim.isoformat() if obj.data_fim else None,
            "arquivo_url": obj.arquivo_url,
            "status": obj.status,
            "created_at": obj.created_at.isoformat() if obj.created_at else None,
            "updated_at": obj.updated_at.isoformat() if obj.updated_at else None,
        }
        
        return success_response(data=contrato_dict)
    except Exception as e:
        db.rollback()
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erro ao atualizar contrato: {e}", exc_info=True)
        return error_response(
            code="UPDATE_ERROR",
            message=f"Erro ao atualizar contrato: {str(e)}",
            status_code=400
        )


@router.delete("/{contrato_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contrato(
    contrato_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    obj = db.query(Contrato).filter(Contrato.id == contrato_id).first()
    if not obj:
        return error_response(
            code="CONTRACT_NOT_FOUND",
            message="Contrato não encontrado",
            status_code=404
        )
    db.delete(obj)
    db.commit()
