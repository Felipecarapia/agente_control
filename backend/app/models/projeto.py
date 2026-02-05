from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Projeto(Base):
    __tablename__ = "projetos"

    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String(50), default="desenvolvimento_software", nullable=False)  # desenvolvimento_software, marketing, infoproduto, lancamento
    nome = Column(String(255), nullable=False)
    descricao = Column(Text, nullable=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    status = Column(String(50), default="ativo", nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    data_inicio = Column(Date, nullable=True)
    data_fim = Column(Date, nullable=True)
    # Financeiro
    valor_orcado = Column(Numeric(15, 2), nullable=True)
    valor_realizado = Column(Numeric(15, 2), nullable=True)
    moeda = Column(String(3), default="BRL", nullable=False)
    observacoes_financeiras = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    cliente = relationship("Cliente", back_populates="projetos")
    usuario = relationship("Usuario", back_populates="projetos")
    tarefas = relationship("Tarefa", back_populates="projeto")
    propostas = relationship("Proposta", back_populates="projeto")
    contratos = relationship("Contrato", back_populates="projeto")
