#!/usr/bin/env python3
"""
Script para mapear endpoints do backend e frontend
Identifica divergências e gera relatório
"""
import re
import os
from pathlib import Path
from collections import defaultdict

# Diretórios
BACKEND_DIR = Path(__file__).parent.parent / "app" / "api" / "v1"
FRONTEND_DIR = Path(__file__).parent.parent.parent / "frontend" / "src"

def extract_backend_endpoints():
    """Extrai todos os endpoints do backend"""
    endpoints = []
    
    for file_path in BACKEND_DIR.rglob("*.py"):
        if file_path.name == "__init__.py":
            continue
        
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            
            # Buscar @router.get, @router.post, etc.
            pattern = r'@router\.(get|post|put|patch|delete)\("([^"]+)"'
            matches = re.findall(pattern, content)
            
            for method, path in matches:
                # Buscar prefix do router
                prefix_match = re.search(r'router\s*=\s*APIRouter\(prefix=["\']([^"\']+)["\']', content)
                prefix = prefix_match.group(1) if prefix_match else ""
                
                full_path = f"{prefix}{path}"
                endpoints.append({
                    "file": str(file_path.relative_to(BACKEND_DIR.parent.parent)),
                    "method": method.upper(),
                    "path": full_path,
                    "full_path": f"/api/v1{full_path}" if not full_path.startswith("/api") else full_path
                })
    
    return endpoints

def extract_frontend_endpoints():
    """Extrai todas as chamadas de API do frontend"""
    endpoints = []
    
    # Buscar arquivos .ts e .tsx
    for ext in ["ts", "tsx"]:
        for file_path in FRONTEND_DIR.rglob(f"*.{ext}"):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                    
                    # Buscar api("/path") ou apiClient("/path") ou api<Type>("/path")
                    # Padrões mais abrangentes
                    patterns = [
                        r'(?:api|apiClient)\s*<[^>]+>\s*\(["\']([^"\']+)["\']',  # api<Type>("/path")
                        r'(?:api|apiClient)\s*\(["\']([^"\']+)["\']',  # api("/path")
                        r'api\s*\(["\']([^"\']+)["\']',  # api("/path") sem apiClient
                        r'api\s*\(`([^`]+)`',  # api(`/path`) template string
                        r'["\'](/api/v1/[^"\']+)["\']',  # "/api/v1/..."
                        r'`(/api/v1/[^`]+)`',  # `/api/v1/...` template string
                    ]
                    matches = []
                    for pattern in patterns:
                        found = re.findall(pattern, content)
                        matches.extend(found)
                    
                    # Remover duplicatas mantendo ordem
                    seen = set()
                    unique_matches = []
                    for match in matches:
                        # Normalizar path
                        path = match.strip()
                        if path.startswith("/api"):
                            if path not in seen:
                                seen.add(path)
                                unique_matches.append(path)
                    matches = unique_matches
                    
                    for path in matches:
                        # Normalizar path
                        if path.startswith("/api/v1"):
                            full_path = path
                        elif path.startswith("/api"):
                            full_path = path
                        else:
                            full_path = f"/api/v1{path}" if not path.startswith("/") else f"/api/v1/{path}"
                        
                        endpoints.append({
                            "file": str(file_path.relative_to(FRONTEND_DIR)),
                            "path": full_path
                        })
            except Exception as e:
                print(f"Erro ao ler {file_path}: {e}")
    
    return endpoints

def generate_report():
    """Gera relatório de mapeamento"""
    backend_endpoints = extract_backend_endpoints()
    frontend_endpoints = extract_frontend_endpoints()
    
    # Agrupar por path
    backend_by_path = defaultdict(list)
    for ep in backend_endpoints:
        backend_by_path[ep["full_path"]].append(ep)
    
    frontend_by_path = defaultdict(list)
    for ep in frontend_endpoints:
        frontend_by_path[ep["path"]].append(ep)
    
    # Encontrar divergências
    missing_in_backend = []
    missing_in_frontend = []
    
    for path, frontend_calls in frontend_by_path.items():
        if path not in backend_by_path:
            missing_in_backend.append({
                "path": path,
                "called_by": frontend_calls
            })
    
    for path, backend_defs in backend_by_path.items():
        if path not in frontend_by_path:
            missing_in_frontend.append({
                "path": path,
                "defined_in": backend_defs
            })
    
    # Gerar relatório
    report = []
    report.append("=" * 80)
    report.append("MAPEAMENTO DE ENDPOINTS - BACKEND vs FRONTEND")
    report.append("=" * 80)
    report.append("")
    
    report.append(f"📊 ESTATÍSTICAS")
    report.append(f"  Backend: {len(backend_endpoints)} endpoints")
    report.append(f"  Frontend: {len(frontend_endpoints)} chamadas")
    report.append(f"  Paths únicos backend: {len(backend_by_path)}")
    report.append(f"  Paths únicos frontend: {len(frontend_by_path)}")
    report.append("")
    
    report.append(f"⚠️  ENDPOINTS CHAMADOS PELO FRONTEND MAS NÃO ENCONTRADOS NO BACKEND ({len(missing_in_backend)})")
    report.append("-" * 80)
    if missing_in_backend:
        for item in missing_in_backend[:20]:  # Limitar a 20
            report.append(f"  {item['path']}")
            for call in item['called_by'][:3]:
                report.append(f"    → Chamado em: {call['file']}")
    else:
        report.append("  ✅ Nenhum problema encontrado!")
    report.append("")
    
    report.append(f"ℹ️  ENDPOINTS DEFINIDOS NO BACKEND MAS NÃO USADOS NO FRONTEND ({len(missing_in_frontend)})")
    report.append("-" * 80)
    if missing_in_frontend:
        for item in missing_in_frontend[:20]:  # Limitar a 20
            report.append(f"  {item['path']}")
            for defn in item['defined_in'][:2]:
                report.append(f"    → Definido em: {defn['file']} ({defn['method']})")
    else:
        report.append("  ℹ️  Todos os endpoints do backend são usados")
    report.append("")
    
    report.append("=" * 80)
    
    return "\n".join(report)

if __name__ == "__main__":
    print(generate_report())

