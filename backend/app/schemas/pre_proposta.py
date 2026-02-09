import uuid
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel


class PrePropostaAnswerBase(BaseModel):
    step_key: str
    field_key: str
    answer_json: dict[str, Any]
    weight: Optional[int] = None
    score: Optional[int] = None


class PrePropostaAnswerCreate(PrePropostaAnswerBase):
    pass


class PrePropostaAnswerResponse(PrePropostaAnswerBase):
    id: uuid.UUID
    pre_proposal_id: uuid.UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PrePropostaBase(BaseModel):
    client_id: uuid.UUID
    deal_id: Optional[uuid.UUID] = None
    status: str = "draft"  # draft, submitted, converted, archived


class PrePropostaCreate(PrePropostaBase):
    pass


class PrePropostaUpdate(BaseModel):
    status: Optional[str] = None
    deal_id: Optional[uuid.UUID] = None


class PrePropostaResponse(PrePropostaBase):
    id: uuid.UUID
    score_total: Optional[int] = None
    temperature: Optional[str] = None
    summary: Optional[str] = None
    recommendations: Optional[dict[str, Any]] = None
    created_by_user_id: Optional[uuid.UUID] = None
    updated_by_user_id: Optional[uuid.UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    answers: list[PrePropostaAnswerResponse] = []

    class Config:
        from_attributes = True


class PrePropostaSubmitResponse(BaseModel):
    id: uuid.UUID
    status: str
    score_total: int
    temperature: str
    summary: str
    recommendations: dict[str, Any]

    class Config:
        from_attributes = True


class PrePropostaConvertRequest(BaseModel):
    """Request para converter pré-proposta em proposta"""
    proposal_title: Optional[str] = None  # Se não fornecido, usar título padrão
    auto_fill: bool = True  # Preencher proposta com dados do diagnóstico
