"""Sistema Notion-like para Tarefas.

Revision ID: 013
Revises: 012
Create Date: 2025-02-10 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid


revision: str = "013"
down_revision: Union[str, None] = "012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ============== 1. Task Databases ==============
    op.create_table(
        "task_databases",
        sa.Column("id", UUID(as_uuid=True), nullable=False, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_by_user_id", UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["usuarios.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_task_databases_id"), "task_databases", ["id"], unique=False)
    op.create_index(op.f("ix_task_databases_is_default"), "task_databases", ["is_default"], unique=False)

    # ============== 2. Task Properties ==============
    op.create_table(
        "task_properties",
        sa.Column("id", UUID(as_uuid=True), nullable=False, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("task_database_id", UUID(as_uuid=True), nullable=False),
        sa.Column("key", sa.String(100), nullable=False),  # unique per database
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),  # TEXT, NUMBER, SELECT, MULTI_SELECT, DATE, PERSON, CHECKBOX, URL
        sa.Column("config_json", JSONB, nullable=True),  # options for select/multi_select
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_required", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["task_database_id"], ["task_databases.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("task_database_id", "key", name="uq_task_property_database_key"),
    )
    op.create_index(op.f("ix_task_properties_id"), "task_properties", ["id"], unique=False)
    op.create_index(op.f("ix_task_properties_task_database_id"), "task_properties", ["task_database_id"], unique=False)

    # ============== 3. Adaptar tabela tarefas ==============
    op.add_column("tarefas", sa.Column("task_database_id", UUID(as_uuid=True), nullable=True))
    op.add_column("tarefas", sa.Column("context_type", sa.String(50), nullable=True))  # CLIENT, PROJECT, DEAL
    op.add_column("tarefas", sa.Column("context_id", UUID(as_uuid=True), nullable=True))
    op.add_column("tarefas", sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("tarefas", sa.Column("completed_by_user_id", UUID(as_uuid=True), nullable=True))
    
    # Criar FK para task_database
    op.create_foreign_key(
        "fk_tarefa_task_database",
        "tarefas", "task_databases",
        ["task_database_id"], ["id"],
        ondelete="SET NULL"
    )
    op.create_foreign_key(
        "fk_tarefa_completed_by",
        "tarefas", "usuarios",
        ["completed_by_user_id"], ["id"],
        ondelete="SET NULL"
    )
    op.create_index(op.f("ix_tarefas_task_database_id"), "tarefas", ["task_database_id"], unique=False)
    op.create_index(op.f("ix_tarefas_context_type_id"), "tarefas", ["context_type", "context_id"], unique=False)

    # ============== 4. Task Property Values ==============
    op.create_table(
        "task_property_values",
        sa.Column("id", UUID(as_uuid=True), nullable=False, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("task_id", UUID(as_uuid=True), nullable=False),
        sa.Column("property_id", UUID(as_uuid=True), nullable=False),
        sa.Column("value_json", JSONB, nullable=True),  # armazenar conforme type
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["task_id"], ["tarefas.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["property_id"], ["task_properties.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("task_id", "property_id", name="uq_task_property_value"),
    )
    op.create_index(op.f("ix_task_property_values_id"), "task_property_values", ["id"], unique=False)
    op.create_index(op.f("ix_task_property_values_task_id"), "task_property_values", ["task_id"], unique=False)
    op.create_index(op.f("ix_task_property_values_property_id"), "task_property_values", ["property_id"], unique=False)

    # ============== 5. Task Views ==============
    op.create_table(
        "task_views",
        sa.Column("id", UUID(as_uuid=True), nullable=False, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("task_database_id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),  # LIST, TABLE, KANBAN, CALENDAR, AGENDA
        sa.Column("config_json", JSONB, nullable=True),  # filters, sorts, groupBy, columns, visibleProperties
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["task_database_id"], ["task_databases.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_task_views_id"), "task_views", ["id"], unique=False)
    op.create_index(op.f("ix_task_views_task_database_id"), "task_views", ["task_database_id"], unique=False)
    op.create_index(op.f("ix_task_views_user_id"), "task_views", ["user_id"], unique=False)

    # ============== 6. Task Blocks ==============
    op.create_table(
        "task_blocks",
        sa.Column("id", UUID(as_uuid=True), nullable=False, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("task_id", UUID(as_uuid=True), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),  # PARAGRAPH, HEADING, BULLET_LIST, CHECKLIST, QUOTE, DIVIDER, IMAGE, FILE, LINK
        sa.Column("content_json", JSONB, nullable=True),  # conteúdo do bloco
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["task_id"], ["tarefas.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_task_blocks_id"), "task_blocks", ["id"], unique=False)
    op.create_index(op.f("ix_task_blocks_task_id"), "task_blocks", ["task_id"], unique=False)
    op.create_index(op.f("ix_task_blocks_order_index"), "task_blocks", ["task_id", "order_index"], unique=False)

    # ============== 7. Task Comments ==============
    op.create_table(
        "task_comments",
        sa.Column("id", UUID(as_uuid=True), nullable=False, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("task_id", UUID(as_uuid=True), nullable=False),
        sa.Column("author_user_id", UUID(as_uuid=True), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["task_id"], ["tarefas.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["author_user_id"], ["usuarios.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_task_comments_id"), "task_comments", ["id"], unique=False)
    op.create_index(op.f("ix_task_comments_task_id"), "task_comments", ["task_id"], unique=False)
    op.create_index(op.f("ix_task_comments_author_user_id"), "task_comments", ["author_user_id"], unique=False)

    # ============== 8. Task Mentions ==============
    op.create_table(
        "task_mentions",
        sa.Column("id", UUID(as_uuid=True), nullable=False, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("task_id", UUID(as_uuid=True), nullable=False),
        sa.Column("mentioned_user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("comment_id", UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["task_id"], ["tarefas.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["mentioned_user_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["comment_id"], ["task_comments.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_task_mentions_id"), "task_mentions", ["id"], unique=False)
    op.create_index(op.f("ix_task_mentions_task_id"), "task_mentions", ["task_id"], unique=False)
    op.create_index(op.f("ix_task_mentions_mentioned_user_id"), "task_mentions", ["mentioned_user_id"], unique=False)

    # ============== 9. Task Attachments ==============
    op.create_table(
        "task_attachments",
        sa.Column("id", UUID(as_uuid=True), nullable=False, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("task_id", UUID(as_uuid=True), nullable=False),
        sa.Column("uploaded_by_user_id", UUID(as_uuid=True), nullable=True),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("mime_type", sa.String(100), nullable=True),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("storage_key", sa.String(500), nullable=True),  # S3 key ou path local
        sa.Column("url", sa.String(1000), nullable=True),  # URL pública
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["task_id"], ["tarefas.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uploaded_by_user_id"], ["usuarios.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_task_attachments_id"), "task_attachments", ["id"], unique=False)
    op.create_index(op.f("ix_task_attachments_task_id"), "task_attachments", ["task_id"], unique=False)

    # ============== 10. Task Templates ==============
    op.create_table(
        "task_templates",
        sa.Column("id", UUID(as_uuid=True), nullable=False, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("task_database_id", UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("default_blocks_json", JSONB, nullable=True),  # array de blocks padrão
        sa.Column("default_property_values_json", JSONB, nullable=True),  # valores padrão de properties
        sa.Column("created_by_user_id", UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["task_database_id"], ["task_databases.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["usuarios.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_task_templates_id"), "task_templates", ["id"], unique=False)
    op.create_index(op.f("ix_task_templates_task_database_id"), "task_templates", ["task_database_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_task_templates_task_database_id"), table_name="task_templates")
    op.drop_index(op.f("ix_task_templates_id"), table_name="task_templates")
    op.drop_table("task_templates")

    op.drop_index(op.f("ix_task_attachments_task_id"), table_name="task_attachments")
    op.drop_index(op.f("ix_task_attachments_id"), table_name="task_attachments")
    op.drop_table("task_attachments")

    op.drop_index(op.f("ix_task_mentions_mentioned_user_id"), table_name="task_mentions")
    op.drop_index(op.f("ix_task_mentions_task_id"), table_name="task_mentions")
    op.drop_index(op.f("ix_task_mentions_id"), table_name="task_mentions")
    op.drop_table("task_mentions")

    op.drop_index(op.f("ix_task_comments_author_user_id"), table_name="task_comments")
    op.drop_index(op.f("ix_task_comments_task_id"), table_name="task_comments")
    op.drop_index(op.f("ix_task_comments_id"), table_name="task_comments")
    op.drop_table("task_comments")

    op.drop_index(op.f("ix_task_blocks_order_index"), table_name="task_blocks")
    op.drop_index(op.f("ix_task_blocks_task_id"), table_name="task_blocks")
    op.drop_index(op.f("ix_task_blocks_id"), table_name="task_blocks")
    op.drop_table("task_blocks")

    op.drop_index(op.f("ix_task_views_user_id"), table_name="task_views")
    op.drop_index(op.f("ix_task_views_task_database_id"), table_name="task_views")
    op.drop_index(op.f("ix_task_views_id"), table_name="task_views")
    op.drop_table("task_views")

    op.drop_index(op.f("ix_task_property_values_property_id"), table_name="task_property_values")
    op.drop_index(op.f("ix_task_property_values_task_id"), table_name="task_property_values")
    op.drop_index(op.f("ix_task_property_values_id"), table_name="task_property_values")
    op.drop_table("task_property_values")

    op.drop_index(op.f("ix_tarefas_context_type_id"), table_name="tarefas")
    op.drop_index(op.f("ix_tarefas_task_database_id"), table_name="tarefas")
    op.drop_constraint("fk_tarefa_completed_by", "tarefas", type_="foreignkey")
    op.drop_constraint("fk_tarefa_task_database", "tarefas", type_="foreignkey")
    op.drop_column("tarefas", "completed_by_user_id")
    op.drop_column("tarefas", "completed_at")
    op.drop_column("tarefas", "context_id")
    op.drop_column("tarefas", "context_type")
    op.drop_column("tarefas", "task_database_id")

    op.drop_index(op.f("ix_task_properties_task_database_id"), table_name="task_properties")
    op.drop_index(op.f("ix_task_properties_id"), table_name="task_properties")
    op.drop_table("task_properties")

    op.drop_index(op.f("ix_task_databases_is_default"), table_name="task_databases")
    op.drop_index(op.f("ix_task_databases_id"), table_name="task_databases")
    op.drop_table("task_databases")




