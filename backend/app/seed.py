"""
Cria o primeiro usuário admin se não existir nenhum usuário.
Rodar após as migrations: cd backend && alembic upgrade head && python -m app.seed
"""
import sys

from sqlalchemy.exc import ProgrammingError

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.usuario import Usuario


def run_seed() -> None:
    db = SessionLocal()
    try:
        if db.query(Usuario).first() is not None:
            print("Já existem usuários. Nenhum admin criado.")
            return
        admin = Usuario(
            email=settings.ADMIN_EMAIL,
            hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
            nome=settings.ADMIN_NOME,
            ativo=True,
        )
        db.add(admin)
        db.commit()
        print(f"Primeiro usuário admin criado: {settings.ADMIN_EMAIL}")
        print("Faça login com esse email e a senha definida em ADMIN_PASSWORD no .env")
    except ProgrammingError as e:
        if "does not exist" in str(e.orig) or "UndefinedTable" in str(type(e.orig).__name__):
            print("Erro: as tabelas ainda não existem no banco.")
            print("Rode primeiro: alembic upgrade head")
            sys.exit(1)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
