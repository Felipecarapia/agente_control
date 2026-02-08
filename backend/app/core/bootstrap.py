"""
Bootstrap automático que roda no startup da aplicação.
Garante que dados mínimos existam (pipeline padrão, task database, roles, permissions, etc).
IDEMPOTENTE: pode ser executado múltiplas vezes sem duplicar dados.
"""
import logging
from sqlalchemy.exc import ProgrammingError, OperationalError
from app.core.database import SessionLocal
from app.models.pipeline import Pipeline, PipelineStage
from app.models.task_notion import TaskDatabase, TaskProperty, TaskView
from app.models.usuario import Usuario
from app.models.role import Role
from app.models.permission import Permission, RolePermission
from app.core.rbac import (
    ROLE_ADMIN, ROLE_PROJECT_MANAGER, ROLE_TRAFFIC_MANAGER,
    ROLE_MARKETING_MANAGER, ROLE_MARKETING, ROLE_DEVELOPMENT
)

logger = logging.getLogger(__name__)


def ensure_default_pipeline(db):
    """
    Garante que existe um pipeline padrão (IDEMPOTENTE).
    Pode ser chamado múltiplas vezes sem duplicar dados.
    """
    try:
        # Verificar se já existe ao menos um pipeline
        existing_pipeline = db.query(Pipeline).first()
        if existing_pipeline:
            # Já existe pipeline - não criar duplicado
            return False
        
        # Buscar qualquer usuário para ser o criador
        admin_user = db.query(Usuario).first()
        
        pipeline = Pipeline(
            name="Vendas",
            description="Pipeline padrão de vendas",
            is_default=True,
            created_by_user_id=admin_user.id if admin_user else None
        )
        db.add(pipeline)
        db.flush()
        
        # Criar stages padrão (idempotente - verificar se já existe antes de criar)
        stages_data = [
            ("Lead", "LEADS", 0, None, None),
            ("Pré-proposta", "PRE_PROPOSAL", 1, None, None),
            ("Proposta", "PROPOSAL", 2, None, None),
            ("Negociação", "NEGOTIATION", 3, None, None),
            ("Fechado", "WON", 4, None, "#10B981"),
            ("Perdido", "LOST", 5, None, "#EF4444"),
        ]
        
        for name, key, order_index, wip_limit, color in stages_data:
            # Verificar se stage já existe (idempotência)
            existing_stage = db.query(PipelineStage).filter(
                PipelineStage.pipeline_id == pipeline.id,
                PipelineStage.name == name
            ).first()
            
            if not existing_stage:
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
        logger.info("✅ Pipeline padrão 'Vendas' criado automaticamente")
        return True
    except (ProgrammingError, OperationalError) as e:
        logger.warning(f"⚠️  Não foi possível criar pipeline padrão (tabelas podem não existir): {e}")
        db.rollback()
        return False
    except Exception as e:
        logger.error(f"Erro ao criar pipeline padrão: {e}", exc_info=True)
        db.rollback()
        return False
    return False


def ensure_default_task_database(db):
    """Garante que existe um task database padrão."""
    try:
        default_db = db.query(TaskDatabase).filter(TaskDatabase.is_default == True).first()
        if not default_db:
            admin_user = db.query(Usuario).first()
            
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
            logger.info("✅ Task Database padrão 'Tarefas' criado automaticamente")
            return True
    except (ProgrammingError, OperationalError) as e:
        logger.warning(f"⚠️  Não foi possível criar task database padrão (tabelas podem não existir): {e}")
        db.rollback()
        return False
    except Exception as e:
        logger.error(f"Erro ao criar task database padrão: {e}", exc_info=True)
        db.rollback()
        return False
    return False


