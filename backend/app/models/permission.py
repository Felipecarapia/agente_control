import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, UniqueConstraint, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Permission(Base):
    """Permissões granulares por módulo e ação."""
    __tablename__ = "permissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    module = Column(String(50), nullable=False, index=True)  # clientes, projetos, tarefas, etc
    action = Column(String(50), nullable=False, index=True)  # create, read, update, delete, etc
    name = Column(String(200), nullable=False)  # Nome descritivo: "Criar Clientes"
    description = Column(Text, nullable=True)  # Descrição detalhada
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    role_permissions = relationship("RolePermission", back_populates="permission")

    __table_args__ = (
        UniqueConstraint("module", "action", name="uq_permission_module_action"),
    )


class RolePermission(Base):
    """Relacionamento entre Roles e Permissions."""
    __tablename__ = "role_permissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    permission_id = Column(UUID(as_uuid=True), ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False)

    role = relationship("Role", back_populates="role_permissions")
    permission = relationship("Permission", back_populates="role_permissions")

    __table_args__ = (
        UniqueConstraint("role_id", "permission_id", name="uq_role_permission"),
    )
