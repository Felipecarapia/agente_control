import uuid
from datetime import datetime
from pydantic import BaseModel


# =================== Onboarding ===================

class OnboardingBase(BaseModel):
    quem_somos: str | None = None
    o_que_vendemos: str | None = None
    para_quem_vendemos: str | None = None
    diferenciais: str | None = None
    perguntas_frequentes: str | None = None
    logo_url: str | None = None
    fotos_urls: str | None = None  # JSON array string
    redes_sociais: str | None = None  # JSON object string
    conteudo_base_site: str | None = None
    conteudo_reutilizavel_bot: str | None = None


class OnboardingCreate(OnboardingBase):
    pass


class OnboardingUpdate(OnboardingBase):
    pass


class OnboardingResponse(OnboardingBase):
    id: uuid.UUID
    cliente_id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


# =================== Meta WhatsApp ===================

class MetaWhatsappBase(BaseModel):
    nome_aplicativo: str | None = None
    numero_oficial: str | None = None
    token_acesso: str | None = None
    business_manager_id: str | None = None


class MetaWhatsappCreate(MetaWhatsappBase):
    pass


class MetaWhatsappUpdate(MetaWhatsappBase):
    pass


class MetaWhatsappResponse(MetaWhatsappBase):
    id: uuid.UUID
    cliente_id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


# =================== Contato Operacional ===================

class ContatoOperacionalBase(BaseModel):
    nome: str
    cargo: str | None = None
    email: str | None = None
    telefone: str | None = None
    observacao: str | None = None


class ContatoOperacionalCreate(ContatoOperacionalBase):
    pass


class ContatoOperacionalUpdate(BaseModel):
    nome: str | None = None
    cargo: str | None = None
    email: str | None = None
    telefone: str | None = None
    observacao: str | None = None


class ContatoOperacionalResponse(ContatoOperacionalBase):
    id: uuid.UUID
    cliente_id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
