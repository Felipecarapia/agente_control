import uuid
from typing import Any, Optional, List, Dict
from datetime import datetime
from pydantic import BaseModel


class AIAgentBase(BaseModel):
    name: str
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    system_prompt: str
    provider: str = "openai"  # "openai" | "gemini"
    model: str = "gpt-4o-mini"
    temperature: float = 0.7
    max_tokens: Optional[int] = 1024
    tools_json: Optional[Any] = None
    knowledge_base_json: Optional[Any] = None
    whatsapp_connection_id: Optional[uuid.UUID] = None
    cliente_id: Optional[uuid.UUID] = None
    google_client_id: Optional[str] = None
    google_calendar_id: Optional[str] = None
    is_active: bool = True


class AIAgentCreate(AIAgentBase):
    pass


class AIAgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    system_prompt: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    tools_json: Optional[Any] = None
    knowledge_base_json: Optional[Any] = None
    whatsapp_connection_id: Optional[uuid.UUID] = None
    cliente_id: Optional[uuid.UUID] = None
    google_client_id: Optional[str] = None
    google_calendar_id: Optional[str] = None
    is_active: Optional[bool] = None


class AIAgentResponse(AIAgentBase):
    id: uuid.UUID
    created_by_user_id: Optional[uuid.UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AgentTestRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = None


class AgentTestResponse(BaseModel):
    agent_id: uuid.UUID
    input_message: str
    response: str
    tokens_used: Optional[int] = None


class AgentConversationResponse(BaseModel):
    id: uuid.UUID
    agent_id: uuid.UUID
    external_phone: Optional[str] = None
    channel: str
    status: str
    messages_json: Optional[Any] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None

    class Config:
        from_attributes = True
