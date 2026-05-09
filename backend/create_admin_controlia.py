import sys
import os

# Adicionar o diretório raiz ao path para importar app
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.core.database import SessionLocal
from app.models.tenant import Tenant
from app.models.usuario import Usuario
from app.core.security import get_password_hash

def create_admin():
    db = SessionLocal()
    try:
        # Pega o primeiro tenant, ou cria um se não existir
        tenant = db.query(Tenant).first()
        if not tenant:
            tenant = Tenant(
                nome_negocio="Control IA",
                plano="Premium",
                llm_model="gpt-4o",
            )
            db.add(tenant)
            db.commit()
            db.refresh(tenant)

        email = "admin@contro.ia"
        password = "admincontrolia"
        
        user = db.query(Usuario).filter(Usuario.email == email).first()
        if user:
            user.hashed_password = get_password_hash(password)
            user.tenant_id = tenant.id
            db.commit()
            print(f"Senha atualizada para {email}")
        else:
            new_user = Usuario(
                email=email,
                hashed_password=get_password_hash(password),
                nome="Admin Control IA",
                ativo=True,
                tenant_id=tenant.id
            )
            db.add(new_user)
            db.commit()
            print(f"Usuário admin criado: {email}")
    except Exception as e:
        print(f"Erro: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
