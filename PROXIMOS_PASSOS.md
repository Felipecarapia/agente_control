# Próximos Passos - Sistemaxi CRM

## 📊 Status Atual

### ✅ Fases Concluídas:
- **FASE 0**: Mapeamento de endpoints ✅
- **FASE 1**: Padrão global de response + error handler ✅
- **FASE 4**: Healthcheck real + diagnóstico ✅
- **FASE 6**: Seed/bootstrap idempotente ✅

### 🔄 Fases Em Progresso:
- **FASE 2**: Corrigir POST/PATCH/PUT/DELETE (4 causas clássicas) 🔄
- **FASE 7**: Execução controlada por módulo 🔄

### 📋 Fases Pendentes:
- **FASE 3**: Mapear /api/v1 frontend x backend
- **FASE 5**: Frontend à prova de falha (parcial)
- **FASE 8**: Trava anti-regressão

---

## 🎯 Próximos Passos Imediatos (Prioridade)

### 1. **FASE 2 - Finalizar Correções POST/PATCH/PUT/DELETE** 🔄

**Ações Necessárias:**

#### A) Validação de Body
- [ ] Auditar todos os endpoints POST/PATCH/PUT para garantir:
  - Todos têm schemas Pydantic definidos
  - Erros de validação retornam 400 (não 500)
  - `ValidationError` é tratado corretamente

#### B) Auth/Session
- [ ] Verificar se todos os endpoints protegidos usam `get_current_user` corretamente
- [ ] Garantir que 401/403 retornam JSON padronizado (não HTML)
- [ ] Testar endpoints sem autenticação para garantir resposta correta

#### C) DB/Migrations/Seed
- [ ] Verificar se todas as dependências têm seed idempotente
- [ ] Garantir que banco vazio não quebra nenhum endpoint
- [ ] Testar criação de recursos com dependências ausentes

**Arquivos a Auditar:**
- `backend/app/api/v1/*.py` - Todos os arquivos de endpoints

---

### 2. **FASE 3 - Mapear /api/v1 Frontend x Backend** 📋

**Ações Necessárias:**
- [ ] Executar script: `python scripts/map_endpoints.py`
- [ ] Identificar endpoints chamados no frontend que não existem no backend
- [ ] Identificar endpoints no backend que não são chamados
- [ ] Corrigir divergências de path/method
- [ ] Garantir que todos os endpoints retornam JSON padronizado

**Script Disponível:**
- `scripts/map_endpoints.py` ou `backend/scripts/map_endpoints.py`

---

### 3. **FASE 5 - Frontend à Prova de Falha** 🔄

**Ações Necessárias:**

#### A) Garantir Uso Único de apiClient
- [ ] Buscar por `fetch(` e `axios(` no frontend
- [ ] Migrar todas as chamadas para `apiClient` (via `api()` helper)
- [ ] Remover imports de `axios` se não forem mais necessários

**Arquivos com `fetch` direto encontrados:**
- `frontend/src/lib/api.ts` - `uploadPropostaImage` (pode ser necessário manter para FormData)
- `frontend/src/components/profile/AvatarUpload.tsx` - Verificar se pode usar apiClient
- `frontend/src/components/tarefas/TaskAttachments.tsx` - Verificar se pode usar apiClient

#### B) Criar Componente `<AsyncState>`
- [ ] Criar componente reutilizável para loading/error/empty states
- [ ] Substituir padrões repetidos de loading/error em todas as páginas
- [ ] Incluir suporte para `meta.requiresSetup` com CTA

**Localização Sugerida:**
- `frontend/src/components/ui/async-state.tsx`

#### C) Tratamento de `meta.requiresSetup`
- [ ] Verificar todas as páginas que podem retornar `meta.requiresSetup`
- [ ] Implementar EmptyState com CTA quando necessário
- [ ] Remover `alert()` bloqueantes (substituir por toast ou EmptyState)

**Arquivos com `alert()` encontrados:**
- `frontend/src/app/(dashboard)/dashboard/propostas/page.tsx`
- `frontend/src/app/(dashboard)/dashboard/clientes/page.tsx`

---

### 4. **FASE 7 - Finalizar Módulos Restantes** 🔄

