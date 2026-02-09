import logging
import secrets
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.storage import get_storage_service
from app.models.proposta import Proposta
from app.models.usuario import Usuario
from app.schemas.proposta import PropostaCreate, PropostaUpdate, PropostaResponse, PropostaPublicResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/propostas", tags=["propostas"])


@router.get("", response_model=list[PropostaResponse])
def list_propostas(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    return db.query(Proposta).all()


@router.get("/public/{slug}", response_model=PropostaPublicResponse)
def get_proposta_public(
    slug: str,
    db: Annotated[Session, Depends(get_db)],
):
    obj = db.query(Proposta).filter(Proposta.slug == slug).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    return PropostaPublicResponse(
        id=obj.id,
        titulo=obj.titulo,
        descricao=obj.descricao,
        valor=obj.valor,
        validade_ate=obj.validade_ate,
        cliente_nome=obj.cliente.nome,
        landing_content=obj.landing_content,
        slug=obj.slug,
    )


@router.post("/{proposta_id}/gerar-slug")
def gerar_slug_proposta(
    proposta_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    obj = db.query(Proposta).filter(Proposta.id == proposta_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    for _ in range(10):
        slug = secrets.token_urlsafe(8).replace("-", "").replace("_", "")[:12]
        if not db.query(Proposta).filter(Proposta.slug == slug).first():
            obj.slug = slug
            db.commit()
            db.refresh(obj)
            return {"slug": slug}
    raise HTTPException(status_code=500, detail="Não foi possível gerar slug único")

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5MB


@router.post("/{proposta_id}/upload")
def upload_proposta_file(
    proposta_id: uuid.UUID,
    file: Annotated[UploadFile, File()],
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Upload de imagem para proposta - salva no S3/MinIO."""
    logger.info(f"[UPLOAD] Iniciando upload para proposta {proposta_id}")
    logger.info(f"[UPLOAD] Arquivo: {file.filename}, Content-Type: {file.content_type}")
    
    obj = db.query(Proposta).filter(Proposta.id == proposta_id).first()
    if not obj:
        logger.warning(f"[UPLOAD] Proposta {proposta_id} não encontrada")
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        logger.warning(f"[UPLOAD] Tipo não permitido: {file.content_type}")
        raise HTTPException(
            status_code=400,
            detail="Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou GIF.",
        )
    
    content = file.file.read()
    logger.info(f"[UPLOAD] Tamanho do arquivo: {len(content)} bytes")
    
    if len(content) > MAX_UPLOAD_BYTES:
        logger.warning(f"[UPLOAD] Arquivo muito grande: {len(content)} bytes")
        raise HTTPException(status_code=400, detail="Arquivo muito grande. Máximo 5MB.")
    
    storage = get_storage_service()
    logger.info(f"[UPLOAD] Storage configurado: {storage.is_configured()}")
    
    if not storage.is_configured():
        logger.error("[UPLOAD] Storage não configurado!")
        raise HTTPException(
            status_code=500,
            detail="Serviço de storage não configurado. Configure as variáveis S3_*.",
        )
    
    # Gera nome único e faz upload
    filename = storage.generate_unique_filename(file.filename or "image.jpg")
    folder = f"propostas/{proposta_id}"
    logger.info(f"[UPLOAD] Destino: {folder}/{filename}")
    
    try:
        url = storage.upload_file(
            file_content=content,
            folder=folder,
            filename=filename,
            content_type=file.content_type or "image/jpeg",
        )
        logger.info(f"[UPLOAD] Sucesso! URL: {url}")
    except Exception as e:
        logger.error(f"[UPLOAD] Erro: {type(e).__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro no upload: {str(e)}")
    
    return {"url": url}


@router.get("/{proposta_id}", response_model=PropostaResponse)
def get_proposta(
    proposta_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    obj = db.query(Proposta).filter(Proposta.id == proposta_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    return obj


@router.post("", response_model=PropostaResponse, status_code=status.HTTP_201_CREATED)
def create_proposta(
    data: PropostaCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    obj = Proposta(**data.model_dump(), usuario_id=current_user.id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/{proposta_id}", response_model=PropostaResponse)
def update_proposta(
    proposta_id: uuid.UUID,
    data: PropostaUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    obj = db.query(Proposta).filter(Proposta.id == proposta_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{proposta_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_proposta(
    proposta_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    obj = db.query(Proposta).filter(Proposta.id == proposta_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    db.delete(obj)
    db.commit()
