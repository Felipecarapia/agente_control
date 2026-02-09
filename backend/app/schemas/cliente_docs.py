from typing import Optional
import uuid
from datetime import datetime
from pydantic import BaseModel


# =================== Documento RAG ===================

class DocumentoRAGResponse(BaseModel):
    id: uuid.UUID
    cliente_id: uuid.UUID
    nome_original: str
    url: str
    content_type: Optional[str] = None
    tamanho_bytes: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# =================== Imagem ===================

class ImagemResponse(BaseModel):
    id: uuid.UUID
    cliente_id: uuid.UUID
    nome_original: str
    url: str
    content_type: Optional[str] = None
    tamanho_bytes: Optional[int] = None
    descricao: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ImagemUpdateDescricao(BaseModel):
    descricao: Optional[str] = None


# =================== Cronograma ===================

class CronogramaItemBase(BaseModel):
    texto: str
    concluido: bool = False
    categoria: Optional[str] = None
    ordem: int = 0


class CronogramaItemCreate(CronogramaItemBase):
    pass


class CronogramaItemUpdate(BaseModel):
    texto: Optional[str] = None
    concluido: Optional[bool] = None
    categoria: Optional[str] = None
    ordem: Optional[int] = None


class CronogramaItemResponse(CronogramaItemBase):
    id: uuid.UUID
    etapa_id: uuid.UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CronogramaEtapaBase(BaseModel):
    titulo: str
    descricao: Optional[str] = None
    cor: Optional[str] = "blue"
    ordem: int = 0


class CronogramaEtapaCreate(CronogramaEtapaBase):
    itens: list[CronogramaItemCreate] = []


class CronogramaEtapaUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    cor: Optional[str] = None
    ordem: Optional[int] = None


class CronogramaEtapaResponse(CronogramaEtapaBase):
    id: uuid.UUID
    cliente_id: uuid.UUID
    itens: list[CronogramaItemResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CronogramaToggleItem(BaseModel):
    concluido: bool
