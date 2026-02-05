from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Contrato(Base):
    __tablename__ = "contratos"

    id = Column(Integer, primary_key=True, index=True)
    numero = Column(String(100), nullable=False)
    proposta_id = Column(Integer, ForeignKey("propostas.id"), nullable=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    projeto_id = Column(Integer, ForeignKey("projetos.id"), nullable=True)
    valor = Column(Numeric(15, 2), nullable=True)
    data_inicio = Column(Date, nullable=True)
    data_fim = Column(Date, nullable=True)
    arquivo_url = Column(String(500), nullable=True)
    status = Column(String(50), default="ativo", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    proposta = relationship("Proposta", back_populates="contratos")
    cliente = relationship("Cliente", back_populates="contratos")
    projeto = relationship("Projeto", back_populates="contratos")
