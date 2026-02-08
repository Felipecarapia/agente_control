#!/usr/bin/env python3
"""
Smoke test básico para validar endpoints críticos.
"""
import sys
import requests
import json
from typing import Dict, Any

BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1"

def test_endpoint(method: str, path: str, expected_status: int = 200, **kwargs) -> Dict[str, Any]:
    """Testa um endpoint e retorna resultado."""
    url = f"{API_BASE}{path}"
    try:
        if method.upper() == "GET":
            res = requests.get(url, timeout=5, **kwargs)
        elif method.upper() == "POST":
            res = requests.post(url, timeout=5, **kwargs)
        elif method.upper() == "PATCH":
            res = requests.patch(url, timeout=5, **kwargs)
        elif method.upper() == "DELETE":
            res = requests.delete(url, timeout=5, **kwargs)
        else:
            return {"ok": False, "error": f"Método {method} não suportado"}
        
        result = {
            "ok": res.status_code == expected_status,
            "status": res.status_code,
            "expected": expected_status,
            "path": path,
        }
        
        if res.status_code != expected_status:
            try:
                result["response"] = res.json()
            except:
                result["response"] = res.text[:200]
        
        return result
    except requests.exceptions.ConnectionError:
        return {"ok": False, "error": "Não foi possível conectar ao servidor", "path": path}
    except requests.exceptions.Timeout:
        return {"ok": False, "error": "Timeout ao conectar", "path": path}
    except Exception as e:
        return {"ok": False, "error": str(e), "path": path}

def main():
    """Executa smoke tests."""
    print("🧪 Executando smoke tests...\n")
    
    tests = [
        ("GET", "/health", 200),
        ("GET", "/clientes", 401),  # Deve retornar 401 sem auth
        ("GET", "/projetos", 401),
        ("GET", "/tarefas", 401),
        ("GET", "/pipelines", 401),
        ("GET", "/usuarios", 401),
    ]
    
    results = []
    for method, path, expected_status in tests:
        result = test_endpoint(method, path, expected_status)
        results.append(result)
        
        status = "✅" if result.get("ok") else "❌"
        error = result.get("error", "")
        status_code = result.get("status", "N/A")
        
        print(f"{status} {method} {path}")
        print(f"   Status: {status_code} (esperado: {expected_status})")
        if error:
            print(f"   Erro: {error}")
        if not result.get("ok") and "response" in result:
            print(f"   Resposta: {json.dumps(result['response'], indent=2)[:200]}")
        print()
    
    # Resumo
    passed = sum(1 for r in results if r.get("ok"))
    total = len(results)
    
    print(f"\n📊 Resumo: {passed}/{total} testes passaram")
    
    if passed == total:
        print("✅ Todos os testes passaram!")
        return 0
    else:
        print(f"❌ {total - passed} teste(s) falharam")
        return 1

if __name__ == "__main__":
    sys.exit(main())




