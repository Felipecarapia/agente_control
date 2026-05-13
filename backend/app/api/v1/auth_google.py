import json
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from google_auth_oauthlib.flow import Flow
import os

from app.core.database import get_db
from app.models.tenant import Tenant
from app.core.config import settings

router = APIRouter()

# Scopes necessários
SCOPES = ['https://www.googleapis.com/auth/calendar']

# O redirecionamento deve bater com o cadastrado no Google Cloud Console
# Em produção, isso deve ser a URL do seu backend/Vercel
REDIRECT_URI = "http://localhost:8000/api/v1/auth/google/callback"

@router.get("/login")
async def google_login(tenant_id: str):
    """Gera a URL de autenticação do Google."""
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    
    if os.path.exists('credentials.json'):
        flow = Flow.from_client_secrets_file(
            'credentials.json',
            scopes=SCOPES,
            redirect_uri=REDIRECT_URI
        )
    elif client_id and client_secret:
        client_config = {
            "web": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [REDIRECT_URI]
            }
        }
        flow = Flow.from_client_config(
            client_config,
            scopes=SCOPES,
            redirect_uri=REDIRECT_URI
        )
    else:
        raise HTTPException(status_code=500, detail="Configurações do Google (credentials.json ou Env Vars) não encontradas.")

    
    # Gerar a URL de autorização
    # state ajuda a identificar o tenant quando voltar
    auth_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent',
        state=tenant_id
    )
    
    return {"url": auth_url}

@router.get("/callback")
async def google_callback(code: str, state: str, db: Session = Depends(get_db)):
    """Recebe o código do Google e salva o token."""
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    
    if os.path.exists('credentials.json'):
        flow = Flow.from_client_secrets_file(
            'credentials.json',
            scopes=SCOPES,
            redirect_uri=REDIRECT_URI
        )
    elif client_id and client_secret:
        client_config = {
            "web": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [REDIRECT_URI]
            }
        }
        flow = Flow.from_client_config(
            client_config,
            scopes=SCOPES,
            redirect_uri=REDIRECT_URI
        )
    else:
        raise HTTPException(status_code=500, detail="Configurações do Google não encontradas.")
    
    # Trocar o código pelo token
    flow.fetch_token(code=code)
    creds = flow.credentials
    
    # Converter para formato que o GoogleCalendarClient entende
    token_dict = {
        'token': creds.token,
        'refresh_token': creds.refresh_token,
        'token_uri': creds.token_uri,
        'client_id': creds.client_id,
        'client_secret': creds.client_secret,
        'scopes': creds.scopes
    }
    
    # Salvar no Tenant correto usando o state (que é o tenant_id)
    tenant = db.query(Tenant).filter(Tenant.id == state).first()
    if not tenant:
        # Se não achar pelo state, tenta o primeiro (fallback para dev)
        tenant = db.query(Tenant).first()
        
    if tenant:
        tenant.google_calendar_token = json.dumps(token_dict)
        db.commit()
        
    # Redirecionar de volta para o dashboard (ajuste a URL se necessário)
    return RedirectResponse(url="http://localhost:3000/dashboard/configuracoes?google=success")
