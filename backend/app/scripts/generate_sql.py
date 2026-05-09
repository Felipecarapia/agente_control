import sys
import os
from sqlalchemy.schema import CreateTable
from sqlalchemy import create_mock_engine

# Adicionar o diretório raiz ao path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import Base
from app.models import *  # Importar todos os modelos registrados no __init__.py

def dump(sql, *multiparams, **params):
    print(sql.compile(dialect=engine.dialect))

engine = create_mock_engine("postgresql://", dump)

print("-- SQL SCHEMA PARA SUPABASE (MULTI-TENANT)")
print("-- ⚠️ EXECUTE ESTE SCRIPT NO EDITOR SQL DO SUPABASE")
print()
print("-- 1. Limpeza do Banco (Opcional - Remova se não quiser apagar tudo)")
print("DROP SCHEMA public CASCADE;")
print("CREATE SCHEMA public;")
print("GRANT ALL ON SCHEMA public TO postgres;")
print("GRANT ALL ON SCHEMA public TO public;")
print()

# Ordenar as tabelas para evitar problemas de dependência (Tenants deve ser a primeira)
# No SQLAlchemy, Base.metadata.sorted_tables cuida das dependências de FK.

for table in Base.metadata.sorted_tables:
    print(str(CreateTable(table).compile(dialect=engine.dialect)).strip() + ";")
    print()

print("-- ────────────────────────────────────────────────────────────")
print("-- DADOS INICIAIS (SEED)")
print("-- ────────────────────────────────────────────────────────────")

print("""
-- Criar Tenant Alpha Clean
INSERT INTO tenants (id, nome_negocio, plano, llm_model, system_prompt, created_at, updated_at)
VALUES (
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 
    'Alpha Clean', 
    'pro', 
    'gpt-4o-mini', 
    'Você é a Sofia, assistente virtual da Alpha Clean. Seja educada e focada em agendar serviços de limpeza.',
    NOW(),
    NOW()
);

-- Criar Usuário Admin (Senha: admin123 - Hash BCrypt)
-- Hash: $2b$12$fXU9T8.mR8k.K8N.J0N8Ju.q.Wp1Wp1Wp1Wp1Wp1Wp1Wp1Wp1Wp1W (Exemplo simplificado)
-- Usaremos o hash real gerado pelo passlib
INSERT INTO usuarios (id, tenant_id, nome, email, hashed_password, ativo, created_at, updated_at)
VALUES (
    'f1e2d3c4-b5a6-4f5e-9d8c-7b6a5f4e3d2c',
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    'Administrador Alpha',
    'admin@alphaclean.com',
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGGa31S.', -- admin123
    true,
    NOW(),
    NOW()
);
""")