def ensure_default_roles(db):
    """
    Garante que roles padrão existam (IDEMPOTENTE).
    """
    try:
        roles_data = [
            (ROLE_ADMIN, "Administrador"),
            (ROLE_PROJECT_MANAGER, "Gestor de Projetos"),
            (ROLE_TRAFFIC_MANAGER, "Gestor de Tráfego"),
            (ROLE_MARKETING_MANAGER, "Gestor de Marketing"),
            (ROLE_MARKETING, "Marketing"),
            (ROLE_DEVELOPMENT, "Desenvolvimento"),
        ]
        
        created_count = 0
        for role_key, role_name in roles_data:
            existing_role = db.query(Role).filter(Role.key == role_key).first()
            if not existing_role:
                role = Role(key=role_key, name=role_name)
                db.add(role)
                created_count += 1
        
        if created_count > 0:
            db.commit()
            logger.info(f"✅ {created_count} role(s) padrão criado(s)")
        
        return created_count > 0
    except (ProgrammingError, OperationalError) as e:
        logger.warning(f"⚠️  Não foi possível criar roles padrão (tabelas podem não existir): {e}")
        db.rollback()
        return False
    except Exception as e:
        logger.error(f"Erro ao criar roles padrão: {e}", exc_info=True)
        db.rollback()
        return False


def ensure_default_permissions(db):
    """
    Garante que permissões mínimas existam (IDEMPOTENTE).
    Cria permissões básicas para cada módulo (create, read, update, delete).
    """
    try:
        # Permissões mínimas por módulo
        modules = ["clientes", "projetos", "tarefas", "propostas", "contratos", "usuarios", "roles", "notificacoes", "mensagens"]
        actions = ["create", "read", "update", "delete"]
        
        created_count = 0
        for module in modules:
            for action in actions:
                # Verificar se já existe
                existing = db.query(Permission).filter(
                    Permission.module == module,
                    Permission.action == action
                ).first()
                
                if not existing:
                    # Criar permissão
                    name = f"{action.capitalize()} {module.capitalize()}"
                    description = f"Permite {action} em {module}"
                    permission = Permission(
                        module=module,
                        action=action,
                        name=name,
                        description=description
                    )
                    db.add(permission)
                    created_count += 1
        
        if created_count > 0:
            db.commit()
            logger.info(f"✅ {created_count} permissão(ões) padrão criada(s)")
        
        # Atribuir todas as permissões à role ADMIN (idempotente)
        admin_role = db.query(Role).filter(Role.key == ROLE_ADMIN).first()
        if admin_role:
            all_permissions = db.query(Permission).all()
            assigned_count = 0
            for perm in all_permissions:
                # Verificar se já está atribuída
                existing_rp = db.query(RolePermission).filter(
                    RolePermission.role_id == admin_role.id,
                    RolePermission.permission_id == perm.id
                ).first()
                if not existing_rp:
                    role_perm = RolePermission(role_id=admin_role.id, permission_id=perm.id)
                    db.add(role_perm)
                    assigned_count += 1
            
            if assigned_count > 0:
                db.commit()
                logger.info(f"✅ {assigned_count} permissão(ões) atribuída(s) à role ADMIN")
        
        return created_count > 0
    except (ProgrammingError, OperationalError) as e:
        logger.warning(f"⚠️  Não foi possível criar permissões padrão (tabelas podem não existir): {e}")
        db.rollback()
        return False
    except Exception as e:
        logger.error(f"Erro ao criar permissões padrão: {e}", exc_info=True)
        db.rollback()
        return False


def ensure_default_contract_statuses(db):
    """
    Garante que status padrão de contratos existam (IDEMPOTENTE).
    Nota: Se a tabela Contrato usar enum ou constraint, isso pode não ser necessário.
    Esta função serve como documentação dos status válidos.
    """
    # Status padrão: draft, active, expired, canceled
    # Se a tabela Contrato tiver constraint CHECK ou enum, não precisa criar nada
    # Apenas documentar que esses são os valores válidos
    logger.info("✅ Status padrão de contratos: draft, active, expired, canceled")
    return True


def bootstrap():
    """
    Executa bootstrap automático.
    Garante que dados mínimos existam no sistema (IDEMPOTENTE).
    """
    db = SessionLocal()
    try:
        # Ordem importante: roles primeiro, depois permissões (outros podem depender)
        ensure_default_roles(db)
        ensure_default_permissions(db)  # Permissões dependem de roles
        ensure_default_pipeline(db)
        ensure_default_task_database(db)
        ensure_default_contract_statuses(db)
        logger.info("✅ Bootstrap concluído com sucesso")
    except Exception as e:
        logger.error(f"❌ Erro durante bootstrap: {e}", exc_info=True)
    finally:
        db.close()

