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
    id: int
    pre_proposal_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PrePropostaBase(BaseModel):
    client_id: int
    deal_id: Optional[int] = None
    status: str = "draft"  # draft, submitted, converted, archived


class PrePropostaCreate(PrePropostaBase):
    pass


class PrePropostaUpdate(BaseModel):
    status: Optional[str] = None
    deal_id: Optional[int] = None


class PrePropostaResponse(PrePropostaBase):
    id: int
    score_total: Optional[int] = None
    temperature: Optional[str] = None
    summary: Optional[str] = None
    recommendations: Optional[dict[str, Any]] = None
    created_by_user_id: Optional[int] = None
    updated_by_user_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    answers: list[PrePropostaAnswerResponse] = []

    class Config:
        from_attributes = True


class PrePropostaSubmitResponse(BaseModel):
    id: int
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




