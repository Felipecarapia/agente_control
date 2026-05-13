import re
import pytz
from datetime import datetime
from typing import Optional, List

from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.tenant import Tenant
from app.models.lead import Lead, LeadConversation
from app.models.cliente import Cliente
from app.services.sofia_agent.memory import PostgresChatMessageHistory
from app.services.sofia_agent.tools import (
    Buscar_janelas_disponiveis,
    Criar_agendamento,
    Cancelar_agendamento,
    Buscar_agendamentos_do_contato,
    Escalar_para_humano,
    Reagendar_atendimento
)
from app.services.sofia_agent.premium_tools import (
    CRM_Cadastrar_Cliente,
    CRM_Atualizar_Nome,
    Kanban_Mover_Card,
    Kanban_Atualizar_Card
)

async def get_agent_executor(tenant: Tenant, lead: Lead, conversation: LeadConversation, db_session: Session):
    """
    Retorna um Executor de Agente configurado para o Tenant, Lead e Plano específico.
    Versão PROFISSIONAL: Gerenciamento manual de história para evitar erros de biblioteca.
    """
    
    # 1. Contexto das Ferramentas
    from app.services.sofia_agent.context import current_tenant
    current_tenant.set(tenant)
    
    # 2. Configuração de Cérebro (API Key e IA)
    api_key = tenant.openai_api_key or settings.OPENAI_API_KEY
    plan_name = str(tenant.plano).lower() if tenant.plano else "basic"
    
    if conversation.agent and conversation.agent.cliente_id:
        cliente = db_session.query(Cliente).filter(Cliente.id == conversation.agent.cliente_id).first()
        if cliente:
            if cliente.openai_api_key:
                api_key = cliente.openai_api_key
            if cliente.plano:
                plan_name = cliente.plano.lower()

    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0,
        api_key=api_key
    )
    
    # 3. Ferramentas (Tools)
    tools = [
        Buscar_janelas_disponiveis,
        Criar_agendamento,
        Cancelar_agendamento,
        Buscar_agendamentos_do_contato,
        Escalar_para_humano,
        Reagendar_atendimento
    ]
    
    if "premium" in plan_name:
        tools += [
            CRM_Cadastrar_Cliente,
            CRM_Atualizar_Nome,
            Kanban_Mover_Card,
            Kanban_Atualizar_Card
        ]
    
    # 4. Prompt do Sistema (Templates Invioláveis)
    from app.services.sofia_agent.prompts import PROMPT_BASIC, PROMPT_PRO, PROMPT_PREMIUM
    
    system_p = tenant.system_prompt
    if not system_p:
        if "premium" in plan_name:
            system_p = PROMPT_PREMIUM
        elif "pro" in plan_name:
            system_p = PROMPT_PRO
        else:
            system_p = PROMPT_BASIC
            
    # Suporte a template {{ var }} compatível com original
    system_p = re.sub(r'\{\{\s*(.*?)\s*\}\}', r'{\1}', system_p)
    
    # Injeção Dinâmica de Horário
    fuso_br = pytz.timezone('America/Sao_Paulo')
    agora = datetime.now(fuso_br)
    dias_semana = {
        'Monday': 'segunda-feira', 'Tuesday': 'terça-feira',
        'Wednesday': 'quarta-feira', 'Thursday': 'quinta-feira',
        'Friday': 'sexta-feira', 'Saturday': 'sábado', 'Sunday': 'domingo'
    }
    dia_semana_atual = dias_semana.get(agora.strftime('%A'), agora.strftime('%A'))
    
    info_tempo = f"### INFO AMBIENTE\nDATA ATUAL: {agora.strftime('%d/%m/%Y')} | HORA: {agora.strftime('%H:%M')} | DIA: {dia_semana_atual}\n\n"
    system_p = info_tempo + system_p

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_p),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])
    
    # Injetar variáveis fixas
    prompt = prompt.partial(
        data_atual=agora.strftime("%d/%m/%Y"),
        hora_atual=agora.strftime("%H:%M"),
        dia_semana=dia_semana_atual,
        lead_id=str(lead.id)
    )
    
    # 5. Criar o Agente e Executor
    # Nota: Não usamos mais 'memory=' para evitar erros de módulo no VS Code.
    # O histórico será passado manualmente no momento do invoke (veja whatsapp.py).
    agent = create_tool_calling_agent(llm, tools, prompt)
    
    return AgentExecutor(
        agent=agent, 
        tools=tools, 
        verbose=True,
        handle_parsing_errors=True,
        max_iterations=10
    )