**Módulos Já Corrigidos:**
- ✅ Dashboard
- ✅ Notificações
- ✅ Inteligência de Vendas
- ✅ Leads
- ✅ Clientes
- ✅ Funil de Vendas
- ✅ Projetos
- ✅ Tarefas
- ✅ Propostas
- ✅ Contratos
- ✅ Usuários
- ✅ Roles e Permissões

**Módulos Pendentes (Verificar):**
- [ ] Mensagens (`/dashboard/mensagens`)
- [ ] Onboarding (`/dashboard/clientes/[id]` - aba onboarding)
- [ ] Tracking/Analytics (se existir)
- [ ] Configurações gerais (se existir)

---

### 5. **FASE 8 - Trava Anti-Regressão** 📋

**Ações Necessárias:**

#### A) Smoke Tests Básicos
- [ ] Criar arquivo `tests/smoke_test.py` ou `scripts/smoke_test.py`
- [ ] Testar GET `/api/v1/health` (deve retornar `{ok: true, data: {app: true, db: true}}`)
- [ ] Testar GET endpoints principais (clientes, projetos, tarefas, contratos, roles, permissions)
- [ ] Testar POST de criação mínima por módulo
- [ ] Garantir que todos retornam JSON padronizado

#### B) Script Verificador de Endpoints
- [ ] Melhorar `map_endpoints.py` para:
  - Falhar build/test se endpoint chamado não existir
  - Verificar métodos HTTP suportados
  - Validar que todos retornam JSON (não HTML)

#### C) Garantir JSON em Todos Endpoints
- [ ] Auditar todos os endpoints para garantir que nunca retornam HTML
- [ ] Exceção: endpoints de export PDF podem retornar PDF
- [ ] Verificar error handler global para garantir JSON sempre

---

## 🔍 Verificações Adicionais

### Backend:
- [ ] Verificar se todos os endpoints têm `request_id` nas respostas
- [ ] Garantir que nenhum endpoint usa `raise HTTPException` diretamente
- [ ] Verificar serialização de Decimal/BigInt/Date em todos os endpoints
- [ ] Testar endpoints com banco vazio

### Frontend:
- [ ] Remover todos os `alert()` e substituir por toast ou EmptyState
- [ ] Garantir `setLoading(false)` em todos os `finally` blocks
- [ ] Verificar se todos os componentes têm empty states
- [ ] Testar navegação entre módulos sem erros no console

---

## 📝 Ordem de Execução Recomendada

1. **Primeiro**: Finalizar FASE 2 (auditar POST/PATCH/PUT/DELETE)
2. **Segundo**: Executar FASE 3 (mapear endpoints)
3. **Terceiro**: Completar FASE 5 (frontend à prova de falha)
4. **Quarto**: Verificar módulos restantes da FASE 7
5. **Quinto**: Implementar FASE 8 (trava anti-regressão)

---

## 🚨 Problemas Conhecidos a Resolver

1. **Erro 422 em `/api/v1/task-notion/databases/default`**
   - ✅ Corrigido: Adicionado `Request` e `request_id`
   - ⚠️ Verificar se ainda ocorre após reiniciar servidor

2. **Loops infinitos na agenda/calendário**
   - ✅ Corrigido: Adicionado `useMemo` para datas
   - ⚠️ Verificar se ainda ocorre após reiniciar servidor

3. **Internal Server Error no Next.js**
   - ✅ Cache removido (`.next` deletado)
   - ⚠️ Reiniciar servidor de desenvolvimento

4. **Uso de `alert()` em vez de toast/EmptyState**
   - ⚠️ Substituir em `propostas/page.tsx` e `clientes/page.tsx`

---

## 📊 Métricas de Progresso

- **Fases Concluídas**: 4 de 8 (50%)
- **Módulos Corrigidos**: 12 de ~15 (80%)
- **Endpoints Padronizados**: ~90% (estimativa)
- **Frontend usando apiClient**: ~95% (estimativa)

---

## 🎯 Meta Final

**Objetivo**: Sistema 100% funcional sem erros no console ou network, com:
- ✅ Todos os endpoints retornando JSON padronizado
- ✅ Zero erros 500/404/405 inesperados
- ✅ Banco vazio não quebra o sistema
- ✅ Frontend robusto com tratamento de erros adequado
- ✅ Smoke tests garantindo qualidade

