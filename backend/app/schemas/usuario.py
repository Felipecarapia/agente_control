from datetime import datetime
from pydantic import BaseModel, EmailStr


class UsuarioBase(BaseModel):
    email: EmailStr
    nome: str
    ativo: bool = True


class UsuarioCreate(UsuarioBase):
    password: str


class UsuarioUpdate(BaseModel):
    email: EmailStr | None = None
    nome: str | None = None
    ativo: bool | None = None
    password: str | None = None


class UsuarioResponse(UsuarioBase):
    id: int
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
