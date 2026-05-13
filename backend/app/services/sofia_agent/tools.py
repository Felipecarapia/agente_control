from langchain.tools import tool
from app.services.sofia_agent.integrations.google_calendar import GoogleCalendarClient
from app.core.database import SessionLocal
from app.services.sofia_agent.context import current_tenant
import datetime
import logging
import uuid
from langchain_openai import ChatOpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)

async def get_calendar_client():
    try:
        tenant = current_tenant.get()
        logger.info(f"🔍 Ferramenta acessando contexto do Tenant: {tenant.nome_negocio} (ID: {tenant.id})")
        if not tenant or not tenant.google_calendar_token:
            logger.warning(f"⚠️ Token do Google ausente para o Tenant: {tenant.nome_negocio}")
            return None
        import json
        token_data = json.loads(tenant.google_calendar_token) if isinstance(tenant.google_calendar_token, str) else tenant.google_calendar_token
        return GoogleCalendarClient(token_data=token_data)
    except Exception as e:
        logger.exception(f"❌ Erro crítico ao acessar contexto do Tenant nas ferramentas")
        return None

@tool
async def Buscar_janelas_disponiveis(data_preferida: str, id_profissional: str = "primary", tamanho: int = 90):
    """
    Busca janelas de tempo disponíveis na agenda do Google. 
    data_preferida deve estar no formato YYYY-MM-DD.
    """
    client = await get_calendar_client()
    if not client:
        return "Erro: Google Calendar não autenticado para este cliente."

    try:
        start_dt = datetime.datetime.strptime(f"{data_preferida} 08:00:00", "%Y-%m-%d %H:%M:%S")
        end_dt = datetime.datetime.strptime(f"{data_preferida} 20:00:00", "%Y-%m-%d %H:%M:%S")
        
        busy_times = await client.get_free_busy(id_profissional, start_dt, end_dt)
        
        # Horário estendido até 20h
        suggestions = [f"{h:02d}:00" for h in range(8, 20)]
        available = []
        
        for s in suggestions:
            s_dt = datetime.datetime.strptime(f"{data_preferida} {s}", "%Y-%m-%d %H:%M")
            is_busy = False
            for busy in busy_times:
                b_start = datetime.datetime.fromisoformat(busy['start'].replace('Z', '+00:00'))
                b_end = datetime.datetime.fromisoformat(busy['end'].replace('Z', '+00:00'))
                if b_start.timestamp() <= s_dt.timestamp() < b_end.timestamp():
                    is_busy = True
                    break
            if not is_busy:
                available.append(s)
        
        if not available:
            return "Não encontrei janelas disponíveis para esta data."
        
        return f"Horários disponíveis para {data_preferida}: {', '.join(available)}"
    except Exception as e:
        logger.error(f"Error: {e}")
        return f"Erro ao buscar janelas: {str(e)}"

# Função auxiliar para evitar repetição e conflito de sessão
def _executar_agendamento_no_banco(lead_id, event_id, start_dt, end_dt, titulo, descricao=None):
    from app.services.sofia_agent.crud import create_appointment
    # Converter para naive (sem timezone) para o Postgres
    start_naive = start_dt.replace(tzinfo=None) if start_dt.tzinfo else start_dt
    end_naive = end_dt.replace(tzinfo=None) if end_dt.tzinfo else end_dt
    
    db = SessionLocal()
    try:
        create_appointment(db, uuid.UUID(lead_id), event_id, start_naive, end_naive, titulo, descricao)
    finally:
        db.close()

@tool
async def Criar_agendamento(titulo: str, data_hora_inicio: str, lead_id: str, duracao: int = 90, id_profissional: str = "primary", descricao: str = ""):
    """
    Cria um NOVO evento no Google Calendar. data_hora_inicio formato ISO.
    Use esta ferramenta para novos agendamentos que NÃO substituem os antigos.
    """
    client = await get_calendar_client()
    if not client: return "Erro Google Calendar."

    try:
        start_dt = datetime.datetime.fromisoformat(data_hora_inicio)
        
        # --- TRAVA DE SEGURANÇA: HORÁRIO COMERCIAL ---
        # Monday is 0, Sunday is 6
        if start_dt.weekday() == 6:
            return "ERRO: Fechado aos domingos. Por favor, escolha outro dia (Seg-Sáb)."
        
        # Trava: Seg-Sex (08-20), Sáb (08-17)
        max_hour = 20 if start_dt.weekday() < 5 else 17
        
        if start_dt.hour < 8 or start_dt.hour >= max_hour:
            return f"ERRO: Fora do horário de funcionamento ({'08:00 às 20:00' if start_dt.weekday() < 5 else '08:00 às 17:00'})."
        # --------------------------------------------

        end_dt = start_dt + datetime.timedelta(minutes=duracao)
        
        event = await client.create_event(
            calendar_id=id_profissional,
            summary=titulo,
            start_time=start_dt.isoformat(),
            end_time=end_dt.isoformat(),
            description=descricao
        )
        
        # 2. Criar o novo registro no banco
        event_id = event.get("id")
        _executar_agendamento_no_banco(lead_id, event_id, start_dt, end_dt, titulo, descricao)
            
        return f"Confirmado! {titulo} no dia {start_dt.strftime('%d/%m')} às {start_dt.strftime('%H:%M')}. ✅"
    except Exception as e:
        return f"Erro ao criar agendamento: {str(e)}"

