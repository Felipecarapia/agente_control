"""
Serviço de integração com a Evolution API e API Oficial do WhatsApp.
"""
import logging
import re
from typing import Optional, Dict, Any

import httpx

logger = logging.getLogger(__name__)


def normalize_phone_br(phone: str) -> str:
    """
    Normaliza um número de telefone brasileiro para o formato que a Evolution API espera.
    
    Exemplos:
      (11) 99999-9999  ->  5511999999999
      11999999999      ->  5511999999999
      +5511999999999   ->  5511999999999
      5511999999999    ->  5511999999999
      99999-9999       ->  5599999999 (sem DDD, mantém como está + 55)
    """
    # Remove tudo que não é dígito
    digits = re.sub(r"\D", "", phone)

    # Se começa com +55 ou 55 e tem 12-13 dígitos, já está ok
    if digits.startswith("55") and len(digits) >= 12:
        return digits

    # Se tem 10-11 dígitos (DDD + número), adiciona 55
    if len(digits) >= 10:
        return f"55{digits}"

    # Fallback: adiciona 55 mesmo assim
    return f"55{digits}"


class EvolutionAPIService:
    """Client para interagir com a Evolution API v2."""

    def __init__(self, api_url: str, api_key: str):
        self.api_url = api_url.rstrip("/")
        self.api_key = api_key
        self.headers = {
            "apikey": api_key,
            "Content-Type": "application/json",
        }

    async def create_instance(self, instance_name: str, phone_number: Optional[str] = None) -> Dict[str, Any]:
        """Cria uma nova instância na Evolution API."""
        payload: Dict[str, Any] = {
            "instanceName": instance_name,
            "integration": "WHATSAPP-BAILEYS",
            "qrcode": True,
        }
        if phone_number:
            payload["number"] = phone_number

        logger.info(f"[EVOLUTION] Criando instância: {self.api_url}/instance/create")
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{self.api_url}/instance/create",
                json=payload,
                headers=self.headers,
            )
            if response.status_code >= 400:
                logger.error(f"[EVOLUTION] Erro ao criar instância: {response.status_code} - {response.text}")
            response.raise_for_status()
            return response.json()

    async def get_qrcode(self, instance_name: str) -> Dict[str, Any]:
        """Obtém o QR Code para conectar o WhatsApp."""
        logger.info(f"[EVOLUTION] Obtendo QR Code: {self.api_url}/instance/connect/{instance_name}")
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                f"{self.api_url}/instance/connect/{instance_name}",
                headers=self.headers,
            )
            if response.status_code >= 400:
                logger.error(f"[EVOLUTION] Erro ao obter QR Code: {response.status_code} - {response.text}")
            response.raise_for_status()
            return response.json()

    async def get_connection_status(self, instance_name: str) -> Dict[str, Any]:
        logger.info(f"[EVOLUTION] Verificando status: {self.api_url}/instance/connectionState/{instance_name}")
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                f"{self.api_url}/instance/connectionState/{instance_name}",
                headers=self.headers,
            )
            if response.status_code >= 400:
                logger.error(f"[EVOLUTION] Erro ao verificar status: {response.status_code} - {response.text}")
            response.raise_for_status()
            data = response.json()
            logger.info(f"[EVOLUTION] Resposta status: {data}")
            return data

    async def send_message(self, instance_name: str, phone: str, text: str) -> Dict[str, Any]:
        """Envia uma mensagem de texto via WhatsApp."""
        # Se for um LID (@lid) ou JID (@s.whatsapp.net), enviar como está
        if "@lid" in phone or "@s.whatsapp.net" in phone or "@c.us" in phone:
            number_to_send = phone
            logger.info(f"[WA SEND] Usando JID/LID direto: {number_to_send}")
        else:
            number_to_send = normalize_phone_br(phone)
            logger.info(f"[WA SEND] Número original: {phone} -> normalizado: {number_to_send}")
        payload = {
            "number": number_to_send,
            "text": text,
        }
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{self.api_url}/message/sendText/{instance_name}",
                json=payload,
                headers=self.headers,
            )
            if response.status_code >= 400:
                logger.error(f"[WA SEND] Erro {response.status_code}: {response.text[:500]}")
            response.raise_for_status()
            return response.json()

    async def set_webhook(self, instance_name: str, webhook_url: str) -> Dict[str, Any]:
        """Configura o webhook para receber eventos."""
        payload = {
            "webhook": {
                "enabled": True,
                "url": webhook_url,
                "webhookByEvents": True,
                "events": [
                    "MESSAGES_UPSERT",
                    "CONNECTION_UPDATE",
                    "QRCODE_UPDATED",
                ],
            }
        }
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.put(
                f"{self.api_url}/instance/update/{instance_name}",
                json=payload,
                headers=self.headers,
            )
            response.raise_for_status()
            return response.json()

    async def disconnect_instance(self, instance_name: str) -> Dict[str, Any]:
        """Desconecta a instância do WhatsApp."""
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.delete(
                f"{self.api_url}/instance/logout/{instance_name}",
                headers=self.headers,
            )
            response.raise_for_status()
            return response.json()

    async def delete_instance(self, instance_name: str) -> Dict[str, Any]:
        """Remove a instância completamente."""
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.delete(
                f"{self.api_url}/instance/delete/{instance_name}",
                headers=self.headers,
            )
            response.raise_for_status()
            return response.json()


class MetaWhatsAppService:
    """Client para interagir com a API Oficial do WhatsApp Business (Meta)."""

    def __init__(self, api_url: str, api_key: str):
        self.api_url = api_url.rstrip("/")
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

    async def send_message(self, phone_number_id: str, to: str, text: str) -> Dict[str, Any]:
        """Envia mensagem de texto pela API Oficial."""
        normalized_to = normalize_phone_br(to)
        logger.info(f"[META WA SEND] Número original: {to} -> normalizado: {normalized_to}")
        payload = {
            "messaging_product": "whatsapp",
            "to": normalized_to,
            "type": "text",
            "text": {"body": text},
        }
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{self.api_url}/{phone_number_id}/messages",
                json=payload,
                headers=self.headers,
            )
            response.raise_for_status()
            return response.json()

    async def get_phone_info(self, phone_number_id: str) -> Dict[str, Any]:
        """Obtém informações do número de telefone."""
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                f"{self.api_url}/{phone_number_id}",
                headers=self.headers,
            )
            response.raise_for_status()
            return response.json()

    async def verify_webhook(self, mode: str, token: str, challenge: str, verify_token: str) -> Optional[str]:
        """Verifica o webhook da Meta."""
        if mode == "subscribe" and token == verify_token:
            return challenge
        return None
