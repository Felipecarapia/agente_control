import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator
from app.models.notificacao import NotificationType, NotificationPriority


class NotificationBase(BaseModel):
    type: NotificationType
    title: str = Field(..., min_length=1, max_length=255)
    body: str = Field(..., min_length=1)
    priority: NotificationPriority = NotificationPriority.NORMAL
    context_type: Optional[str] = Field(None, max_length=50)
    context_id: Optional[str] = Field(None, max_length=255)
    action_url: Optional[str] = None
    metadata: Optional[dict] = None

    @field_validator("body")
    @classmethod
    def validate_body(cls, v: str) -> str:
        if len(v) > 5000:
            raise ValueError("Body muito longo (máximo 5000 caracteres)")
        return v.strip()


class NotificationCreate(NotificationBase):
    recipient_user_ids: list[uuid.UUID] = Field(..., min_length=1)


class NotificationResponse(NotificationBase):
    id: uuid.UUID
    author_user_id: Optional[uuid.UUID] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NotificationRecipientResponse(BaseModel):
    id: uuid.UUID
    notification_id: uuid.UUID
    recipient_user_id: uuid.UUID
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    archived_at: Optional[datetime] = None
    pinned_at: Optional[datetime] = None
    muted: bool = False
    notification: Optional[NotificationResponse] = None

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    id: uuid.UUID
    notification_id: uuid.UUID
    recipient_user_id: uuid.UUID
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    archived_at: Optional[datetime] = None
    pinned_at: Optional[datetime] = None
    muted: bool = False
    notification: NotificationResponse
    author_name: Optional[str] = None

    class Config:
        from_attributes = True


class NotificationBulkAction(BaseModel):
    recipient_ids: Optional[list[uuid.UUID]] = None
    notification_ids: Optional[list[uuid.UUID]] = None


class NotificationFilter(BaseModel):
    unread_only: bool = False
    type: Optional[NotificationType] = None
    priority: Optional[NotificationPriority] = None
    context_type: Optional[str] = None
    context_id: Optional[str] = None
    search: Optional[str] = None
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)


class UnreadCountResponse(BaseModel):
    count: int
