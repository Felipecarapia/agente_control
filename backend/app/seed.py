"""
Cria o primeiro usuário admin e roles iniciais se não existirem.
Rodar após as migrations: cd backend && alembic upgrade head && python -m app.seed
"""
import sys

from sqlalchemy.exc import ProgrammingError

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.core.rbac import (
    ROLE_ADMIN, ROLE_PROJECT_MANAGER, ROLE_TRAFFIC_MANAGER,
    ROLE_MARKETING_MANAGER, ROLE_MARKETING, ROLE_DEVELOPMENT
)
from app.models.usuario import Usuario
from app.models.role import Role, UserRole
from app.models.permission import Permission, RolePermission
from app.models.pipeline import Pipeline, PipelineStage
from app.models.task_notion import TaskDatabase, TaskProperty, TaskView


def run_seed() -> None:
    db = SessionLocal()
    try:
        # Criar roles padrão se não existirem
        roles_data = [
            (ROLE_ADMIN, "Administrador"),
            (ROLE_PROJECT_MANAGER, "Gestor de Projetos"),
            (ROLE_TRAFFIC_MANAGER, "Gestor de Tráfego"),
            (ROLE_MARKETING_MANAGER, "Gestor de Marketing"),
            (ROLE_MARKETING, "Marketing"),
            (ROLE_DEVELOPMENT, "Desenvolvimento"),
        ]
        
        for role_key, role_name in roles_data:
            role = db.query(Role).filter(Role.key == role_key).first()
            if not role:
                role = Role(key=role_key, name=role_name)
                db.add(role)
                print(f"Role criada: {role_key} - {role_name}")
        
        db.commit()
        
        # Criar permissões padrão para cada módulo
        permissions_data = [
            # Clientes
            ("clientes", "create", "Criar Clientes", "Permite criar novos clientes"),
            ("clientes", "read", "Visualizar Clientes", "Permite visualizar lista e detalhes de clientes"),
            ("clientes", "update", "Editar Clientes", "Permite editar informações de clientes"),
            ("clientes", "delete", "Excluir Clientes", "Permite excluir clientes"),
            
            # Projetos
            ("projetos", "create", "Criar Projetos", "Permite criar novos projetos"),
            ("projetos", "read", "Visualizar Projetos", "Permite visualizar lista e detalhes de projetos"),
            ("projetos", "update", "Editar Projetos", "Permite editar informações de projetos"),
            ("projetos", "delete", "Excluir Projetos", "Permite excluir projetos"),
            ("projetos", "nudge", "Cobrar Projetos", "Permite enviar notificações de cobrança para membros do projeto"),
            
            # Tarefas
            ("tarefas", "create", "Criar Tarefas", "Permite criar novas tarefas"),
            ("tarefas", "read", "Visualizar Tarefas", "Permite visualizar lista e detalhes de tarefas"),
            ("tarefas", "update", "Editar Tarefas", "Permite editar informações de tarefas"),
            ("tarefas", "delete", "Excluir Tarefas", "Permite excluir tarefas"),
            
            # Propostas
            ("propostas", "create", "Criar Propostas", "Permite criar novas propostas"),
            ("propostas", "read", "Visualizar Propostas", "Permite visualizar lista e detalhes de propostas"),
            ("propostas", "update", "Editar Propostas", "Permite editar informações de propostas"),
            ("propostas", "delete", "Excluir Propostas", "Permite excluir propostas"),
            ("propostas", "upload", "Upload de Imagens", "Permite fazer upload de imagens em propostas"),
            
            # Contratos
            ("contratos", "create", "Criar Contratos", "Permite criar novos contratos"),
            ("contratos", "read", "Visualizar Contratos", "Permite visualizar lista e detalhes de contratos"),
            ("contratos", "update", "Editar Contratos", "Permite editar informações de contratos"),
            ("contratos", "delete", "Excluir Contratos", "Permite excluir contratos"),
            
            # Usuários
            ("usuarios", "create", "Criar Usuários", "Permite criar novos usuários"),
            ("usuarios", "read", "Visualizar Usuários", "Permite visualizar lista e detalhes de usuários"),
            ("usuarios", "update", "Editar Usuários", "Permite editar informações de usuários"),
            ("usuarios", "delete", "Excluir Usuários", "Permite excluir usuários"),
            
            # Notificações
            ("notificacoes", "read", "Visualizar Notificações", "Permite visualizar suas próprias notificações"),
            ("notificacoes", "send", "Enviar Notificações", "Permite enviar notificações para outros usuários"),
            
            # Mensagens
            ("mensagens", "read", "Visualizar Mensagens", "Permite visualizar mensagens diretas"),
            ("mensagens", "send", "Enviar Mensagens", "Permite enviar mensagens diretas"),
            
            # Roles e Permissões
            ("roles", "create", "Criar Roles", "Permite criar novas roles"),
            ("roles", "read", "Visualizar Roles", "Permite visualizar lista e detalhes de roles"),
            ("roles", "update", "Editar Roles", "Permite editar informações de roles e permissões"),
            ("roles", "delete", "Excluir Roles", "Permite excluir roles"),
            
            # Funil de Vendas (Pipeline)
            ("funil", "create", "Criar Deals", "Permite criar novos deals no funil"),
            ("funil", "read", "Visualizar Funil", "Permite visualizar pipeline e deals"),
            ("funil", "update", "Editar Deals", "Permite editar deals e movê-los entre etapas"),
            ("funil", "delete", "Excluir Deals", "Permite excluir deals"),
            
            # Financeiro — Contas a Pagar
            ("contas_pagar", "create", "Criar Contas a Pagar", "Permite criar novas contas a pagar"),
            ("contas_pagar", "read", "Visualizar Contas a Pagar", "Permite visualizar contas a pagar"),
            ("contas_pagar", "update", "Editar Contas a Pagar", "Permite editar contas a pagar"),
            ("contas_pagar", "delete", "Excluir Contas a Pagar", "Permite excluir contas a pagar"),
            ("contas_pagar", "pay", "Pagar Contas", "Permite marcar contas como pagas"),
            
            # Financeiro — Contas a Receber
            ("contas_receber", "create", "Criar Contas a Receber", "Permite criar novas contas a receber"),
            ("contas_receber", "read", "Visualizar Contas a Receber", "Permite visualizar contas a receber"),
            ("contas_receber", "update", "Editar Contas a Receber", "Permite editar contas a receber"),
            ("contas_receber", "delete", "Excluir Contas a Receber", "Permite excluir contas a receber"),
            ("contas_receber", "receive", "Receber Contas", "Permite marcar contas como recebidas"),
            
            # Financeiro — Resumo
            ("financeiro", "read", "Visualizar Resumo Financeiro", "Permite visualizar o resumo financeiro geral"),
        ]
        
        for module, action, name, description in permissions_data:
            permission = db.query(Permission).filter(
                Permission.module == module,
                Permission.action == action
            ).first()
            if not permission:
                permission = Permission(
                    module=module,
                    action=action,
                    name=name,
                    description=description
                )
                db.add(permission)
                print(f"Permissão criada: {module}.{action} - {name}")
        
        db.commit()
        
        # Atribuir todas as permissões ao ADMIN
        admin_role = db.query(Role).filter(Role.key == ROLE_ADMIN).first()
        if admin_role:
            all_permissions = db.query(Permission).all()
            for perm in all_permissions:
                existing = db.query(RolePermission).filter(
                    RolePermission.role_id == admin_role.id,
                    RolePermission.permission_id == perm.id
                ).first()
                if not existing:
                    role_perm = RolePermission(role_id=admin_role.id, permission_id=perm.id)
                    db.add(role_perm)
            db.commit()
            print(f"Todas as permissões atribuídas ao role ADMIN")
        
        # Criar primeiro usuário admin se não existir
        admin_user = None
        if db.query(Usuario).first() is not None:
            print("Já existem usuários.")
            # Atribuir ADMIN ao primeiro usuário se não tiver roles
            first_user = db.query(Usuario).first()
            admin_user = first_user
            has_admin = db.query(UserRole).join(Role).filter(
                UserRole.user_id == first_user.id,
                Role.key == ROLE_ADMIN
            ).first()
            if not has_admin:
                admin_role = db.query(Role).filter(Role.key == ROLE_ADMIN).first()
                if admin_role:
                    user_role = UserRole(user_id=first_user.id, role_id=admin_role.id)
                    db.add(user_role)
                    db.commit()
                    print(f"Role ADMIN atribuída ao usuário: {first_user.email}")
        else:
        
            admin = Usuario(
                email=settings.ADMIN_EMAIL,
                hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                nome=settings.ADMIN_NOME,
                ativo=True,
            )
            db.add(admin)
            db.flush()  # Para obter o ID
            admin_user = admin
            
            # Atribuir role ADMIN
            admin_role = db.query(Role).filter(Role.key == ROLE_ADMIN).first()
            if admin_role:
                user_role = UserRole(user_id=admin.id, role_id=admin_role.id)
                db.add(user_role)
            
            db.commit()
            print(f"Primeiro usuário admin criado: {settings.ADMIN_EMAIL}")
            print("Faça login com esse email e a senha definida em ADMIN_PASSWORD no .env")
        
        # Criar pipeline padrão "Vendas" se não existir
        try:
            default_pipeline = db.query(Pipeline).filter(Pipeline.is_default == True).first()
            if not default_pipeline:
                pipeline = Pipeline(
                    name="Vendas",
                    description="Pipeline padrão de vendas",
                    is_default=True,
                    created_by_user_id=admin_user.id if admin_user else None
                )
                db.add(pipeline)
                db.flush()
                
                # Criar stages padrão
                stages_data = [
                    ("Leads", "LEADS", 0, None, None),
                    ("Contato feito", "CONTACT_MADE", 1, None, None),
                    ("Diagnóstico", "DIAGNOSIS", 2, None, None),
                    ("Proposta enviada", "PROPOSAL_SENT", 3, None, None),
                    ("Negociação", "NEGOTIATION", 4, None, None),
                    ("Fechado - Ganho", "WON", 5, None, "#10B981"),
                    ("Fechado - Perdido", "LOST", 6, None, "#EF4444"),
                ]
                
                for name, key, order_index, wip_limit, color in stages_data:
                    stage = PipelineStage(
                        pipeline_id=pipeline.id,
                        name=name,
                        key=key,
                        order_index=order_index,
                        wip_limit=wip_limit,
                        color=color
                    )
                    db.add(stage)
                
                db.commit()
                print("✅ Pipeline padrão 'Vendas' criado com 7 etapas")
        except Exception as e:
            print(f"⚠️  Erro ao criar pipeline padrão (tabelas podem não existir ainda): {e}")
            db.rollback()
        
        # Criar Task Database padrão e properties iniciais
        try:
            default_db = db.query(TaskDatabase).filter(TaskDatabase.is_default == True).first()
            if not default_db:
                task_db = TaskDatabase(
                    name="Tarefas",
                    description="Base de tarefas padrão",
                    is_default=True,
                    created_by_user_id=admin_user.id if admin_user else None
                )
                db.add(task_db)
                db.flush()
                
                # Criar properties padrão
                properties_data = [
                    ("prioridade", "Prioridade", "SELECT", {"options": ["Baixa", "Média", "Alta", "Urgente"]}, 0, False),
                    ("status", "Status", "SELECT", {"options": ["Pendente", "Em Andamento", "Concluída", "Cancelada"]}, 1, False),
                    ("contexto", "Contexto", "TEXT", None, 2, False),
                    ("canal", "Canal", "SELECT", {"options": ["WhatsApp", "Email", "Ligação", "Reunião", "Outro"]}, 3, False),
                    ("complexidade", "Complexidade", "SELECT", {"options": ["Baixa", "Média", "Alta"]}, 4, False),
                ]
                
                for key, name, prop_type, config, order_idx, required in properties_data:
                    prop = TaskProperty(
                        task_database_id=task_db.id,
                        key=key,
                        name=name,
                        type=prop_type,
                        config_json=config,
                        order_index=order_idx,
                        is_required=required
                    )
                    db.add(prop)
                
                # Criar views padrão para o primeiro usuário (se existir)
                if admin_user:
                    views_data = [
                        ("Lista", "LIST", {"visibleProperties": ["prioridade", "status", "canal"]}, True),
                        ("Kanban", "KANBAN", {"groupBy": "status", "visibleProperties": ["prioridade", "canal"]}, False),
                        ("Calendário", "CALENDAR", {"visibleProperties": ["prioridade", "status"]}, False),
                        ("Agenda", "AGENDA", {"visibleProperties": ["prioridade", "status"]}, False),
                        ("Tabela", "TABLE", {"visibleProperties": ["prioridade", "status", "canal", "complexidade"], "columns": ["titulo", "status", "prioridade", "canal", "complexidade", "data_vencimento"]}, False),
                    ]
                    
                    for view_name, view_type, config, is_default in views_data:
                        view = TaskView(
                            task_database_id=task_db.id,
                            user_id=admin_user.id,
                            name=view_name,
                            type=view_type,
                            config_json=config,
                            is_default=is_default
                        )
                        db.add(view)
                
                db.commit()
                print("✅ Task Database padrão 'Tarefas' criado com 5 properties e views iniciais")
        except Exception as e:
            print(f"⚠️  Erro ao criar task database padrão (tabelas podem não existir ainda): {e}")
            db.rollback()
    except ProgrammingError as e:
        if "does not exist" in str(e.orig) or "UndefinedTable" in str(type(e.orig).__name__):
            print("Erro: as tabelas ainda não existem no banco.")
            print("Rode primeiro: alembic upgrade head")
            sys.exit(1)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
