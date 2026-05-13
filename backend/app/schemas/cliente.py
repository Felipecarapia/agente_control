from typing import Optional
import uuid
from datetime import datetime
from pydantic import BaseModel


class ClienteBase(BaseModel):
    tipo: str = "pf"  # pf | pj
    nome: str
    razao_social: Optional[str] = None
    cpf: Optional[str] = None
    cnpj: Optional[str] = None
    rg: Optional[str] = None
    inscricao_estadual: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    celular: Optional[str] = None
    cep: Optional[str] = None
    endereco: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    logo_url: Optional[str] = None
    openai_api_key: Optional[str] = None
    plano: str = "basic"


class ClienteCreate(ClienteBase):
    pass


class ClienteUpdate(BaseModel):
    tipo: Optional[str] = None
    nome: Optional[str] = None
    razao_social: Optional[str] = None
    cpf: Optional[str] = None
    cnpj: Optional[str] = None
    rg: Optional[str] = None
    inscricao_estadual: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    celular: Optional[str] = None
    cep: Optional[str] = None
    endereco: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    logo_url: Optional[str] = None
    openai_api_key: Optional[str] = None
    plano: Optional[str] = None


class ClienteResponse(ClienteBase):
    id: uuid.UUID
    usuario_id: Optional[uuid.UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
