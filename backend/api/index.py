# Vercel Serverless Entry Point
# Este arquivo é o ponto de entrada para o Vercel Python Runtime
# O Vercel detecta automaticamente o app FastAPI (ASGI)

from app.main import app

# Vercel expects the ASGI app as `app`
# A variável `app` já está exportada pelo import acima
