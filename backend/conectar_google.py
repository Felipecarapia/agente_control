import os
import json
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
import sys

# Adicionar o diretório atual ao path para importar o app
sys.path.append(os.getcwd())

from app.core.database import SessionLocal
from app.models.tenant import Tenant

# Scopes necessários para o Calendar
SCOPES = ['https://www.googleapis.com/auth/calendar']

def conectar():
    creds_path = 'credentials.json'
    
    if not os.path.exists(creds_path):
        print(f"❌ Erro: O arquivo '{creds_path}' não foi encontrado na pasta 'backend'.")
        print("Siga os passos:")
        print("1. Vá ao Google Cloud Console.")
        print("2. Crie um ID de Cliente OAuth do tipo 'App Desktop'.")
        print("3. Baixe o JSON e salve como 'credentials.json' nesta pasta.")
        return

    print("🚀 Iniciando processo de autenticação...")
    flow = InstalledAppFlow.from_client_secrets_file(creds_path, SCOPES)
    
    # Isso vai abrir o navegador na porta que você cadastrou no Google
    creds = flow.run_local_server(port=8080, prompt='consent')
    
    # Converter as credenciais para JSON para salvar no banco
    token_dict = {
        'token': creds.token,
        'refresh_token': creds.refresh_token,
        'token_uri': creds.token_uri,
        'client_id': creds.client_id,
        'client_secret': creds.client_secret,
        'scopes': creds.scopes
    }
    
    token_json = json.dumps(token_dict)
    
    # Salvar no primeiro Tenant encontrado (ajuste se tiver mais de um)
    db = SessionLocal()
    tenant = db.query(Tenant).first()
    
    if not tenant:
        print("❌ Erro: Nenhum Tenant (empresa) encontrado no banco de dados.")
        db.close()
        return

    try:
        tenant.google_calendar_token = token_json
        db.commit()
        print(f"✅ Sucesso! Token salvo para a empresa: {tenant.nome_negocio}")
        print("Agora a Sofia já tem permissão para agendar no seu Google Calendar.")
    except Exception as e:
        print(f"❌ Erro ao salvar no banco: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    conectar()
