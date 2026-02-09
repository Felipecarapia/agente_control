from datetime import date, datetime
import uuid
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# ============== Task Database Schemas ==============

class TaskDatabaseBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_default: bool = False


class TaskDatabaseCreate(TaskDatabaseBase):
    pass


class TaskDatabaseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_default: Optional[bool] = None


class TaskDatabaseResponse(TaskDatabaseBase):
    id: int
    created_by_user_id: Optional[uuid.UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============== Task Property Schemas ==============

class TaskPropertyBase(BaseModel):
    key: str
    name: str
    type: str  # TEXT, NUMBER, SELECT, MULTI_SELECT, DATE, PERSON, CHECKBOX, URL
    config_json: Optional[Dict[str, Any]] = None
    order_index: int = 0
    is_required: bool = False


class TaskPropertyCreate(TaskPropertyBase):
    task_database_id: int


class TaskPropertyUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    config_json: Optional[Dict[str, Any]] = None
    order_index: Optional[int] = None
    is_required: Optional[bool] = None


class TaskPropertyResponse(TaskPropertyBase):
    id: int
    task_database_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============== Task Property Value Schemas ==============

class TaskPropertyValueBase(BaseModel):
    property_id: int
    value_json: Optional[Dict[str, Any]] = None


class TaskPropertyValueCreate(TaskPropertyValueBase):
    task_id: int


class TaskPropertyValueUpdate(BaseModel):
    value_json: Optional[Dict[str, Any]] = None


class TaskPropertyValueResponse(TaskPropertyValueBase):
    id: int
    task_id: int
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============== Task View Schemas ==============

class TaskViewBase(BaseModel):
    name: str
    type: str  # LIST, TABLE, KANBAN, CALENDAR, AGENDA
    config_json: Optional[Dict[str, Any]] = None
    is_default: bool = False


class TaskViewCreate(TaskViewBase):
    task_database_id: int


class TaskViewUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    config_json: Optional[Dict[str, Any]] = None
    is_default: Optional[bool] = None


class TaskViewResponse(TaskViewBase):
    id: int
    task_database_id: int
    user_id: uuid.UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============== Task Block Schemas ==============

class TaskBlockBase(BaseModel):
    type: str  # PARAGRAPH, HEADING, BULLET_LIST, CHECKLIST, QUOTE, DIVIDER, IMAGE, FILE, LINK
    content_json: Optional[Dict[str, Any]] = None
    order_index: int = 0


class TaskBlockCreate(TaskBlockBase):
    task_id: int


class TaskBlockUpdate(BaseModel):
    type: Optional[str] = None
    content_json: Optional[Dict[str, Any]] = None
    order_index: Optional[int] = None


class TaskBlockResponse(TaskBlockBase):
    id: int
    task_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============== Task Comment Schemas ==============

class TaskCommentBase(BaseModel):
    content: str


class TaskCommentCreate(TaskCommentBase):
    task_id: int
    mentioned_user_ids: List[uuid.UUID] = Field(default_factory=list)


class TaskCommentResponse(TaskCommentBase):
    id: int
    task_id: int
    author_user_id: Optional[uuid.UUID] = None
    author_nome: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============== Task Mention Schemas ==============

class TaskMentionResponse(BaseModel):
    id: int
    task_id: int
    mentioned_user_id: uuid.UUID
    mentioned_user_nome: Optional[str] = None
    comment_id: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============== Task Attachment Schemas ==============

class TaskAttachmentBase(BaseModel):
    file_name: str
    mime_type: Optional[str] = None
    size_bytes: int
    storage_key: Optional[str] = None
    url: Optional[str] = None


class TaskAttachmentCreate(BaseModel):
    task_id: int
    file_name: str
    mime_type: Optional[str] = None
    size_bytes: int
    storage_key: Optional[str] = None
    url: Optional[str] = None


class TaskAttachmentResponse(TaskAttachmentBase):
    id: int
    task_id: int
    uploaded_by_user_id: Optional[uuid.UUID] = None
    uploaded_by_nome: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============== Task Template Schemas ==============

class TaskTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    default_blocks_json: Optional[List[Dict[str, Any]]] = None
    default_property_values_json: Optional[Dict[str, Any]] = None


class TaskTemplateCreate(TaskTemplateBase):
    task_database_id: int


class TaskTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    default_blocks_json: Optional[List[Dict[str, Any]]] = None
    default_property_values_json: Optional[Dict[str, Any]] = None


class TaskTemplateResponse(TaskTemplateBase):
    id: int
    task_database_id: int
    created_by_user_id: Optional[uuid.UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============== Extended Task Schemas (com Notion features) ==============

class TaskWithNotionResponse(BaseModel):
    """Resposta estendida de tarefa com dados Notion"""
    id: uuid.UUID
    titulo: str
    descricao: Optional[str] = None
    projeto_id: uuid.UUID
    status: str
    prioridade: Optional[str] = None
    responsavel_id: Optional[uuid.UUID] = None
    data_vencimento: Optional[date] = None
    task_database_id: Optional[int] = None
    context_type: Optional[str] = None
    context_id: Optional[uuid.UUID] = None
    completed_at: Optional[datetime] = None
    completed_by_user_id: Optional[uuid.UUID] = None
    is_recurring: bool = False
    recurrence_type: Optional[str] = None
    recurrence_interval: Optional[int] = None
    recurrence_end_date: Optional[date] = None
    parent_task_id: Optional[uuid.UUID] = None
    assigned_user_ids: List[uuid.UUID] = []
    assigned_users: List[Dict[str, Any]] = []
    property_values: List[TaskPropertyValueResponse] = []
    blocks: List[TaskBlockResponse] = []
    comments: List[TaskCommentResponse] = []
    attachments: List[TaskAttachmentResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True




