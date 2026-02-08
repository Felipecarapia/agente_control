#!/usr/bin/env python3
"""
Script para mapear todos os endpoints /api/v1 do backend e frontend.
Gera um relatório de endpoints consumidos vs disponíveis.
"""
import os
import re
import sys
from pathlib import Path
from collections import defaultdict

# Adicionar o diretório raiz ao path
root_dir = Path(__file__).parent.parent
sys.path.insert(0, str(root_dir))

backend_dir = root_dir / "backend" / "app" / "api" / "v1"
frontend_dir = root_dir / "frontend" / "src"

# Mapear endpoints do backend
backend_endpoints = defaultdict(set)  # path -> set of methods

def scan_backend():
    """Escaneia arquivos Python no backend para encontrar rotas."""
    if not backend_dir.exists():
        print(f"⚠️  Backend dir não encontrado: {backend_dir}")
        return
    
    for py_file in backend_dir.rglob("*.py"):
        if py_file.name == "__init__.py":
            continue
        
        try:
            content = py_file.read_text(encoding="utf-8")
            
            # Buscar @router.get, @router.post, etc
            router_pattern = r'@router\.(get|post|put|patch|delete|head|options)\s*\(["\']([^"\']+)["\']'
            matches = re.findall(router_pattern, content)
            
            for method, path in matches:
                # Normalizar path (remover prefixo se houver)
                if path.startswith("/"):
                    full_path = f"/api/v1{path}"
                else:
                    full_path = f"/api/v1/{path}"
                
                backend_endpoints[full_path].add(method.upper())
        except Exception as e:
            print(f"⚠️  Erro ao processar {py_file}: {e}")

# Mapear chamadas do frontend
frontend_calls = defaultdict(set)  # path -> set of methods

def scan_frontend():
    """Escaneia arquivos TypeScript/JavaScript no frontend para encontrar chamadas de API."""
    if not frontend_dir.exists():
        print(f"⚠️  Frontend dir não encontrado: {frontend_dir}")
        return
    
    patterns = [
        (r'["\'](/api/v1/[^"\']+)["\']', "GET"),  # Padrão básico
        (r'api\s*\(["\'](/api/v1/[^"\']+)["\']', "GET"),  # api("/api/v1/...")
        (r'apiClient\s*\(["\'](/api/v1/[^"\']+)["\']', "GET"),  # apiClient("/api/v1/...")
        (r'method:\s*["\']([A-Z]+)["\'].*["\'](/api/v1/[^"\']+)["\']', None),  # method: "POST", path
    ]
    
    for ts_file in frontend_dir.rglob("*.{ts,tsx,js,jsx}"):
        if "node_modules" in str(ts_file):
            continue
        
        try:
            content = ts_file.read_text(encoding="utf-8")
            
            # Buscar chamadas de API
            for pattern, default_method in patterns:
                matches = re.finditer(pattern, content)
                for match in matches:
                    if default_method:
                        method = default_method
                        path = match.group(1)
                    else:
                        method = match.group(1)
                        path = match.group(2)
                    
                    # Normalizar path
                    if not path.startswith("/api/v1"):
                        continue
                    
                    frontend_calls[path].add(method.upper())
        except Exception as e:
            print(f"⚠️  Erro ao processar {ts_file}: {e}")

def generate_report():
    """Gera relatório de endpoints."""
    print("=" * 80)
    print("MAPEAMENTO DE ENDPOINTS /api/v1")
    print("=" * 80)
    print()
    
    print("📊 BACKEND - Endpoints Disponíveis:")
    print("-" * 80)
    if backend_endpoints:
        for path in sorted(backend_endpoints.keys()):
            methods = sorted(backend_endpoints[path])
            print(f"  {path:50} [{', '.join(methods)}]")
    else:
        print("  ⚠️  Nenhum endpoint encontrado")
    print()
    
    print("📱 FRONTEND - Endpoints Chamados:")
    print("-" * 80)
    if frontend_calls:
        for path in sorted(frontend_calls.keys()):
            methods = sorted(frontend_calls[path])
            print(f"  {path:50} [{', '.join(methods)}]")
    else:
        print("  ⚠️  Nenhuma chamada encontrada")
    print()
    
    # Comparar
    print("🔍 ANÁLISE:")
    print("-" * 80)
    
    backend_paths = set(backend_endpoints.keys())
    frontend_paths = set(frontend_calls.keys())
    
    missing_in_backend = frontend_paths - backend_paths
    not_used_in_frontend = backend_paths - frontend_paths
    
    if missing_in_backend:
        print(f"⚠️  {len(missing_in_backend)} endpoints chamados no frontend mas NÃO existem no backend:")
        for path in sorted(missing_in_backend):
            methods = sorted(frontend_calls[path])
            print(f"    ❌ {path} [{', '.join(methods)}]")
    else:
        print("✅ Todos os endpoints chamados no frontend existem no backend")
    
    print()
    
    if not_used_in_frontend:
        print(f"ℹ️  {len(not_used_in_frontend)} endpoints no backend mas NÃO usados no frontend:")
        for path in sorted(not_used_in_frontend):
            methods = sorted(backend_endpoints[path])
            print(f"    ⚠️  {path} [{', '.join(methods)}]")
    else:
        print("✅ Todos os endpoints do backend são usados no frontend")
    
    print()
    print("=" * 80)

if __name__ == "__main__":
    print("🔍 Escaneando backend...")
    scan_backend()
    
    print("🔍 Escaneando frontend...")
    scan_frontend()
    
    print()
    generate_report()
    
    # Exit code baseado em erros encontrados
    if missing_in_backend:
        sys.exit(1)
    sys.exit(0)

