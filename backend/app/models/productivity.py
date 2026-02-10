import uuid
from decimal import Decimal
from sqlalchemy import Column, DateTime, String, Integer, Numeric, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class UserProductivityMetric(Base):
    """Métricas de produtividade mensal do usuário"""
    __tablename__ = "user_productivity_metrics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    month_year = Column(String(7), nullable=False)  # Formato: 2026-02
    productivity_score = Column(Numeric(5, 2), default=Decimal("0.00"))  # 0 a 100
    tasks_completed_on_time = Column(Integer, default=0)
    tasks_completed_late = Column(Integer, default=0)
    tasks_pending = Column(Integer, default=0)
    tasks_overdue = Column(Integer, default=0)
    last_calculated_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relacionamento
    user = relationship("Usuario", foreign_keys=[user_id])

    __table_args__ = (
        UniqueConstraint("user_id", "month_year", name="uq_user_month_productivity"),
        {"comment": "Métricas de produtividade mensal por usuário"}
    )
