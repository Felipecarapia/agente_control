from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String(2), nullable=False, default="pf")  # pf | pj
    nome = Column(String(255), nullable=False)  # nome completo (PF) ou nome fantasia (PJ)
    razao_social = Column(String(255), nullable=True)  # PJ
    cpf = Column(String(14), nullable=True)  # PF
    cnpj = Column(String(18), nullable=True)  # PJ
    rg = Column(String(20), nullable=True)  # PF
    inscricao_estadual = Column(String(20), nullable=True)  # PJ
    email = Column(String(255), nullable=True)
    telefone = Column(String(50), nullable=True)
    celular = Column(String(50), nullable=True)
    cep = Column(String(9), nullable=True)
    endereco = Column(String(255), nullable=True)  # logradouro
    numero = Column(String(20), nullable=True)
    complemento = Column(String(100), nullable=True)
    bairro = Column(String(100), nullable=True)
    cidade = Column(String(100), nullable=True)
    estado = Column(String(2), nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    criado_por_usuario = relationship("Usuario", back_populates="clientes")
    projetos = relationship("Projeto", back_populates="cliente")
    propostas = relationship("Proposta", back_populates="cliente")
    contratos = relationship("Contrato", back_populates="cliente")
