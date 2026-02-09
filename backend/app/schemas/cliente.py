import uuid
from datetime import datetime
from pydantic import BaseModel


class ClienteBase(BaseModel):
    tipo: str = "pf"  # pf | pj
    nome: str
    razao_social: str | None = None
    cpf: str | None = None
    cnpj: str | None = None
    rg: str | None = None
    inscricao_estadual: str | None = None
    email: str | None = None
    telefone: str | None = None
    celular: str | None = None
    cep: str | None = None
    endereco: str | None = None
    numero: str | None = None
    complemento: str | None = None
    bairro: str | None = None
    cidade: str | None = None
    estado: str | None = None
    logo_url: str | None = None


class ClienteCreate(ClienteBase):
    pass


class ClienteUpdate(BaseModel):
    tipo: str | None = None
    nome: str | None = None
    razao_social: str | None = None
    cpf: str | None = None
    cnpj: str | None = None
    rg: str | None = None
    inscricao_estadual: str | None = None
    email: str | None = None
    telefone: str | None = None
    celular: str | None = None
    cep: str | None = None
    endereco: str | None = None
    numero: str | None = None
    complemento: str | None = None
    bairro: str | None = None
    cidade: str | None = None
    estado: str | None = None
    logo_url: str | None = None


class ClienteResponse(ClienteBase):
    id: uuid.UUID
    usuario_id: uuid.UUID | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
