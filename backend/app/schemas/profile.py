import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr


class NotificationPrefs(BaseModel):
    toasts: bool = True
    sound: bool = False
    muteCategories: list[str] = []


class ProfileUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=1, max_length=255)
    bio: Optional[str] = Field(None, max_length=160)
    phone: Optional[str] = Field(None, max_length=50)
    presence_status: Optional[str] = Field(None, pattern="^(online|away|busy|offline)$")
    notification_prefs: Optional[NotificationPrefs] = None


class ProfileResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    nome: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    presence_status: Optional[str] = None
    notification_prefs: Optional[Dict[str, Any]] = None
    roles: list[Dict[str, Any]] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AvatarUploadResponse(BaseModel):
    avatar_url: str
    message: str = "Avatar atualizado com sucesso"
