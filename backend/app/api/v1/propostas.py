import logging
import secrets
from typing import Annotated, Optional
from pydantic import ValidationError
from datetime import date

from fastapi import APIRouter, Depends, File, Request, UploadFile, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.response import success_response, error_response, serialize_data
from app.core.storage import get_storage_service
from app.models.proposta import Proposta
from app.models.usuario import Usuario
from app.models.cliente import Cliente
from app.models.projeto import Projeto
from app.schemas.proposta import PropostaCreate, PropostaUpdate, PropostaResponse, PropostaPublicResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/propostas", tags=["propostas"])

# Status válidos
VALID_STATUSES = ["rascunho", "enviada", "aceita", "recusada"]


@router.get("")
def list_propostas(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Lista todas as propostas.
    Retorna sempre 200 com lista vazia se não houver propostas (nunca retorna 500).
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        propostas = db.query(Proposta).options(
            joinedload(Proposta.cliente),
            joinedload(Proposta.projeto)
        ).all()
        # Converter usando serialize_data para serialização correta (datas/decimal)
        propostas_data = [serialize_data(p) for p in propostas]
        return success_response(data=propostas_data if propostas_data else [], request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao listar propostas: {e}", exc_info=True, extra={"request_id": request_id})
        # Em caso de erro, retornar lista vazia ao invés de quebrar
        return success_response(data=[], request_id=request_id)


@router.get("/public/{slug}")
def get_proposta_public(
    request: Request,
    slug: str,
    db: Annotated[Session, Depends(get_db)],
):
    """
    Obtém uma proposta pública por slug (sem autenticação).
    Retorna 404 padronizado se proposta não encontrada.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        obj = db.query(Proposta).options(
            joinedload(Proposta.cliente)
        ).filter(Proposta.slug == slug).first()
        if not obj:
            return error_response(
                code="PROPOSAL_NOT_FOUND",
                message=f"Proposta com slug '{slug}' não encontrada",
                status_code=404,
                request_id=request_id
            )
        
        proposta_data = {
            "id": obj.id,
            "titulo": obj.titulo,
            "descricao": obj.descricao,
            "valor": float(obj.valor) if obj.valor else None,
            "validade_ate": obj.validade_ate.isoformat() if obj.validade_ate else None,
            "cliente_nome": obj.cliente.nome if obj.cliente else "",
            "landing_content": obj.landing_content or [],
            "slug": obj.slug,
        }
        return success_response(data=proposta_data, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao buscar proposta pública {slug}: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="INTERNAL_ERROR",
            message="Erro ao buscar proposta",
            status_code=500,
            request_id=request_id
        )


@router.post("/{proposta_id}/gerar-slug")
def gerar_slug_proposta(
    request: Request,
    proposta_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Gera um slug único para a proposta.
    Retorna 404 padronizado se proposta não encontrada.
    """
    request_id = getattr(request.state, "request_id", None)
    
    # Validar ID
    if proposta_id <= 0:
        return error_response(
            code="INVALID_ID",
            message="ID da proposta deve ser maior que 0",
            status_code=400,
            request_id=request_id
        )
    
    try:
        obj = db.query(Proposta).filter(Proposta.id == proposta_id).first()
        if not obj:
            return error_response(
                code="PROPOSAL_NOT_FOUND",
                message=f"Proposta com ID {proposta_id} não encontrada",
                status_code=404,
                request_id=request_id
            )
        
        for _ in range(10):
            slug = secrets.token_urlsafe(8).replace("-", "").replace("_", "")[:12]
            if not db.query(Proposta).filter(Proposta.slug == slug).first():
                obj.slug = slug
                db.commit()
                db.refresh(obj)
                return success_response(data={"slug": slug}, request_id=request_id)
        
        return error_response(
            code="SLUG_GENERATION_FAILED",
            message="Não foi possível gerar slug único após 10 tentativas",
            status_code=500,
            request_id=request_id
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao gerar slug para proposta {proposta_id}: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="INTERNAL_ERROR",
            message=f"Erro ao gerar slug: {str(e)}",
            status_code=500,
            request_id=request_id
        )

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5MB


@router.post("/{proposta_id}/upload")
def upload_proposta_file(
    request: Request,
    proposta_id: int,
    file: Annotated[UploadFile, File()],
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Upload de imagem para proposta - salva no S3/MinIO.
    Retorna 404 padronizado se proposta não encontrada.
    Retorna 400 se tipo de arquivo inválido ou arquivo muito grande.
    """
    request_id = getattr(request.state, "request_id", None)
    
    # Validar ID
    if proposta_id <= 0:
        return error_response(
            code="INVALID_ID",
            message="ID da proposta deve ser maior que 0",
            status_code=400,
            request_id=request_id
        )
    
    logger.info(f"[UPLOAD] Iniciando upload para proposta {proposta_id}", extra={"request_id": request_id})
    logger.info(f"[UPLOAD] Arquivo: {file.filename}, Content-Type: {file.content_type}", extra={"request_id": request_id})
    
    try:
        obj = db.query(Proposta).filter(Proposta.id == proposta_id).first()
        if not obj:
            logger.warning(f"[UPLOAD] Proposta {proposta_id} não encontrada", extra={"request_id": request_id})
            return error_response(
                code="PROPOSAL_NOT_FOUND",
                message=f"Proposta com ID {proposta_id} não encontrada",
                status_code=404,
                request_id=request_id
            )
        
        if file.content_type not in ALLOWED_IMAGE_TYPES:
            logger.warning(f"[UPLOAD] Tipo não permitido: {file.content_type}", extra={"request_id": request_id})
            return error_response(
                code="INVALID_FILE_TYPE",
                message="Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou GIF.",
                details={"allowed_types": list(ALLOWED_IMAGE_TYPES), "received": file.content_type},
                status_code=400,
                request_id=request_id
            )
        
        content = file.file.read()
        logger.info(f"[UPLOAD] Tamanho do arquivo: {len(content)} bytes", extra={"request_id": request_id})
        
        if len(content) > MAX_UPLOAD_BYTES:
            logger.warning(f"[UPLOAD] Arquivo muito grande: {len(content)} bytes", extra={"request_id": request_id})
            return error_response(
                code="FILE_TOO_LARGE",
                message="Arquivo muito grande. Máximo 5MB.",
                details={"max_bytes": MAX_UPLOAD_BYTES, "received_bytes": len(content)},
                status_code=400,
                request_id=request_id
            )
        
        storage = get_storage_service()
        logger.info(f"[UPLOAD] Storage configurado: {storage.is_configured()}", extra={"request_id": request_id})
        
        if not storage.is_configured():
            logger.error("[UPLOAD] Storage não configurado!", extra={"request_id": request_id})
            return error_response(
                code="STORAGE_NOT_CONFIGURED",
                message="Serviço de storage não configurado. Configure as variáveis S3_*.",
                status_code=500,
                request_id=request_id
            )
        
        # Gera nome único e faz upload
        filename = storage.generate_unique_filename(file.filename or "image.jpg")
        folder = f"propostas/{proposta_id}"
        logger.info(f"[UPLOAD] Destino: {folder}/{filename}", extra={"request_id": request_id})
        
        url = storage.upload_file(
            file_content=content,
            folder=folder,
            filename=filename,
            content_type=file.content_type or "image/jpeg",
        )
        logger.info(f"[UPLOAD] Sucesso! URL: {url}", extra={"request_id": request_id})
        
        return success_response(data={"url": url}, request_id=request_id)
    except Exception as e:
        logger.error(f"[UPLOAD] Erro: {type(e).__name__}: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="UPLOAD_ERROR",
            message=f"Erro no upload: {str(e)}",
            status_code=500,
            request_id=request_id
        )


@router.get("/{proposta_id}")
def get_proposta(
    request: Request,
    proposta_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Obtém uma proposta específica.
    Retorna 404 padronizado se proposta não encontrada.
    """
    request_id = getattr(request.state, "request_id", None)
    
    # Validar ID
    if proposta_id <= 0:
        return error_response(
            code="INVALID_ID",
            message="ID da proposta deve ser maior que 0",
            status_code=400,
            request_id=request_id
        )
    
    try:
        obj = db.query(Proposta).options(
            joinedload(Proposta.cliente),
            joinedload(Proposta.projeto)
        ).filter(Proposta.id == proposta_id).first()
        if not obj:
            return error_response(
                code="PROPOSAL_NOT_FOUND",
                message=f"Proposta com ID {proposta_id} não encontrada",
                status_code=404,
                request_id=request_id
            )
        
        proposta_data = serialize_data(obj)
        return success_response(data=proposta_data, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao buscar proposta {proposta_id}: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="INTERNAL_ERROR",
            message="Erro ao buscar proposta",
            status_code=500,
            request_id=request_id
        )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_proposta(
    request: Request,
    data: PropostaCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Cria uma nova proposta.
    Valida payload com Pydantic -> 400 com details se inválido.
    Valida status -> 400 se inválido.
    Retorna 404 se cliente não encontrado.
    Retorna 409 se proposta duplicada (mesmo título + cliente).
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Validação Pydantic já é feita automaticamente pelo FastAPI
        # Validar status
        if data.status and data.status not in VALID_STATUSES:
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
        
        # Verificar duplicado: mesmo título + cliente_id
        existing = db.query(Proposta).filter(
            Proposta.titulo == data.titulo,
            Proposta.cliente_id == data.cliente_id
        ).first()
        if existing:
            return error_response(
                code="PROPOSAL_DUPLICATE",
                message=f"Proposta '{data.titulo}' já existe para este cliente",
                details={"existing_proposal_id": existing.id, "field": "titulo"},
                status_code=409,
                request_id=request_id
            )
        
        # Normalizar status (lowercase)
        create_data = data.model_dump()
        if create_data.get("status"):
            create_data["status"] = create_data["status"].lower()
        
        # Criar proposta
        obj = Proposta(**create_data, usuario_id=current_user.id)
        db.add(obj)
        db.commit()
        db.refresh(obj)
        
        # Recarregar com relacionamentos
        obj = db.query(Proposta).options(
            joinedload(Proposta.cliente),
            joinedload(Proposta.projeto)
        ).filter(Proposta.id == obj.id).first()
        
        proposta_data = serialize_data(obj)
        return success_response(data=proposta_data, status_code=status.HTTP_201_CREATED, request_id=request_id)
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
        logger.error(f"Erro ao criar proposta: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="CREATE_ERROR",
            message=f"Erro ao criar proposta: {str(e)}",
            status_code=500,
            request_id=request_id
        )


@router.patch("/{proposta_id}")
def update_proposta(
    request: Request,
    proposta_id: int,
    data: PropostaUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Atualiza uma proposta existente.
    Valida payload com Pydantic -> 400 com details se inválido.
    Valida status -> 400 se inválido.
    Retorna 404 se proposta/cliente/projeto não encontrado.
    Retorna 409 se título+cliente duplicado.
    """
    request_id = getattr(request.state, "request_id", None)
    
    # Validar ID
    if proposta_id <= 0:
        return error_response(
            code="INVALID_ID",
            message="ID da proposta deve ser maior que 0",
            status_code=400,
            request_id=request_id
        )
    
    try:
        obj = db.query(Proposta).filter(Proposta.id == proposta_id).first()
        if not obj:
            return error_response(
                code="PROPOSAL_NOT_FOUND",
                message=f"Proposta com ID {proposta_id} não encontrada",
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
        
        # Verificar duplicados se título ou cliente_id estão sendo atualizados
        if "titulo" in update_data or "cliente_id" in update_data:
            titulo = update_data.get("titulo", obj.titulo)
            cliente_id = update_data.get("cliente_id", obj.cliente_id)
            existing = db.query(Proposta).filter(
                Proposta.titulo == titulo,
                Proposta.cliente_id == cliente_id,
                Proposta.id != proposta_id
            ).first()
            if existing:
                return error_response(
                    code="PROPOSAL_DUPLICATE",
                    message=f"Proposta '{titulo}' já existe para este cliente",
                    details={"existing_proposal_id": existing.id, "field": "titulo"},
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
        obj = db.query(Proposta).options(
            joinedload(Proposta.cliente),
            joinedload(Proposta.projeto)
        ).filter(Proposta.id == proposta_id).first()
        
        proposta_data = serialize_data(obj)
        return success_response(data=proposta_data, request_id=request_id)
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
        logger.error(f"Erro ao atualizar proposta {proposta_id}: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="UPDATE_ERROR",
            message=f"Erro ao atualizar proposta: {str(e)}",
            status_code=500,
            request_id=request_id
        )


@router.delete("/{proposta_id}")
def delete_proposta(
    request: Request,
    proposta_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Deleta uma proposta.
    Retorna 404 padronizado se proposta não encontrada.
    """
    request_id = getattr(request.state, "request_id", None)
    
    # Validar ID
    if proposta_id <= 0:
        return error_response(
            code="INVALID_ID",
            message="ID da proposta deve ser maior que 0",
            status_code=400,
            request_id=request_id
        )
    
    try:
        obj = db.query(Proposta).filter(Proposta.id == proposta_id).first()
        if not obj:
            return error_response(
                code="PROPOSAL_NOT_FOUND",
                message=f"Proposta com ID {proposta_id} não encontrada",
                status_code=404,
                request_id=request_id
            )
        db.delete(obj)
        db.commit()
        return success_response(data={"deleted": True, "proposta_id": proposta_id}, request_id=request_id)
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao deletar proposta {proposta_id}: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="DELETE_ERROR",
            message=f"Erro ao deletar proposta: {str(e)}",
            status_code=500,
            request_id=request_id
        )
