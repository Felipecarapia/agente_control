# Sistemaxi CRM

ERP/CRM para gerenciamento de projetos.

## Stack

- **Backend:** FastAPI, PostgreSQL, SQLAlchemy, Alembic, JWT
- **Frontend:** Next.js (App Router), Tailwind CSS, shadcn/ui, Motion, tema escuro/claro

## Pré-requisitos

- Python 3.11+
- Node.js 18+
- PostgreSQL

## Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
cp .env.example .env
# Edite .env com DATABASE_URL e SECRET_KEY
alembic upgrade head   # aplica todas as migrations (obrigatório após alterações no schema)
python -m app.seed   # cria o primeiro usuário admin (email/senha do .env: ADMIN_EMAIL, ADMIN_PASSWORD)
uvicorn app.main:app --reload
```

Se aparecer erro ao salvar cliente (coluna "tipo" não existe), rode `alembic upgrade head` para aplicar a migration 002. O seed cria o primeiro usuário só se a tabela `usuarios` estiver vazia. Credenciais padrão (ou as do seu `.env`): `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edite .env.local com NEXT_PUBLIC_API_URL (ex: http://localhost:8000)
npm run dev
```

Acesse http://localhost:3000 e faça login.

## Entidades

- Usuários, Clientes, Projetos, Tarefas, Propostas, Contratos

Auth e token são gerenciados pelo backend (JWT). O frontend envia o token no header `Authorization: Bearer <token>`.
