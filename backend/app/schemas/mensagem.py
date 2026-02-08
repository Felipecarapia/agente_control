from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator
from app.models.mensagem import ConversationKind


class MessageBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        # Sanitizar: remover HTML básico e limitar tamanho
        v = v.strip()
        if not v:
            raise ValueError("Conteúdo não pode ser vazio")
        return v


class MessageCreate(MessageBase):
    pass


class MessageResponse(MessageBase):
    id: UUID
    conversation_id: UUID
    author_user_id: Optional[int] = None
    created_at: datetime
    edited_at: Optional[datetime] = None
    author_name: Optional[str] = None

    class Config:
        from_attributes = True


class ConversationCreate(BaseModel):
    recipient_user_id: int
    first_message: str = Field(..., min_length=1, max_length=2000)


class ConversationParticipantResponse(BaseModel):
    id: int
    conversation_id: UUID
    user_id: int
    last_read_at: Optional[datetime] = None
    user_name: Optional[str] = None

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    id: UUID
    kind: ConversationKind
    created_by_user_id: Optional[int] = None
    created_at: datetime
    participants: list[ConversationParticipantResponse] = []
    last_message: Optional[MessageResponse] = None
    unread_count: int = 0

    class Config:
        from_attributes = True


class ConversationListResponse(BaseModel):
    id: UUID
    kind: ConversationKind
    created_at: datetime
    other_participant_name: Optional[str] = None
    other_participant_id: Optional[int] = None
    last_message: Optional[MessageResponse] = None
    unread_count: int = 0

    class Config:
        from_attributes = True


class ProjectNudgeRequest(BaseModel):
    recipient_user_ids: list[int] = Field(..., min_length=1)
    preset: str = Field("PENDING_CHECK", pattern="^(PENDING_CHECK|URGENT_UPDATE|STATUS_TODAY)$")
    custom_message: Optional[str] = Field(None, max_length=500)




