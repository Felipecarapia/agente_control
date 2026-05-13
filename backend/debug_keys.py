import uuid
from app.core.database import SessionLocal
from app.models.agent import AIAgent
from app.models.cliente import Cliente
from app.models.tenant import Tenant
from app.core.config import settings

def debug_keys():
    db = SessionLocal()
    try:
        print("--- DIAGNÓSTICO DE CHAVES ---")
        
        # 1. Verificar Agentes
        agents = db.query(AIAgent).all()
        print(f"Total de Agentes encontrados: {len(agents)}")
        
        for agent in agents:
            print(f"\nAgente: {agent.name} (ID: {agent.id})")
            print(f"  Vínculo Cliente ID: {agent.cliente_id}")
            
            if agent.cliente_id:
                cliente = db.query(Cliente).filter(Cliente.id == agent.cliente_id).first()
                if cliente:
                    key_status = "CONFIGURADA (mascarada: " + cliente.openai_api_key[:6] + "...)" if cliente.openai_api_key else "VAZIA"
                    print(f"  Cliente: {cliente.nome}")
                    print(f"  Chave no Cliente: {key_status}")
                else:
                    print("  ERRO: Cliente vinculado não encontrado no banco!")
            
            # 2. Verificar Tenant
            tenant = db.query(Tenant).filter(Tenant.id == agent.tenant_id).first()
            if tenant:
                tenant_key_status = "CONFIGURADA" if tenant.openai_api_key else "VAZIA"
                print(f"  Chave na Empresa (Tenant): {tenant_key_status}")
        
        # 3. Global
        global_key = "CONFIGURADA" if settings.OPENAI_API_KEY else "VAZIA"
        print(f"\nChave Global (.env): {global_key}")
        
    finally:
        db.close()

if __name__ == "__main__":
    debug_keys()
