import httpx
import asyncio

async def test():
    url = "https://evolution.facontrolai.com/instance/connectionState/secretariaControl"
    headers = {"apikey": "Lucas3005#00"} # This was guessed from DB URL password, likely wrong.
    # Actually, I should find the real API Key from the DB or .env
    print(f"Testing URL: {url}")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url)
            print(f"Status: {resp.status_code}")
            print(f"Body: {resp.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())
