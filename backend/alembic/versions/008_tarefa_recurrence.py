"""Sistema de Recorrência para Tarefas.

Revision ID: 008
Revises: 007
Create Date: 2025-02-05 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Adicionar campos de recorrência na tabela tarefas
    op.add_column("tarefas", sa.Column("is_recurring", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("tarefas", sa.Column("recurrence_type", sa.String(length=20), nullable=True))
    op.add_column("tarefas", sa.Column("recurrence_interval", sa.Integer(), nullable=True))
    op.add_column("tarefas", sa.Column("recurrence_end_date", sa.Date(), nullable=True))
    op.add_column("tarefas", sa.Column("parent_task_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_tarefa_parent_task",
        "tarefas", "tarefas",
        ["parent_task_id"], ["id"],
        ondelete="SET NULL"
    )
    op.create_index(op.f("ix_tarefas_parent_task_id"), "tarefas", ["parent_task_id"], unique=False)

    # Criar tabela tarefa_assignees para múltiplos usuários
    op.create_table(
        "tarefa_assignees",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tarefa_id", sa.Integer(), nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["tarefa_id"], ["tarefas.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tarefa_id", "usuario_id", name="uq_tarefa_usuario"),
    )
    op.create_index(op.f("ix_tarefa_assignees_tarefa_id"), "tarefa_assignees", ["tarefa_id"], unique=False)
    op.create_index(op.f("ix_tarefa_assignees_usuario_id"), "tarefa_assignees", ["usuario_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_tarefa_assignees_usuario_id"), table_name="tarefa_assignees")
    op.drop_index(op.f("ix_tarefa_assignees_tarefa_id"), table_name="tarefa_assignees")
    op.drop_table("tarefa_assignees")

    op.drop_index(op.f("ix_tarefas_parent_task_id"), table_name="tarefas")
    op.drop_constraint("fk_tarefa_parent_task", "tarefas", type_="foreignkey")
    op.drop_column("tarefas", "parent_task_id")
    op.drop_column("tarefas", "recurrence_end_date")
    op.drop_column("tarefas", "recurrence_interval")
    op.drop_column("tarefas", "recurrence_type")
    op.drop_column("tarefas", "is_recurring")




