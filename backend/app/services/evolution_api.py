"""
Serviço de integração com a Evolution API e API Oficial do WhatsApp.
"""
import logging
from typing import Optional, Dict, Any

import httpx

logger = logging.getLogger(__name__)


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

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{self.api_url}/instance/create",
                json=payload,
                headers=self.headers,
            )
            response.raise_for_status()
            return response.json()

    async def get_qrcode(self, instance_name: str) -> Dict[str, Any]:
        """Obtém o QR Code para conectar o WhatsApp."""
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                f"{self.api_url}/instance/connect/{instance_name}",
                headers=self.headers,
            )
            response.raise_for_status()
            return response.json()

    async def get_connection_status(self, instance_name: str) -> Dict[str, Any]:
        """Verifica o status da conexão da instância."""
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                f"{self.api_url}/instance/connectionState/{instance_name}",
                headers=self.headers,
            )
            response.raise_for_status()
            return response.json()

    async def send_message(self, instance_name: str, phone: str, text: str) -> Dict[str, Any]:
        """Envia uma mensagem de texto via WhatsApp."""
        payload = {
            "number": phone,
            "text": text,
        }
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{self.api_url}/message/sendText/{instance_name}",
                json=payload,
                headers=self.headers,
            )
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
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
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
