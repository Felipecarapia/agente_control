from datetime import datetime
from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from app.models.notificacao import Notification, NotificationRecipient, NotificationType, NotificationPriority
from app.models.mensagem import AuditEvent
from app.schemas.notificacao import NotificationCreate


def create_notification(
    db: Session,
    data: NotificationCreate,
    author_user_id: Optional[int] = None,
    request_ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Notification:
    """Cria uma notificação e seus recipients."""
    notification = Notification(
        type=data.type,
        title=data.title,
        body=data.body,
        priority=data.priority,
        author_user_id=author_user_id,
        context_type=data.context_type,
        context_id=data.context_id,
        action_url=data.action_url,
        extra_data=data.metadata,  # Schema usa metadata, modelo usa extra_data
    )
    db.add(notification)
    db.flush()

    # Criar recipients
    for user_id in data.recipient_user_ids:
        recipient = NotificationRecipient(
            notification_id=notification.id,
            recipient_user_id=user_id,
        )
        db.add(recipient)

    # Audit
    if author_user_id:
        for user_id in data.recipient_user_ids:
            audit = AuditEvent(
                event_type="NOTIFICATION_SENT",
                actor_user_id=author_user_id,
                target_user_id=user_id,
                context_type=data.context_type,
                context_id=data.context_id,
                payload=f'{{"notification_id": "{notification.id}", "type": "{data.type}"}}',
                ip_address=request_ip,
                user_agent=user_agent,
            )
            db.add(audit)

    db.commit()
    db.refresh(notification)
    return notification


def get_user_notifications(
    db: Session,
    user_id: int,
    unread_only: bool = False,
    notification_type: Optional[NotificationType] = None,
    priority: Optional[NotificationPriority] = None,
    context_type: Optional[str] = None,
    context_id: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
):
    """Lista notificações do usuário com filtros."""
    query = db.query(NotificationRecipient).join(Notification).filter(
        NotificationRecipient.recipient_user_id == user_id,
        NotificationRecipient.archived_at.is_(None),
    )

    if unread_only:
        query = query.filter(NotificationRecipient.read_at.is_(None))

    if notification_type:
        query = query.filter(Notification.type == notification_type)

    if priority:
        query = query.filter(Notification.priority == priority)

    if context_type:
        query = query.filter(Notification.context_type == context_type)

    if context_id:
        query = query.filter(Notification.context_id == context_id)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Notification.title.ilike(search_term),
                Notification.body.ilike(search_term),
            )
        )

    total = query.count()
    items = query.order_by(
        NotificationRecipient.pinned_at.desc().nulls_last(),
        Notification.created_at.desc()
    ).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def get_unread_count(db: Session, user_id: int) -> int:
    """Conta notificações não lidas do usuário."""
    return db.query(NotificationRecipient).filter(
        NotificationRecipient.recipient_user_id == user_id,
        NotificationRecipient.read_at.is_(None),
        NotificationRecipient.archived_at.is_(None),
    ).count()


def mark_as_read(db: Session, recipient_ids: list[int], user_id: int):
    """Marca notificações como lidas."""
    now = datetime.utcnow()
    db.query(NotificationRecipient).filter(
        NotificationRecipient.id.in_(recipient_ids),
        NotificationRecipient.recipient_user_id == user_id,
    ).update({"read_at": now}, synchronize_session=False)
    db.commit()


def mark_notifications_as_read(db: Session, notification_ids: list[UUID], user_id: int):
    """Marca notificações como lidas por notification_id."""
    now = datetime.utcnow()
    db.query(NotificationRecipient).filter(
        NotificationRecipient.notification_id.in_(notification_ids),
        NotificationRecipient.recipient_user_id == user_id,
    ).update({"read_at": now}, synchronize_session=False)
    db.commit()


def archive_notifications(db: Session, recipient_ids: list[int], user_id: int):
    """Arquiva notificações."""
    now = datetime.utcnow()
    db.query(NotificationRecipient).filter(
        NotificationRecipient.id.in_(recipient_ids),
        NotificationRecipient.recipient_user_id == user_id,
    ).update({"archived_at": now}, synchronize_session=False)
    db.commit()


def toggle_pin(db: Session, recipient_id: int, user_id: int) -> bool:
    """Alterna fixação de notificação. Retorna True se fixou, False se desfixou."""
    recipient = db.query(NotificationRecipient).filter(
        NotificationRecipient.id == recipient_id,
        NotificationRecipient.recipient_user_id == user_id,
    ).first()
    if not recipient:
        return False

    if recipient.pinned_at:
        recipient.pinned_at = None
        pinned = False
    else:
        recipient.pinned_at = datetime.utcnow()
        pinned = True

    db.commit()
    return pinned

