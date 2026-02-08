#!/usr/bin/env python3
"""
Smoke tests completos para validar que o sistema está funcionando.
Testa endpoints críticos e garante que não há erros 500/404/405.
"""
import sys
import os
import requests
import json
from typing import Dict, Any, Optional

# Adicionar o diretório backend ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BASE_URL = os.getenv("API_URL", "http://localhost:8000")
API_BASE = f"{BASE_URL}/api/v1"

# Token de autenticação (será obtido via login)
auth_token: Optional[str] = None


def print_test(name: str):
    """Imprime nome do teste."""
    print(f"\n{'='*60}")
    print(f"TESTE: {name}")
    print(f"{'='*60}")


def make_request(
    method: str,
    endpoint: str,
    data: Optional[Dict] = None,
    params: Optional[Dict] = None,
    expected_status: int = 200,
    require_auth: bool = True
) -> Dict[str, Any]:
    """Faz uma requisição e valida a resposta."""
    url = f"{API_BASE}{endpoint}"
    headers = {
        "Content-Type": "application/json",
    }
    if require_auth and auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, params=params, timeout=10)
        elif method.upper() == "POST":
            response = requests.post(url, headers=headers, json=data, params=params, timeout=10)
        elif method.upper() == "PATCH":
            response = requests.patch(url, headers=headers, json=data, params=params, timeout=10)
        else:
            raise ValueError(f"Método não suportado: {method}")
        
        # Validar status code
        if response.status_code != expected_status:
            print(f"❌ Status code inesperado: esperado {expected_status}, recebido {response.status_code}")
            print(f"   Resposta: {response.text[:500]}")
            return {"ok": False, "error": f"Status {response.status_code}"}
        
        # Tentar parsear JSON
        try:
            response_data = response.json()
        except:
            print(f"⚠️  Resposta não é JSON válido: {response.text[:200]}")
            return {"ok": False, "error": "Resposta não é JSON"}
        
        # Validar formato padronizado
        if "ok" in response_data:
            if response_data["ok"]:
                print(f"✅ {method} {endpoint} - OK")
                return {"ok": True, "data": response_data.get("data")}
            else:
                error = response_data.get("error", {})
                print(f"❌ {method} {endpoint} - Erro: {error.get('message', 'Erro desconhecido')}")
                return {"ok": False, "error": error}
        else:
            # Formato antigo (sem ok) - aceitar se status for 200
            if response.status_code == 200:
                print(f"✅ {method} {endpoint} - OK (formato antigo)")
                return {"ok": True, "data": response_data}
            else:
                print(f"❌ {method} {endpoint} - Status {response.status_code} sem formato padronizado")
                return {"ok": False, "error": response_data}
    
    except requests.exceptions.ConnectionError:
        print(f"❌ {method} {endpoint} - Erro de conexão (backend não está rodando?)")
        return {"ok": False, "error": "ConnectionError"}
    except requests.exceptions.Timeout:
        print(f"❌ {method} {endpoint} - Timeout")
        return {"ok": False, "error": "Timeout"}
    except Exception as e:
        print(f"❌ {method} {endpoint} - Exceção: {str(e)}")
        return {"ok": False, "error": str(e)}


def test_health():
    """Testa endpoint de health."""
    print_test("Health Check")
    result = make_request("GET", "/health", require_auth=False, expected_status=200)
    if result["ok"]:
        data = result.get("data", {})
        if data.get("db"):
            print("   ✅ Banco de dados conectado")
        else:
            print("   ⚠️  Banco de dados offline")
    return result["ok"]


def test_login():
    """Testa login e obtém token."""
    print_test("Login")
    global auth_token
    
    # Tentar login com credenciais padrão
    email = os.getenv("ADMIN_EMAIL", "admin@sistemaxi.com")
    password = os.getenv("ADMIN_PASSWORD", "admin123")
    
    result = make_request(
        "POST",
        "/auth/login",
        data={"email": email, "password": password},
        require_auth=False,
        expected_status=200
    )
    
    if result["ok"]:
        data = result.get("data", {})
        if isinstance(data, dict) and "access_token" in data:
            auth_token = data["access_token"]
            print(f"   ✅ Token obtido: {auth_token[:20]}...")
            return True
        elif isinstance(data, str):
            # Token direto
            auth_token = data
            print(f"   ✅ Token obtido: {auth_token[:20]}...")
            return True
        else:
            print(f"   ❌ Token não encontrado na resposta: {data}")
            return False
    else:
        print("   ⚠️  Login falhou (pode ser normal se usuário não existe)")
        return False


def test_profile():
    """Testa endpoint de perfil."""
    print_test("Perfil do Usuário")
    if not auth_token:
        print("   ⚠️  Pulando (sem token)")
        return True
    
    result = make_request("GET", "/profile/me")
    return result["ok"]


