import sys
import os

# Adicionar o diretório raiz ao path para importar app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import engine, Base
from app.models.tenant import Tenant, PlanType
from app.models.usuario import Usuario
from app.models.lead import Lead
from app.models.agent import AIAgent
from app.models.campaign import Campaign
from app.models.whatsapp import WhatsAppConnection
from app.core.security import get_password_hash
from sqlalchemy.orm import Session

def reset_database():
    print("⚠️  AVISO: Este script irá DELETAR TODOS OS DADOS do banco de dados atual.")
    confirm = input("Você tem certeza? (digite 'sim' para continuar): ")
    if confirm.lower() != 'sim':
        print("Operação cancelada.")
        return

    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    
    print("Creating all tables in the new architecture...")
    Base.metadata.create_all(bind=engine)
    
    print("✅ Banco de dados recriado com sucesso.")
    
    # Criar primeiro Tenant de teste
    print("Criando primeiro Tenant (Alpha Clean)...")
    db = Session(engine)
    try:
        tenant = Tenant(
            nome_negocio="Alpha Clean",
            plano=PlanType.PRO,
            llm_model="gpt-4o-mini",
            system_prompt="Você é a Sofia, assistente virtual da Alpha Clean. Seja educada e focada em agendar serviços de limpeza."
        )
        db.add(tenant)
        db.flush()
        
        # Criar admin para este tenant
        admin = Usuario(
            tenant_id=tenant.id,
            nome="Administrador Alpha",
            email="admin@alphaclean.com",
            hashed_password=get_password_hash("admin123"),
            ativo=True
        )
        db.add(admin)
        db.commit()
        print(f"🚀 Sistema inicializado!")
        print(f"Tenant ID: {tenant.id}")
        print(f"Login: admin@alphaclean.com / Senha: admin123")
    except Exception as e:
        print(f"Erro ao popular dados iniciais: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_database()
