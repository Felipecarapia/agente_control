import uuid
import enum

from sqlalchemy import Column, String, Text, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.core.database import Base


class PlanType(str, enum.Enum):
    BASIC = "basic"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class Tenant(Base):
    """Modelo Multi-Tenant (Cliente do SaaS)"""
    __tablename__ = "tenants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    nome_negocio = Column(String(255), nullable=False)
    plano = Column(
        SQLEnum(PlanType, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20),
        nullable=False, default=PlanType.BASIC
    )
    llm_model = Column(String(100), nullable=True, default="gpt-4o-mini")
    system_prompt = Column(Text, nullable=True)
    openai_api_key = Column(String(255), nullable=True)
    google_calendar_token = Column(Text, nullable=True)
    
    # Evolution API Settings
    evolution_api_url = Column(String(500), nullable=True)
    evolution_api_key = Column(String(500), nullable=True)
    evolution_instance_name = Column(String(255), nullable=True, index=True)
    site_url = Column(String(500), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
