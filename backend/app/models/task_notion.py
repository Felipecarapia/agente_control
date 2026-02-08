from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Boolean, BigInteger, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base


class TaskDatabase(Base):
    """Base de Tarefas (Notion Database)"""
    __tablename__ = "task_databases"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_default = Column(Boolean, default=False, nullable=False)
    created_by_user_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    created_by = relationship("Usuario", foreign_keys=[created_by_user_id])
    properties = relationship("TaskProperty", back_populates="database", cascade="all, delete-orphan")
    views = relationship("TaskView", back_populates="database", cascade="all, delete-orphan")
    templates = relationship("TaskTemplate", back_populates="database", cascade="all, delete-orphan")
    tasks = relationship("Tarefa", back_populates="task_database", foreign_keys="Tarefa.task_database_id")


class TaskProperty(Base):
    """Propriedade customizável de tarefa (Notion Property)"""
    __tablename__ = "task_properties"

    id = Column(Integer, primary_key=True, index=True)
    task_database_id = Column(Integer, ForeignKey("task_databases.id", ondelete="CASCADE"), nullable=False, index=True)
    key = Column(String(100), nullable=False)  # unique per database
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)  # TEXT, NUMBER, SELECT, MULTI_SELECT, DATE, PERSON, CHECKBOX, URL
    config_json = Column(JSONB, nullable=True)  # options for select/multi_select
    order_index = Column(Integer, nullable=False, default=0)
    is_required = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    database = relationship("TaskDatabase", back_populates="properties")
    values = relationship("TaskPropertyValue", back_populates="property", cascade="all, delete-orphan")

    __table_args__ = (
        {"comment": "Propriedades customizáveis de tarefas (estilo Notion)"}
    )


class TaskPropertyValue(Base):
    """Valor de uma propriedade para uma tarefa específica"""
    __tablename__ = "task_property_values"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tarefas.id", ondelete="CASCADE"), nullable=False, index=True)
    property_id = Column(Integer, ForeignKey("task_properties.id", ondelete="CASCADE"), nullable=False, index=True)
    value_json = Column(JSONB, nullable=True)  # armazenar conforme type
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    task = relationship("Tarefa", back_populates="property_values")
    property = relationship("TaskProperty", back_populates="values")

    __table_args__ = (
        {"comment": "Valores das propriedades customizáveis por tarefa"}
    )


class TaskView(Base):
    """View salva de tarefas (filtros, sorts, agrupamentos)"""
    __tablename__ = "task_views"

    id = Column(Integer, primary_key=True, index=True)
    task_database_id = Column(Integer, ForeignKey("task_databases.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)  # LIST, TABLE, KANBAN, CALENDAR, AGENDA
    config_json = Column(JSONB, nullable=True)  # filters, sorts, groupBy, columns, visibleProperties
    is_default = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    database = relationship("TaskDatabase", back_populates="views")
    user = relationship("Usuario", foreign_keys=[user_id])


class TaskBlock(Base):
    """Bloco de conteúdo da tarefa (editor Notion)"""
    __tablename__ = "task_blocks"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tarefas.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(50), nullable=False)  # PARAGRAPH, HEADING, BULLET_LIST, CHECKLIST, QUOTE, DIVIDER, IMAGE, FILE, LINK
    content_json = Column(JSONB, nullable=True)  # conteúdo do bloco
    order_index = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    task = relationship("Tarefa", back_populates="blocks", foreign_keys=[task_id])

    __table_args__ = (
        {"comment": "Blocos de conteúdo da tarefa (editor estilo Notion)"}
    )


class TaskComment(Base):
    """Comentário em uma tarefa"""
    __tablename__ = "task_comments"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tarefas.id", ondelete="CASCADE"), nullable=False, index=True)
    author_user_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    task = relationship("Tarefa", back_populates="comments", foreign_keys=[task_id])
    author = relationship("Usuario", foreign_keys=[author_user_id])
    mentions = relationship("TaskMention", back_populates="comment", cascade="all, delete-orphan")


class TaskMention(Base):
    """Menção de usuário em comentário"""
    __tablename__ = "task_mentions"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tarefas.id", ondelete="CASCADE"), nullable=False, index=True)
    mentioned_user_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    comment_id = Column(Integer, ForeignKey("task_comments.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    task = relationship("Tarefa", back_populates="mentions", foreign_keys=[task_id])
    mentioned_user = relationship("Usuario", foreign_keys=[mentioned_user_id])
    comment = relationship("TaskComment", back_populates="mentions")


class TaskAttachment(Base):
    """Anexo de arquivo em uma tarefa"""
    __tablename__ = "task_attachments"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tarefas.id", ondelete="CASCADE"), nullable=False, index=True)
    uploaded_by_user_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    file_name = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=True)
    size_bytes = Column(BigInteger, nullable=False)
    storage_key = Column(String(500), nullable=True)  # S3 key ou path local
    url = Column(String(1000), nullable=True)  # URL pública
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    task = relationship("Tarefa", back_populates="attachments", foreign_keys=[task_id])
    uploaded_by = relationship("Usuario", foreign_keys=[uploaded_by_user_id])


class TaskTemplate(Base):
    """Template de tarefa"""
    __tablename__ = "task_templates"

    id = Column(Integer, primary_key=True, index=True)
    task_database_id = Column(Integer, ForeignKey("task_databases.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    default_blocks_json = Column(JSONB, nullable=True)  # array de blocks padrão
    default_property_values_json = Column(JSONB, nullable=True)  # valores padrão de properties
    created_by_user_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    database = relationship("TaskDatabase", back_populates="templates")
    created_by = relationship("Usuario", foreign_keys=[created_by_user_id])




