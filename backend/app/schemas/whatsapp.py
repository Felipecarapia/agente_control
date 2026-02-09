import uuid
from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class WhatsAppConnectionBase(BaseModel):
    name: str
    phone_number: Optional[str] = None
    provider: str = "evolution"  # "evolution" | "official"
    api_url: str
    api_key: str
    instance_name: Optional[str] = None
    webhook_url: Optional[str] = None


class WhatsAppConnectionCreate(WhatsAppConnectionBase):
    pass


class WhatsAppConnectionUpdate(BaseModel):
    name: Optional[str] = None
    phone_number: Optional[str] = None
    provider: Optional[str] = None
    api_url: Optional[str] = None
    api_key: Optional[str] = None
    instance_name: Optional[str] = None
    webhook_url: Optional[str] = None


class WhatsAppConnectionResponse(WhatsAppConnectionBase):
    id: uuid.UUID
    status: str = "disconnected"
    created_by_user_id: Optional[uuid.UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WhatsAppConnectionStatusResponse(BaseModel):
    id: uuid.UUID
    status: str
    instance_name: Optional[str] = None
    phone_number: Optional[str] = None


class WhatsAppQRCodeResponse(BaseModel):
    qr_code: Optional[str] = None  # Base64 do QR code
    status: str
    message: str


class WhatsAppWebhookPayload(BaseModel):
    """Payload recebido do webhook da Evolution API / Oficial"""
    instance: Optional[str] = None
    event: Optional[str] = None
    data: Optional[dict] = None
