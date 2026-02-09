import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Optional
from pydantic import BaseModel


class ProposalSectionBase(BaseModel):
    section_key: str
    title: str
    content_json: dict[str, Any]
    order_index: int


class ProposalSectionCreate(ProposalSectionBase):
    pass


class ProposalSectionUpdate(BaseModel):
    title: Optional[str] = None
    content_json: Optional[dict[str, Any]] = None
    order_index: Optional[int] = None


class ProposalSectionResponse(ProposalSectionBase):
    id: uuid.UUID
    proposal_id: uuid.UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProposalPricingPlanBase(BaseModel):
    plan_name: str
    plan_summary: Optional[str] = None
    includes_json: list[str]  # Lista de itens incluídos
    timeline_text: Optional[str] = None
    price_cents: int
    payment_terms_text: Optional[str] = None
    is_recommended: bool = False
    is_selected_default: bool = False


class ProposalPricingPlanCreate(ProposalPricingPlanBase):
    pass


class ProposalPricingPlanUpdate(BaseModel):
    plan_name: Optional[str] = None
    plan_summary: Optional[str] = None
    includes_json: Optional[list[str]] = None
    timeline_text: Optional[str] = None
    price_cents: Optional[int] = None
    payment_terms_text: Optional[str] = None
    is_recommended: Optional[bool] = None
    is_selected_default: Optional[bool] = None


class ProposalPricingPlanResponse(ProposalPricingPlanBase):
    id: uuid.UUID
    proposal_id: uuid.UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProposalEnhancedBase(BaseModel):
    titulo: str
    descricao: Optional[str] = None
    cliente_id: uuid.UUID
    projeto_id: Optional[uuid.UUID] = None
    deal_id: Optional[uuid.UUID] = None
    from_pre_proposal_id: Optional[uuid.UUID] = None
    validade_ate: Optional[date] = None
    currency: str = "BRL"
    total_value_cents: Optional[int] = None


class ProposalEnhancedCreate(ProposalEnhancedBase):
    sections: Optional[list[ProposalSectionCreate]] = None
    pricing_plans: Optional[list[ProposalPricingPlanCreate]] = None


class ProposalEnhancedUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    validade_ate: Optional[date] = None
    currency: Optional[str] = None
    total_value_cents: Optional[int] = None
    status: Optional[str] = None


class ProposalEnhancedResponse(ProposalEnhancedBase):
    id: uuid.UUID
    status: str
    public_token: Optional[str] = None
    accepted_at: Optional[datetime] = None
    accepted_by_name: Optional[str] = None
    usuario_id: Optional[uuid.UUID] = None
    updated_by_user_id: Optional[uuid.UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    sections: list[ProposalSectionResponse] = []
    pricing_plans: list[ProposalPricingPlanResponse] = []

    class Config:
        from_attributes = True


class ProposalPublicAcceptRequest(BaseModel):
    name: str
    accept_terms: bool = True


class ProposalPublicAcceptResponse(BaseModel):
    success: bool
    message: str
    proposal_id: uuid.UUID


class ProposalSendEmailRequest(BaseModel):
    to_email: Optional[str] = None  # Se não fornecido, usar email do cliente
    subject: Optional[str] = None  # Se não fornecido, usar título padrão
    message: Optional[str] = None  # Mensagem adicional no e-mail