def test_pipelines():
    """Testa listagem de pipelines."""
    print_test("Listar Pipelines")
    result = make_request("GET", "/pipelines")
    if result["ok"]:
        data = result.get("data", [])
        if isinstance(data, list):
            print(f"   ✅ {len(data)} pipeline(s) encontrado(s)")
            if len(data) == 0:
                print("   ⚠️  Nenhum pipeline (bootstrap deve criar um)")
        else:
            print(f"   ⚠️  Resposta não é lista: {type(data)}")
    return result["ok"]


def test_deals_kanban():
    """Testa endpoint de kanban."""
    print_test("Kanban de Deals")
    # Primeiro, obter um pipeline
    pipelines_result = make_request("GET", "/pipelines")
    if pipelines_result["ok"]:
        pipelines = pipelines_result.get("data", [])
        if isinstance(pipelines, list) and len(pipelines) > 0:
            pipeline_id = pipelines[0]["id"]
            result = make_request("GET", f"/deals/kanban", params={"pipelineId": pipeline_id})
            if result["ok"]:
                data = result.get("data", {})
                if data and "stages" in data:
                    print(f"   ✅ Kanban carregado: {len(data.get('stages', []))} etapas")
                else:
                    print(f"   ⚠️  Resposta vazia ou inválida")
            return result["ok"]
        else:
            print("   ⚠️  Nenhum pipeline disponível para testar kanban")
            return True  # Não é erro, apenas não há dados
    return True


def test_clientes():
    """Testa listagem de clientes."""
    print_test("Listar Clientes")
    result = make_request("GET", "/clientes")
    if result["ok"]:
        data = result.get("data", [])
        if isinstance(data, list):
            print(f"   ✅ {len(data)} cliente(s) encontrado(s)")
    return result["ok"]


def test_tarefas():
    """Testa listagem de tarefas."""
    print_test("Listar Tarefas")
    result = make_request("GET", "/tarefas")
    if result["ok"]:
        data = result.get("data", [])
        if isinstance(data, list):
            print(f"   ✅ {len(data)} tarefa(s) encontrada(s)")
    return result["ok"]


def test_propostas():
    """Testa listagem de propostas."""
    print_test("Listar Propostas")
    result = make_request("GET", "/propostas")
    if result["ok"]:
        data = result.get("data", [])
        if isinstance(data, list):
            print(f"   ✅ {len(data)} proposta(s) encontrada(s)")
    return result["ok"]


def test_projetos():
    """Testa listagem de projetos."""
    print_test("Listar Projetos")
    result = make_request("GET", "/projetos")
    if result["ok"]:
        data = result.get("data", [])
        if isinstance(data, list):
            print(f"   ✅ {len(data)} projeto(s) encontrado(s)")
    return result["ok"]


def test_analytics():
    """Testa endpoint de analytics."""
    print_test("Analytics - Inteligência de Vendas")
    result = make_request("GET", "/analytics/inteligencia-vendas")
    if result["ok"]:
        data = result.get("data", {})
        if data and "sankey_nodes" in data:
            print(f"   ✅ Analytics carregado: {len(data.get('sankey_nodes', []))} nós")
    return result["ok"]


def main():
    """Executa todos os smoke tests."""
    print("\n" + "="*60)
    print("SMOKE TESTS - Sistemaxi CRM")
    print("="*60)
    print(f"Base URL: {BASE_URL}")
    print(f"API Base: {API_BASE}")
    
    results = {}
    
    # Testes básicos (não requerem auth)
    results["health"] = test_health()
    
    # Testes que requerem auth
    results["login"] = test_login()
    
    if results["login"]:
        results["profile"] = test_profile()
        results["pipelines"] = test_pipelines()
        results["deals_kanban"] = test_deals_kanban()
        results["clientes"] = test_clientes()
        results["tarefas"] = test_tarefas()
        results["propostas"] = test_propostas()
        results["projetos"] = test_projetos()
        results["analytics"] = test_analytics()
    else:
        print("\n⚠️  Login falhou - pulando testes que requerem autenticação")
        print("   Execute o seed primeiro: cd backend && python -m app.seed")
    
    # Resumo
    print("\n" + "="*60)
    print("RESUMO DOS TESTES")
    print("="*60)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASSOU" if result else "❌ FALHOU"
        print(f"  {test_name:20s} {status}")
    
    print(f"\nTotal: {passed}/{total} testes passaram")
    
    if passed == total:
        print("\n🎉 Todos os testes passaram!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} teste(s) falharam")
        return 1


if __name__ == "__main__":
    sys.exit(main())




