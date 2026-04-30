import os
import sys

# Adiciona o diretório atual ao PYTHONPATH
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.usuario import Usuario
from app.core.security import get_password_hash
from dotenv import load_dotenv

def create_admin():
    load_dotenv()
    db = SessionLocal()
    
    email = os.environ.get("ADMIN_EMAIL", "seu@email.com")
    password = os.environ.get("ADMIN_PASSWORD", "UmaSenhaForte")
    nome = os.environ.get("ADMIN_NOME", "Admin CRM")
    
    user = db.query(Usuario).filter(Usuario.email == email).first()
    if not user:
        print(f"Creating admin user: {email}")
        hashed = get_password_hash(password)
        new_user = Usuario(email=email, hashed_password=hashed, nome=nome, ativo=True)
        try:
            db.add(new_user)
            db.commit()
            print("Admin user created successfully.")
        except Exception as e:
            db.rollback()
            print(f"Error creating user: {e}")
            
            # fallback if attributes differ
            try:
                new_user = Usuario(email=email, password_hash=hashed, full_name=nome)
                db.add(new_user)
                db.commit()
                print("Admin user created with fallback schema.")
            except Exception as e2:
                print(f"Fallback failed: {e2}")
    else:
        print("Admin user already exists.")
        
    db.close()

if __name__ == "__main__":
    create_admin()
