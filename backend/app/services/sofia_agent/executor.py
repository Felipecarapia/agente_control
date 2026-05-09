from typing import List
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.memory import ConversationBufferWindowMemory
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage

from app.models.tenant import Tenant
from app.models.lead import Lead, LeadConversation
from app.services.sofia_agent.memory import PostgresChatMessageHistory
from app.services.sofia_agent.context import current_tenant
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
from sqlalchemy.orm import Session
from app.core.config import settings
import re
from datetime import datetime
import pytz

async def get_agent_executor(tenant: Tenant, lead: Lead, conversation: LeadConversation, db_session: Session):
    # Set context for tools
    current_tenant.set(tenant)
    
    # 1. Initialize LLM
    api_key = tenant.openai_api_key or settings.OPENAI_API_KEY
    llm = ChatOpenAI(
        model=tenant.llm_model or "gpt-4o-mini",
        temperature=0,
        api_key=api_key
    )
    
    # 2. Add Tools (ferramentas base para todos os planos)
    tools = [
        Buscar_janelas_disponiveis,
        Criar_agendamento,
        Cancelar_agendamento,
        Buscar_agendamentos_do_contato,
        Escalar_para_humano,
        Reagendar_atendimento
    ]
    
    # Ferramentas exclusivas do plano Premium (CRM + Kanban)
    # Adaptado: no sistemavitus o plano chama-se "plano", então checamos string lower ou upper
    plan_name = str(tenant.plano).lower() if hasattr(tenant, "plano") and tenant.plano else ""
    if "premium" in plan_name:
        tools += [
            CRM_Cadastrar_Cliente,
            CRM_Atualizar_Nome,
            Kanban_Mover_Card,
            Kanban_Atualizar_Card
        ]
    
    # 3. Create prompt — fallback automático por plano
    system_p = tenant.system_prompt
    if not system_p:
        if "premium" in plan_name:
            from app.services.sofia_agent.prompts import PROMPT_PREMIUM
            system_p = PROMPT_PREMIUM
        elif "pro" in plan_name:
            from app.services.sofia_agent.prompts import PROMPT_PRO
            system_p = PROMPT_PRO
        else:
            from app.services.sofia_agent.prompts import PROMPT_BASIC
            system_p = PROMPT_BASIC
        
    system_p = re.sub(r'\{\{\s*(.*?)\s*\}\}', r'{\1}', system_p)
    
    # Injetar Data/Hora real para saudação dinâmica
    fuso_br = pytz.timezone('America/Sao_Paulo')
    agora = datetime.now(fuso_br)
    dias_semana = {
        'Monday': 'segunda-feira', 'Tuesday': 'terça-feira',
        'Wednesday': 'quarta-feira', 'Thursday': 'quinta-feira',
        'Friday': 'sexta-feira', 'Saturday': 'sábado', 'Sunday': 'domingo'
    }
    dia_semana_atual = dias_semana.get(agora.strftime('%A'), agora.strftime('%A'))
    
    info_tempo = f"DATA ATUAL: {agora.strftime('%d/%m/%Y')} | HORA: {agora.strftime('%H:%M')} | DIA: {dia_semana_atual}\n\n"
    system_p = info_tempo + system_p

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_p),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])
    
    # 4. Bind prompt variables
    prompt = prompt.partial(
        data_atual=agora.strftime("%d/%m/%Y"),
        hora_atual=agora.strftime("%H:%M"),
        dia_semana=dia_semana_atual,
        lead_id=str(lead.id)
    )
    
    # 5. Set up memory
    chat_history = PostgresChatMessageHistory(db_session, conversation.id, tenant.id)
    chat_history.load_messages()
    
    memory = ConversationBufferWindowMemory(
        memory_key="chat_history",
        chat_memory=chat_history,
        return_messages=True,
        k=15
    )
    
    # 6. Build the agent executor
    agent = create_tool_calling_agent(llm, tools, prompt)
    executor = AgentExecutor(
        agent=agent, 
        tools=tools, 
        memory=memory, 
        verbose=True,
        handle_parsing_errors=True,
        input_key="input",
        output_key="output"
    )
    
    return executor
