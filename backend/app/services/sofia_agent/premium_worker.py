# agent/premium_worker.py
# Worker automático do Agente Premium:
# - 4h em "Compareceu"  → move para "Pós-venda" e envia pesquisa de satisfação
# - 24h em "No-show"    → move para "Reativar" e envia convite de reagendamento

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from sqlmodel import select
from database.session import async_session
from database.models import Lead, Tenant

logger = logging.getLogger(__name__)


async def _enviar_mensagem(evolution_url: str, api_key: str, instance: str, phone: str, texto: str):
    """Envia mensagem via Evolution API."""
    try:
        import httpx
        url = f"{evolution_url}/message/sendText/{instance}"
        headers = {"apikey": api_key, "Content-Type": "application/json"}
        payload = {"number": phone, "text": texto}
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            logger.info(f"✅ Worker: Mensagem enviada para {phone}")
    except Exception as e:
        logger.error(f"❌ Worker: Falha ao enviar mensagem para {phone}: {e}")


async def run_premium_triggers():
    """
    Verifica leads que precisam ser movidos automaticamente por tempo.
    Deve ser chamado em loop (a cada 5 minutos).
    """
    from config import settings

    agora = datetime.now(timezone.utc)

    async with async_session() as db:
        # Busca todos os tenants Premium
        tenants_result = await db.execute(
            select(Tenant).where(Tenant.plan == "Premium")
        )
        tenants = tenants_result.scalars().all()

        for tenant in tenants:
            # --- GATILHO 1: 4h em "Compareceu" → Pós-venda ---
            leads_compareceu = await db.execute(
                select(Lead).where(
                    Lead.tenant_id == tenant.id,
                    Lead.status == "Compareceu"
                )
            )
            for lead in leads_compareceu.scalars().all():
                status_at = lead.status_updated_at
                if status_at and status_at.tzinfo is None:
                    status_at = status_at.replace(tzinfo=timezone.utc)

                if status_at and (agora - status_at) >= timedelta(hours=4):
                    logger.info(f"⏰ Worker: Lead {lead.id} em Compareceu há 4h → movendo para Pós-venda")

                    # Move para Pós-venda e limpa o card
                    lead.status = "Pós-venda"
                    lead.status_updated_at = agora
                    lead.description = ""   # Limpa para futuro ciclo
                    lead.valor = 0.0
                    db.add(lead)

                    # Envia pesquisa de satisfação
                    nome = lead.name or "cliente"
                    mensagem = (
                        f"Olá, {nome}! 😊 Foi um prazer atender você hoje na Alpha Clean!\n"
                        f"Gostaríamos de saber sua opinião. Como foi a experiência?\n"
                        f"Sua avaliação nos ajuda a melhorar sempre! ⭐"
                    )
                    from config import settings as s
                    await _enviar_mensagem(
                        evolution_url=s.EVOLUTION_API_URL,
                        api_key=tenant.evolution_api_key or s.EVOLUTION_API_KEY,
                        instance=tenant.evolution_instance,
                        phone=lead.phone,
                        texto=mensagem
                    )

            # --- GATILHO 2: 24h em "No-show" → Reativar ---
            leads_noshow = await db.execute(
                select(Lead).where(
                    Lead.tenant_id == tenant.id,
                    Lead.status == "No-show"
                )
            )
            for lead in leads_noshow.scalars().all():
                status_at = lead.status_updated_at
                if status_at and status_at.tzinfo is None:
                    status_at = status_at.replace(tzinfo=timezone.utc)

                if status_at and (agora - status_at) >= timedelta(hours=24):
                    logger.info(f"⏰ Worker: Lead {lead.id} em No-show há 24h → movendo para Reativar")

                    lead.status = "Reativar"
                    lead.status_updated_at = agora
                    db.add(lead)

                    nome = lead.name or "cliente"
                    mensagem = (
                        f"Olá, {nome}! Tudo bem? 😊\n"
                        f"Notamos que não conseguimos te atender no horário agendado. Sem problemas!\n"
                        f"Que tal remarcarmos? Ainda temos horários disponíveis esta semana 📅\n"
                        f"Quando seria melhor para você?"
                    )
                    from config import settings as s
                    await _enviar_mensagem(
                        evolution_url=s.EVOLUTION_API_URL,
                        api_key=tenant.evolution_api_key or s.EVOLUTION_API_KEY,
                        instance=tenant.evolution_instance,
                        phone=lead.phone,
                        texto=mensagem
                    )

        await db.commit()


async def start_premium_worker(interval_seconds: int = 300):
    """
    Inicia o loop do worker Premium.
    Roda a cada `interval_seconds` (padrão: 5 minutos).
    """
    logger.info("🤖 Premium Worker iniciado! Verificando gatilhos a cada 5 minutos...")
    while True:
        try:
            await run_premium_triggers()
        except Exception as e:
            logger.exception(f"❌ Erro no Premium Worker: {e}")
        await asyncio.sleep(interval_seconds)
