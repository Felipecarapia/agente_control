from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.response import success_response, error_response
# Removida restrição de permissão - qualquer usuário autenticado pode criar notificação
from app.models.usuario import Usuario
from app.models.notificacao import NotificationType, NotificationPriority
from app.schemas.notificacao import (
    NotificationCreate, NotificationListResponse, NotificationBulkAction,
    NotificationFilter, UnreadCountResponse
)
from app.services.notificacao_service import (
    create_notification, get_user_notifications, get_unread_count,
    mark_as_read, mark_notifications_as_read, archive_notifications, toggle_pin
)

router = APIRouter(prefix="/notifications", tags=["notificacoes"])


@router.get("")
def list_notifications(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
    unread_only: bool = Query(False),
    type: Optional[NotificationType] = Query(None, alias="type"),
    priority: Optional[NotificationPriority] = Query(None),
    context_type: Optional[str] = Query(None),
    context_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Lista notificações do usuário autenticado."""
    request_id = getattr(request.state, "request_id", None)
    
    try:
        result = get_user_notifications(
            db=db,
            user_id=current_user.id,
            unread_only=unread_only,
            notification_type=type,
            priority=priority,
            context_type=context_type,
            context_id=context_id,
            search=search,
            page=page,
            page_size=page_size,
        )

        # Adicionar nome do autor
        items = []
        for recipient in result["items"]:
            try:
                item_dict = {
                    "id": recipient.id,
                    "notification_id": str(recipient.notification_id) if recipient.notification_id else None,
                    "recipient_user_id": recipient.recipient_user_id,
                    "delivered_at": recipient.delivered_at.isoformat() if recipient.delivered_at else None,
                    "read_at": recipient.read_at.isoformat() if recipient.read_at else None,
                    "archived_at": recipient.archived_at.isoformat() if recipient.archived_at else None,
                    "pinned_at": recipient.pinned_at.isoformat() if recipient.pinned_at else None,
                    "muted": recipient.muted,
                    "notification": {
                        "id": str(recipient.notification.id) if recipient.notification else None,
                        "type": recipient.notification.type if recipient.notification else None,
                        "title": recipient.notification.title if recipient.notification else None,
                        "body": recipient.notification.body if recipient.notification else None,
                        "priority": recipient.notification.priority if recipient.notification else None,
                        "author_user_id": recipient.notification.author_user_id if recipient.notification else None,
                        "context_type": recipient.notification.context_type if recipient.notification else None,
                        "context_id": recipient.notification.context_id if recipient.notification else None,
                        "action_url": recipient.notification.action_url if recipient.notification else None,
                        "metadata": recipient.notification.extra_data if recipient.notification else None,  # Mapear extra_data para metadata na API
                        "created_at": recipient.notification.created_at.isoformat() if recipient.notification and recipient.notification.created_at else None,
                    },
                    "author_name": recipient.notification.author.nome if recipient.notification and recipient.notification.author else None,
                }
                items.append(item_dict)
            except Exception:
                # Se houver erro ao processar um item, pular (não quebrar toda a lista)
                continue

        return success_response(
            data={
                "items": items,
                "total": result["total"],
                "page": result["page"],
                "page_size": result["page_size"],
            },
            request_id=request_id
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erro ao listar notificações: {e}", exc_info=True, extra={"request_id": request_id})
        # Se tabela não existir ou houver erro, retornar lista vazia (não quebrar)
        return success_response(
            data={
                "items": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
            },
            meta={"requiresSetup": True, "message": "Sistema de notificações não configurado"},
            request_id=request_id
        )


@router.get("/unread-count")
def get_unread_count_endpoint(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Retorna contagem de notificações não lidas."""
    request_id = getattr(request.state, "request_id", None)
    
    try:
        count = get_unread_count(db, current_user.id)
        return success_response(data={"count": count}, request_id=request_id)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erro ao buscar contagem de não lidas: {e}", exc_info=True, extra={"request_id": request_id})
        # Se tabela não existir ou houver erro, retornar 0 (não quebrar)
        return success_response(data={"count": 0}, request_id=request_id)


@router.post("/read")
def mark_read(
    request: Request,
    data: NotificationBulkAction,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Marca notificações como lidas."""
    request_id = getattr(request.state, "request_id", None)
    
    if not data.recipient_ids and not data.notification_ids:
        return error_response(
            code="VALIDATION_ERROR",
            message="Forneça recipient_ids ou notification_ids",
            status_code=400,
            request_id=request_id
        )
    
    try:
        if data.recipient_ids:
            mark_as_read(db, data.recipient_ids, current_user.id)
        elif data.notification_ids:
            mark_notifications_as_read(db, data.notification_ids, current_user.id)
        
        return success_response(
            data={"message": "Notificações marcadas como lidas"},
            status_code=200,
            request_id=request_id
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erro ao marcar notificações como lidas: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="INTERNAL_ERROR",
            message="Erro ao marcar notificações como lidas",
            status_code=500,
            request_id=request_id
        )


@router.post("/archive")
def archive(
    request: Request,
    data: NotificationBulkAction,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Arquiva notificações."""
    request_id = getattr(request.state, "request_id", None)
    
    if not data.recipient_ids:
        return error_response(
            code="VALIDATION_ERROR",
            message="Forneça recipient_ids",
            status_code=400,
            request_id=request_id
        )
    
    try:
        archive_notifications(db, data.recipient_ids, current_user.id)
        return success_response(
            data={"message": "Notificações arquivadas"},
            status_code=200,
            request_id=request_id
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erro ao arquivar notificações: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="INTERNAL_ERROR",
            message="Erro ao arquivar notificações",
            status_code=500,
            request_id=request_id
        )


@router.post("/pin/{recipient_id}")
def pin_notification(
    request: Request,
    recipient_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Alterna fixação de notificação."""
    request_id = getattr(request.state, "request_id", None)
    
    try:
        pinned = toggle_pin(db, recipient_id, current_user.id)
        return success_response(
            data={"pinned": pinned},
            request_id=request_id
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erro ao fixar/desfixar notificação: {e}", exc_info=True, extra={"request_id": request_id})
        return error_response(
            code="INTERNAL_ERROR",
            message="Erro ao fixar/desfixar notificação",
            status_code=500,
            request_id=request_id
        )


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_notification_endpoint(
    data: NotificationCreate,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],  # Removida restrição - qualquer um pode criar notificação
):
    """Cria uma notificação. Qualquer usuário autenticado pode criar notificações."""
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    notification = create_notification(
        db=db,
        data=data,
        author_user_id=current_user.id,
        request_ip=ip_address,
        user_agent=user_agent,
    )

    return {
        "id": str(notification.id),
        "message": "Notificação criada com sucesso",
    }

