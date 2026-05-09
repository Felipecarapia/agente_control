import httpx
from typing import Optional
from config import settings

class EvolutionAPI:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.headers = {
            "apikey": self.api_key,
            "Content-Type": "application/json"
        }

    async def send_text_message(self, instance: str, number: str, text: str):
        url = f"{self.base_url}/message/sendText/{instance}"
        payload = {
            "number": number, # Aceita número puro ou JID (ex: numero@s.whatsapp.net)
            "text": text
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=self.headers)
            if response.status_code not in [200, 201]:
                print(f"❌ Erro Evolution API ({response.status_code}): {response.text}")
            return response.json()

    async def send_image_message(self, instance: str, number: str, caption: str, media_url: str):
        url = f"{self.base_url}/message/sendMedia/{instance}"
        payload = {
            "number": number,
            "mediaMessage": {
                "mediatype": "image",
                "caption": caption,
                "media": media_url
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=self.headers)
            response.raise_for_status()
            return response.json()
