from typing import Optional
import uuid
from datetime import datetime
from pydantic import BaseModel


# =================== Onboarding ===================

class OnboardingBase(BaseModel):
    quem_somos: Optional[str] = None
    o_que_vendemos: Optional[str] = None
    para_quem_vendemos: Optional[str] = None
    diferenciais: Optional[str] = None
    perguntas_frequentes: Optional[str] = None
    logo_url: Optional[str] = None
    fotos_urls: Optional[str] = None  # JSON array string
    redes_sociais: Optional[str] = None  # JSON object string
    conteudo_base_site: Optional[str] = None
    conteudo_reutilizavel_bot: Optional[str] = None


class OnboardingCreate(OnboardingBase):
    pass


class OnboardingUpdate(OnboardingBase):
    pass


class OnboardingResponse(OnboardingBase):
    id: uuid.UUID
    cliente_id: uuid.UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# =================== Meta WhatsApp ===================

class MetaWhatsappBase(BaseModel):
    nome_aplicativo: Optional[str] = None
    numero_oficial: Optional[str] = None
    token_acesso: Optional[str] = None
    business_manager_id: Optional[str] = None


class MetaWhatsappCreate(MetaWhatsappBase):
    pass


class MetaWhatsappUpdate(MetaWhatsappBase):
    pass


class MetaWhatsappResponse(MetaWhatsappBase):
    id: uuid.UUID
    cliente_id: uuid.UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# =================== Contato Operacional ===================

class ContatoOperacionalBase(BaseModel):
    nome: str
    cargo: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    observacao: Optional[str] = None


class ContatoOperacionalCreate(ContatoOperacionalBase):
    pass


class ContatoOperacionalUpdate(BaseModel):
    nome: Optional[str] = None
    cargo: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    observacao: Optional[str] = None


class ContatoOperacionalResponse(ContatoOperacionalBase):
    id: uuid.UUID
    cliente_id: uuid.UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
