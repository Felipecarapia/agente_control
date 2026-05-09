import asyncio
import httpx
import uuid
from datetime import datetime

async def test_webhook():
    # Payload similar to Evolution API messages.upsert
    payload = {
        "event": "messages.upsert",
        "instance": "secretariaControl",
        "data": {
            "key": {
                "remoteJid": "5511999999999@s.whatsapp.net",
                "fromMe": False,
                "id": str(uuid.uuid4())
            },
            "pushName": "Lucas Teste",
            "message": {
                "conversation": "Olá Sofia, tudo bem? Quero testar o seu funcionamento!"
            }
        }
    }

    async with httpx.AsyncClient() as client:
        try:
            print("Enviando requisição simulada para o Webhook local...")
            response = await client.post(
                "http://localhost:8000/api/v1/whatsapp/webhook",
                json=payload,
                timeout=30.0
            )
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
        except Exception as e:
            print(f"Erro ao acessar o webhook: {e}")

if __name__ == "__main__":
    asyncio.run(test_webhook())