@tool
async def Reagendar_atendimento(lead_id: str, nova_data_hora: str, descricao: str = None):
    """
    Uso OBRIGATÓRIO para qualquer mudança de data ou hora.
    """
    titulo = "Reagendamento Sofia" # Valor padrão interno
    from app.services.sofia_agent.crud import get_lead_appointments, delete_appointment_by_event_id
    
    client = await get_calendar_client()
    if not client: return "Erro Google Calendar."

    try:
        db = SessionLocal()
        appointments = get_lead_appointments(db, uuid.UUID(lead_id))
        
        if not appointments:
            db.close()
            return "Você não possui nenhum agendamento ativo para reagendar. Deseja criar um novo?"
            
        for appt in appointments:
            target_event_id = appt.google_event_id
            try:
                await client.delete_event(calendar_id="primary", event_id=target_event_id)
            except Exception as e:
                print(f"Aviso ao deletar no Google: {e}")
            delete_appointment_by_event_id(db, target_event_id)
        db.close()
            
        start_dt = datetime.datetime.fromisoformat(nova_data_hora)
        if start_dt.weekday() == 6:
            return "ERRO: Fechado aos domingos."
        
        # Trava: Seg-Sex (08-20), Sáb (08-17)
        max_hour = 20 if start_dt.weekday() < 5 else 17
        
        if start_dt.hour < 8 or start_dt.hour >= max_hour:
            return f"ERRO: Fora do horário de funcionamento ({'08:00 às 20:00' if start_dt.weekday() < 5 else '08:00 às 17:00'})."

        end_dt = start_dt + datetime.timedelta(minutes=90) # Padrão 90 min
        
        event = await client.create_event(
            calendar_id="primary",
            summary=titulo,
            start_time=start_dt.isoformat(),
            end_time=end_dt.isoformat(),
            description=descricao or ""
        )
        
        _executar_agendamento_no_banco(lead_id, event.get("id"), start_dt, end_dt, titulo, descricao or "")
        
        return f"Reagendamento confirmado para {start_dt.strftime('%d/%m')} às {start_dt.strftime('%H:%M')}. ✅"
            
    except Exception as e:
        return f"Erro no processo de reagendamento: {str(e)}"

@tool
async def Escalar_para_humano(lead_id: str):
    """
    Aciona o gerente humano para assumir o atendimento. 
    Gera um resumo da conversa e notifica o responsável.
    """
    from app.services.sofia_agent.crud import get_conversation_history, update_lead_status
    from app.services.evolution_api import EvolutionAPIService
    
    tenant = current_tenant.get()
    
    # Adaptado para o sistemavitus - talvez não tenha manager_phone, usar um email ou notificação interna
    manager_phone = getattr(tenant, "manager_phone", None) or getattr(tenant, "evolution_instance_name", None)
    
    try:
        db = SessionLocal()
        from app.models.lead import Lead
        lead = db.query(Lead).filter(Lead.id == uuid.UUID(lead_id)).first()
        if not lead:
            db.close()
            return "Erro: Lead não encontrado."
            
        lead_name = lead.nome or "Não informado"
        lead_phone = lead.whatsapp or lead.telefone or ""
        
        history = get_conversation_history(db, uuid.UUID(lead_id), limit=15)
        history_text = "\n".join([f"{m.role}: {m.content}" for m in history])
        
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0, api_key=tenant.openai_api_key or settings.OPENAI_API_KEY)
        resumo_resp = await llm.ainvoke(f"Resuma em 3 pontos os principais tópicos desta conversa de atendimento:\n\n{history_text}")
        resumo = resumo_resp.content
        
        if manager_phone and tenant.evolution_api_url and tenant.evolution_api_key:
            evolution = EvolutionAPIService(tenant.evolution_api_url, tenant.evolution_api_key)
            wa_link = f"https://wa.me/{lead_phone}"
            
            msg_gerente = (
                f"🚨 *SOLICITAÇÃO DE ATENDIMENTO HUMANO*\n\n"
                f"👤 *Cliente:* {lead_name}\n"
                f"📱 *Telefone:* {lead_phone}\n"
                f"🔗 *Conversar:* {wa_link}\n\n"
                f"📝 *Resumo do caso:*\n{resumo}\n\n"
                f"🤖 _O robô foi pausado para este lead._"
            )
            try:
                await evolution.send_message(
                    instance_name=tenant.evolution_instance_name,
                    phone=manager_phone, # Se houver número de gerente
                    text=msg_gerente
                )
            except Exception as e:
                logger.error(f"Erro ao notificar gerente: {e}")
        
        update_lead_status(db, uuid.UUID(lead_id), "Em_atendimento_humano")
        db.close()
            
        return "Transferência para humano realizada. O gerente foi notificado e o robô pausado para este contato."
    except Exception as e:
        logger.error(f"Erro no handoff: {e}")
        return f"Erro ao escalar para humano: {str(e)}"

@tool
async def Cancelar_agendamento(event_id: str, id_profissional: str = "primary"):
    """Cancela um agendamento existente."""
    client = await get_calendar_client()
    if not client: return "Erro Google."
    try:
        await client.delete_event(id_profissional, event_id)
        return "Cancelado com sucesso."
    except Exception as e:
        return f"Erro: {str(e)}"

@tool
async def Buscar_agendamentos_do_contato(nome_ou_telefone: str, id_profissional: str = "primary"):
    """Busca agendamentos futuros para um contato."""
    client = await get_calendar_client()
    if not client: return "Erro Google."
    try:
        events = await client.list_upcoming_events(id_profissional, q=nome_ou_telefone)
        if not events: return "Nenhum encontrado."
        summary = [f"ID: {e['id']} | {e['summary']} | {e['start'].get('dateTime')}" for e in events]
        return "\n".join(summary)
    except Exception as e:
        return f"Erro: {str(e)}"
