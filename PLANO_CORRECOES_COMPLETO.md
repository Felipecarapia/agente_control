# Plano Completo de Correções End-to-End - Sistemaxi CRM

## ✅ FASE 0 - Concluída
- Mapeamento de endpoints realizado
- Script `map_endpoints.py` criado
- Problemas identificados documentados

## ✅ FASE 1 - Concluída
- ✅ Padrão global de resposta JSON implementado
- ✅ Error handler global melhorado
- ✅ Request ID middleware funcionando
- ✅ Content-Type validation middleware criado
- ✅ `deals.py` corrigido para usar `error_response` com `request_id`
- ✅ Health check `/api/v1/health` implementado

## 🔄 FASE 2 - Em Progresso
### Correções Necessárias:

1. **Validação de Body em POST/PATCH/PUT**
   - ✅ Middleware de Content-Type criado
   - ⚠️ Verificar se todos os endpoints têm schemas Pydantic
   - ⚠️ Garantir que erros de validação retornam 400 (não 500)

2. **Auth/Session**
   - ✅ `get_current_user` já existe
   - ⚠️ Verificar se todos os endpoints protegidos usam corretamente
   - ⚠️ Garantir que 401/403 retornam JSON padronizado

3. **DB/Migrations/Seed**
   - ✅ Bootstrap idempotente implementado
   - ⚠️ Verificar se todas as dependências têm seed
   - ⚠️ Garantir que banco vazio não quebra

## 📋 FASE 3 - Pendente
### Mapear /api/v1 Frontend x Backend

**Ação**: Executar `python scripts/map_endpoints.py` e corrigir divergências

## ✅ FASE 4 - Concluída
- ✅ `/api/v1/health` implementado com check real de DB
- ✅ Retorna JSON padronizado
- ✅ Logs DEV com requestId + stacktrace

## 🔄 FASE 5 - Parcialmente Concluída
### Frontend à Prova de Falha

**Já Implementado:**
- ✅ `apiClient` único e robusto
- ✅ Tratamento de timeout vs network error
- ✅ Logs detalhados de erros

**Pendente:**
- ⚠️ Garantir que todas as chamadas usam `apiClient` (não `fetch` direto)
- ⚠️ Criar componente `<AsyncState>` para loading/error/empty
- ⚠️ Implementar tratamento de `meta.requiresSetup`

## ✅ FASE 6 - Concluída
- ✅ Bootstrap idempotente implementado
- ✅ Roles padrão criadas automaticamente
- ✅ Pipeline padrão criado automaticamente
- ✅ Task database padrão criado automaticamente

## 📋 FASE 7 - Pendente
### Execução Controlada por Módulo

**Módulos a Corrigir:**
1. Tarefas ✅ (já corrigido anteriormente)
2. Contratos ✅ (já corrigido anteriormente)
3. Roles e Permissões ✅ (já corrigido anteriormente)
4. Funil (Deals) 🔄 (em progresso)
5. Clientes
6. Projetos
7. Propostas
8. Leads
9. Usuários
10. Notificações

## 📋 FASE 8 - Pendente
### Trava Anti-Regressão

**Ações Necessárias:**
1. Criar smoke tests básicos
2. Script verificador de endpoints
3. Garantir que nenhum endpoint retorna HTML (exceto export PDF)

## 🎯 Status Geral

### ✅ Implementado:
- Padrão de resposta JSON global
- Error handler global
- Request ID em todas as respostas
- Content-Type validation
- Health check real
- Bootstrap idempotente
- apiClient robusto no frontend

### ⚠️ Pendente:
- Garantir uso consistente em TODOS os endpoints
- Smoke tests
- Verificação automática de endpoints
- Componente AsyncState no frontend
- Tratamento de requiresSetup

## 📝 Próximos Passos Imediatos

1. **Auditar todos os endpoints POST/PATCH/PUT**
   - Garantir que usam `error_response` com `request_id`
   - Verificar validação com Pydantic

2. **Executar script de mapeamento**
   - Identificar endpoints faltando
   - Corrigir divergências

3. **Criar smoke tests básicos**
   - GET /api/v1/health
   - GET endpoints principais
   - POST de criação mínima

4. **Melhorar frontend**
   - Componente AsyncState
   - Tratamento de requiresSetup
   - Garantir uso único de apiClient

