from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
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


@router.get("", response_model=dict)
def list_notifications(
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
        item_dict = {
            "id": recipient.id,
            "notification_id": recipient.notification_id,
            "recipient_user_id": recipient.recipient_user_id,
            "delivered_at": recipient.delivered_at,
            "read_at": recipient.read_at,
            "archived_at": recipient.archived_at,
            "pinned_at": recipient.pinned_at,
            "muted": recipient.muted,
            "notification": {
                "id": recipient.notification.id,
                "type": recipient.notification.type,
                "title": recipient.notification.title,
                "body": recipient.notification.body,
                "priority": recipient.notification.priority,
                "author_user_id": recipient.notification.author_user_id,
                "context_type": recipient.notification.context_type,
                "context_id": recipient.notification.context_id,
                "action_url": recipient.notification.action_url,
                "metadata": recipient.notification.extra_data,  # Mapear extra_data para metadata na API
                "created_at": recipient.notification.created_at,
            },
            "author_name": recipient.notification.author.nome if recipient.notification.author else None,
        }
        items.append(item_dict)

    return {
        "items": items,
        "total": result["total"],
        "page": result["page"],
        "page_size": result["page_size"],
    }


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Retorna contagem de notificações não lidas."""
    count = get_unread_count(db, current_user.id)
    return {"count": count}


@router.post("/read", status_code=status.HTTP_204_NO_CONTENT)
def mark_read(
    data: NotificationBulkAction,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Marca notificações como lidas."""
    if data.recipient_ids:
        mark_as_read(db, data.recipient_ids, current_user.id)
    elif data.notification_ids:
        mark_notifications_as_read(db, data.notification_ids, current_user.id)
    else:
        raise HTTPException(status_code=400, detail="Forneça recipient_ids ou notification_ids")


@router.post("/archive", status_code=status.HTTP_204_NO_CONTENT)
def archive(
    data: NotificationBulkAction,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Arquiva notificações."""
    if not data.recipient_ids:
        raise HTTPException(status_code=400, detail="Forneça recipient_ids")
    archive_notifications(db, data.recipient_ids, current_user.id)


@router.post("/pin/{recipient_id}", response_model=dict)
def pin_notification(
    recipient_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Alterna fixação de notificação."""
    pinned = toggle_pin(db, recipient_id, current_user.id)
    return {"pinned": pinned}


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

