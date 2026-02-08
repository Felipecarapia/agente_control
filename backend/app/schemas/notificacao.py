from datetime import datetime
from typing import Optional
from uuid import UUID
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
    recipient_user_ids: list[int] = Field(..., min_length=1)


class NotificationResponse(NotificationBase):
    id: UUID
    author_user_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationRecipientResponse(BaseModel):
    id: int
    notification_id: UUID
    recipient_user_id: int
    delivered_at: datetime
    read_at: Optional[datetime] = None
    archived_at: Optional[datetime] = None
    pinned_at: Optional[datetime] = None
    muted: bool = False
    notification: Optional[NotificationResponse] = None

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    id: int
    notification_id: UUID
    recipient_user_id: int
    delivered_at: datetime
    read_at: Optional[datetime] = None
    archived_at: Optional[datetime] = None
    pinned_at: Optional[datetime] = None
    muted: bool = False
    notification: NotificationResponse
    author_name: Optional[str] = None

    class Config:
        from_attributes = True


class NotificationBulkAction(BaseModel):
    recipient_ids: Optional[list[int]] = None
    notification_ids: Optional[list[UUID]] = None


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




