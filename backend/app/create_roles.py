"""
Script para criar os cargos padrão.
Execute: python -m app.create_roles
"""
from app.core.database import SessionLocal
from app.models.role import Role

ROLES_DATA = [
    ("ADMIN", "Administrador"),
    ("PROJECT_MANAGER", "Gestor de Projeto"),
    ("TRAFFIC_MANAGER", "Gestor de Tráfego"),
    ("MARKETING_MANAGER", "Gestor de Marketing"),
    ("MARKETING", "Marketing"),
    ("DEVELOPMENT", "Desenvolvimento"),
]


def create_roles():
    db = SessionLocal()
    try:
        created_count = 0
        for role_key, role_name in ROLES_DATA:
            existing = db.query(Role).filter(Role.key == role_key).first()
            if not existing:
                role = Role(key=role_key, name=role_name)
                db.add(role)
                created_count += 1
                print(f"✅ Cargo criado: {role_key} - {role_name}")
            else:
                print(f"⏭️  Cargo já existe: {role_key} - {role_name}")
        
        db.commit()
        print(f"\n✅ Processo concluído! {created_count} cargo(s) criado(s).")
    except Exception as e:
        db.rollback()
        print(f"❌ Erro: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    create_roles()




