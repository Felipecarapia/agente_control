# agent/premium_tools.py
# Ferramentas exclusivas do Agente Premium: CRM e Kanban

from langchain.tools import tool
from app.core.database import SessionLocal
from app.models.lead import Lead
from app.services.sofia_agent.context import current_tenant
from datetime import datetime, timezone
import logging
import uuid

logger = logging.getLogger(__name__)

@tool
async def CRM_Cadastrar_Cliente(lead_id: str):
    """
    [PREMIUM] Registra o cliente no CRM e garante que ele existe na base.
    Deve ser chamada SILENCIOSAMENTE na primeira mensagem de qualquer cliente novo.
    Parâmetros:
    - lead_id: UUID do lead (disponível no contexto)
    """
    try:
        lead_uuid = uuid.UUID(lead_id)
        db = SessionLocal()
        try:
            lead = db.query(Lead).filter(Lead.id == lead_uuid).first()
            if not lead:
                return "ERRO: Lead não encontrado no banco de dados."
            # Simula a atualização do status
            lead.status = lead.status or "novo"
            db.commit()
        finally:
            db.close()
            
        logger.info(f"✅ CRM: Cliente {lead_id} registrado/verificado.")
        return "✅ Cliente registrado no CRM."
    except Exception as e:
        logger.exception("Erro em CRM_Cadastrar_Cliente")
        return f"ERRO: {str(e)}"

@tool
async def CRM_Atualizar_Nome(lead_id: str, nome: str):
    """
    [PREMIUM] Atualiza o nome completo do cliente no CRM.
    Deve ser chamada SILENCIOSAMENTE após o cliente informar o nome completo.
    Parâmetros:
    - lead_id: UUID do lead
    - nome: Nome completo do cliente
    """
    try:
        lead_uuid = uuid.UUID(lead_id)
        db = SessionLocal()
        try:
            lead = db.query(Lead).filter(Lead.id == lead_uuid).first()
            if not lead:
                return "ERRO: Lead não encontrado."
            lead.nome = nome # No sistemavitus é "nome" e não "name"
            db.commit()
        finally:
            db.close()
        logger.info(f"✅ CRM: Nome atualizado para '{nome}' no lead {lead_id}.")
        return f"✅ Nome '{nome}' salvo no CRM."
    except Exception as e:
        logger.exception("Erro em CRM_Atualizar_Nome")
        return f"ERRO: {str(e)}"

@tool
async def Kanban_Mover_Card(lead_id: str, coluna: str):
    """
    [PREMIUM] Move o card do cliente para uma coluna específica do Kanban.
    Colunas válidas: Novo Lead, Qualificado, Agendado, Compareceu, No-show, Reativar, Pós-venda.
    NUNCA mover para Compareceu ou No-show (essas são movidas pelo humano).
    Esta ação é silenciosa — não informe o cliente.
    Parâmetros:
    - lead_id: UUID do lead
    - coluna: Nome exato da coluna do Kanban
    """
    COLUNAS_VALIDAS = [
        "Novo Lead", "Qualificado", "Agendado",
        "Compareceu", "No-show", "Reativar", "Pós-venda"
    ]
    COLUNAS_HUMANO = ["Compareceu", "No-show"]

    if coluna not in COLUNAS_VALIDAS:
        return f"ERRO: Coluna '{coluna}' inválida. Use uma das: {', '.join(COLUNAS_VALIDAS)}"

    if coluna in COLUNAS_HUMANO:
        return f"ERRO: A coluna '{coluna}' só pode ser movida por um humano."

    try:
        lead_uuid = uuid.UUID(lead_id)
        db = SessionLocal()
        try:
            lead = db.query(Lead).filter(Lead.id == lead_uuid).first()
            if not lead:
                return "ERRO: Lead não encontrado."
            
            # Mapeamento para os status do sistemavitus
            # 'novo', 'contatado', 'qualificado', 'proposta_enviada', 'negociando', 'ganho', 'perdido'
            status_map = {
                "Novo Lead": "novo",
                "Qualificado": "qualificado",
                "Agendado": "negociando",
                "Reativar": "contatado",
                "Pós-venda": "ganho"
            }
            lead.status = status_map.get(coluna, lead.status)
            db.commit()
        finally:
            db.close()
            
        logger.info(f"✅ Kanban: Lead {lead_id} movido para '{coluna}'.")
        return f"✅ Card movido para '{coluna}'."
    except Exception as e:
        logger.exception("Erro em Kanban_Mover_Card")
        return f"ERRO: {str(e)}"

@tool
async def Kanban_Atualizar_Card(lead_id: str, titulo: str, descricao: str, valor: str):
    """
    [PREMIUM] Atualiza os dados do card do cliente no CRM (título, descrição e valor).
    Esta ação é silenciosa — não informe o cliente.
    Parâmetros:
    - lead_id: UUID do lead
    - titulo: Serviços contratados (ex: 'Lavagem Completa + Higienização')
    - descricao: Detalhes completos (ex: 'Cliente: João Silva | Carro: Polo | Placa: ABC-1234 | Serviços: ...')
    - valor: Valor total em reais como string (ex: '340' ou '340.00')
    """
    try:
        lead_uuid = uuid.UUID(lead_id)
        valor_float = 0.0
        try:
            valor_limpo = valor.replace("R$", "").replace(",", ".").strip()
            valor_float = float(valor_limpo)
        except ValueError:
            pass  

        db = SessionLocal()
        try:
            lead = db.query(Lead).filter(Lead.id == lead_uuid).first()
            if not lead:
                return "ERRO: Lead não encontrado."
            
            lead.observacoes = f"[{titulo}] {descricao}\n" + (lead.observacoes or "")
            lead.orcamento_estimado = valor_float
            db.commit()
        finally:
            db.close()
            
        logger.info(f"✅ Kanban: Card de {lead_id} atualizado. Título='{titulo}', Valor=R${valor_float}")
        return f"✅ Card atualizado: '{titulo}' | R${valor_float:.2f}."
    except Exception as e:
        logger.exception("Erro em Kanban_Atualizar_Card")
        return f"ERRO: {str(e)}"
