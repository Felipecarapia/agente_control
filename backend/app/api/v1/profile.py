import os
import uuid
import shutil
from pathlib import Path
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
# PIL importado apenas quando necessário (lazy import)

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.usuario import Usuario
from app.models.mensagem import AuditEvent
from app.schemas.profile import ProfileUpdate, ProfileResponse, AvatarUploadResponse, NotificationPrefs

router = APIRouter(prefix="/profile", tags=["profile"])

# Configuração de upload
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
UPLOAD_DIR_ABS = BASE_DIR / "uploads" / "avatars"
UPLOAD_DIR_ABS.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
AVATAR_SIZE = (256, 256)


def validate_image(file: UploadFile) -> None:
    """Valida tipo e tamanho do arquivo."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de arquivo não permitido. Use: {', '.join(ALLOWED_TYPES)}"
        )
    
    # Verificar tamanho (lendo apenas o necessário)
    file.file.seek(0, os.SEEK_END)
    size = file.file.tell()
    file.file.seek(0)
    
    if size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Arquivo muito grande. Máximo: {MAX_FILE_SIZE / 1024 / 1024:.1f}MB"
        )


def process_avatar(file: UploadFile) -> str:
    """Processa e salva o avatar, retornando a URL."""
    # Lazy import do PIL apenas quando necessário
    try:
        from PIL import Image
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Biblioteca de processamento de imagem não disponível. Instale Pillow."
        )
    
    validate_image(file)
    
    # Gerar nome único
    ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = UPLOAD_DIR_ABS / filename
    
    # Garantir que o diretório existe
    UPLOAD_DIR_ABS.mkdir(parents=True, exist_ok=True)
    
    # Abrir e processar imagem
    try:
        # Resetar posição do arquivo antes de ler
        file.file.seek(0)
        img = Image.open(file.file)
        # Converter para RGB se necessário (para PNG com transparência)
        if img.mode in ("RGBA", "LA", "P"):
            background = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "P":
                img = img.convert("RGBA")
            background.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
            img = background
        elif img.mode != "RGB":
            img = img.convert("RGB")
        
        # Redimensionar e recortar para quadrado (crop centralizado)
        img.thumbnail((AVATAR_SIZE[0] * 2, AVATAR_SIZE[1] * 2), Image.Resampling.LANCZOS)
        width, height = img.size
        size = min(width, height)
        left = (width - size) // 2
        top = (height - size) // 2
        img = img.crop((left, top, left + size, top + size))
        img = img.resize(AVATAR_SIZE, Image.Resampling.LANCZOS)
        
        # Salvar
        img.save(filepath, "JPEG", quality=85, optimize=True)
        
        # Retornar URL relativa (será servida via /uploads/avatars/...)
        return f"/uploads/avatars/{filename}"
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao processar imagem: {str(e)}"
        )


@router.get("/me", response_model=ProfileResponse)
def get_profile(
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Retorna perfil completo do usuário atual."""
    # Buscar roles
    from app.models.role import UserRole, Role
    roles = []
    try:
        user_roles = db.query(UserRole).join(Role).filter(UserRole.user_id == current_user.id).all()
        for ur in user_roles:
            if ur.role:
                roles.append({"id": ur.role.id, "key": ur.role.key, "name": ur.role.name})
    except Exception:
        roles = []
    
    return ProfileResponse(
        id=current_user.id,
        email=current_user.email,
        nome=current_user.nome,
        avatar_url=current_user.avatar_url,
        bio=current_user.bio,
        phone=current_user.phone,
        presence_status=current_user.presence_status,
        notification_prefs=current_user.notification_prefs,
        roles=roles,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
    )


@router.patch("/me", response_model=ProfileResponse)
def update_profile(
    data: ProfileUpdate,
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Atualiza perfil do usuário atual."""
    update_data = data.model_dump(exclude_unset=True, exclude={"notification_prefs"})
    
    # Atualizar campos simples
    for key, value in update_data.items():
        if value is not None:
            setattr(current_user, key, value)
    
    # Atualizar notification_prefs (JSON)
    if data.notification_prefs is not None:
        current_user.notification_prefs = data.notification_prefs.model_dump()
    
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    
    # Registrar auditoria
    try:
        audit = AuditEvent(
            event_type="PROFILE_UPDATED",
            actor_user_id=current_user.id,
            context_type="USER",
            context_id=str(current_user.id),
            payload=f'{{"updated_fields": {list(update_data.keys())}}}',
        )
        db.add(audit)
        db.commit()
    except Exception:
        pass  # Não falhar se audit não existir
    
    # Buscar roles para resposta
    from app.models.role import UserRole, Role
    roles = []
    try:
        user_roles = db.query(UserRole).join(Role).filter(UserRole.user_id == current_user.id).all()
        for ur in user_roles:
            if ur.role:
                roles.append({"id": ur.role.id, "key": ur.role.key, "name": ur.role.name})
    except Exception:
        roles = []
    
    return ProfileResponse(
        id=current_user.id,
        email=current_user.email,
        nome=current_user.nome,
        avatar_url=current_user.avatar_url,
        bio=current_user.bio,
        phone=current_user.phone,
        presence_status=current_user.presence_status,
        notification_prefs=current_user.notification_prefs,
        roles=roles,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
    )


@router.post("/me/avatar", response_model=AvatarUploadResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: Annotated[Usuario, Depends(get_current_user)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
):
    """Faz upload do avatar do usuário."""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Processar e salvar avatar
        avatar_url = process_avatar(file)
        
        # Remover avatar antigo se existir
        if current_user.avatar_url and current_user.avatar_url.startswith("/uploads/avatars/"):
            old_filename = current_user.avatar_url.split("/")[-1]
            old_path = UPLOAD_DIR_ABS / old_filename
            if old_path.exists():
                try:
                    old_path.unlink()
                except Exception as e:
                    logger.warning(f"Erro ao remover avatar antigo: {e}")
        
        # Atualizar no banco
        current_user.avatar_url = avatar_url
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        
        # Registrar auditoria
        try:
            audit = AuditEvent(
                event_type="AVATAR_UPDATED",
                actor_user_id=current_user.id,
                context_type="USER",
                context_id=str(current_user.id),
                payload='{"action": "upload"}',
            )
            db.add(audit)
            db.commit()
        except Exception as e:
            logger.warning(f"Erro ao registrar auditoria: {e}")
        
        return AvatarUploadResponse(avatar_url=avatar_url)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no upload de avatar: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro interno do servidor ao fazer upload: {str(e)}",
        )


@router.delete("/me/avatar", response_model=AvatarUploadResponse)
def delete_avatar(
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Remove avatar do usuário (volta para padrão)."""
    # Remover arquivo se existir
    if current_user.avatar_url and current_user.avatar_url.startswith("/uploads/avatars/"):
        old_filename = current_user.avatar_url.split("/")[-1]
        old_path = UPLOAD_DIR_ABS / old_filename
        if old_path.exists():
            try:
                old_path.unlink()
            except Exception:
                pass
    
    # Limpar no banco
    current_user.avatar_url = None
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    
    # Registrar auditoria
    try:
        audit = AuditEvent(
            event_type="AVATAR_UPDATED",
            actor_user_id=current_user.id,
            context_type="USER",
            context_id=str(current_user.id),
            payload='{"action": "delete"}',
        )
        db.add(audit)
        db.commit()
    except Exception:
        pass
    
    return AvatarUploadResponse(avatar_url="", message="Avatar removido com sucesso")

