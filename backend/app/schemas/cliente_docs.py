import uuid
from datetime import datetime
from pydantic import BaseModel


# =================== Documento RAG ===================

class DocumentoRAGResponse(BaseModel):
    id: uuid.UUID
    cliente_id: uuid.UUID
    nome_original: str
    url: str
    content_type: str | None = None
    tamanho_bytes: int | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True


# =================== Imagem ===================

class ImagemResponse(BaseModel):
    id: uuid.UUID
    cliente_id: uuid.UUID
    nome_original: str
    url: str
    content_type: str | None = None
    tamanho_bytes: int | None = None
    descricao: str | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class ImagemUpdateDescricao(BaseModel):
    descricao: str | None = None


# =================== Cronograma ===================

class CronogramaItemBase(BaseModel):
    texto: str
    concluido: bool = False
    categoria: str | None = None
    ordem: int = 0


class CronogramaItemCreate(CronogramaItemBase):
    pass


class CronogramaItemUpdate(BaseModel):
    texto: str | None = None
    concluido: bool | None = None
    categoria: str | None = None
    ordem: int | None = None


class CronogramaItemResponse(CronogramaItemBase):
    id: uuid.UUID
    etapa_id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class CronogramaEtapaBase(BaseModel):
    titulo: str
    descricao: str | None = None
    cor: str | None = "blue"
    ordem: int = 0


class CronogramaEtapaCreate(CronogramaEtapaBase):
    itens: list[CronogramaItemCreate] = []


class CronogramaEtapaUpdate(BaseModel):
    titulo: str | None = None
    descricao: str | None = None
    cor: str | None = None
    ordem: int | None = None


class CronogramaEtapaResponse(CronogramaEtapaBase):
    id: uuid.UUID
    cliente_id: uuid.UUID
    itens: list[CronogramaItemResponse] = []
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class CronogramaToggleItem(BaseModel):
    concluido: bool
