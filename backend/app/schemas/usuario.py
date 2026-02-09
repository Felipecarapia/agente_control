from typing import Optional
import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr


class UsuarioBase(BaseModel):
    email: EmailStr
    nome: str
    ativo: bool = True


class UsuarioCreate(UsuarioBase):
    password: str


class UsuarioUpdate(BaseModel):
    email: Optional[EmailStr] = None
    nome: Optional[str] = None
    ativo: Optional[bool] = None
    password: Optional[str] = None


class UsuarioResponse(UsuarioBase):
    id: uuid.UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
