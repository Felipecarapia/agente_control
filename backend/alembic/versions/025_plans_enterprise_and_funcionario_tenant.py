"""Add enterprise plan and tenant to funcionarios

Revision ID: 025_enterprise_func
Revises: 024_financeiro_expansion
Create Date: 2026-05-04
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "025_enterprise_func"
down_revision: Union[str, None] = "d1e010ac2e8d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "tenants",
        "plano",
        existing_type=sa.Enum("basic", "pro", name="plantype", native_enum=False, length=20),
        type_=sa.Enum("basic", "pro", "enterprise", name="plantype", native_enum=False, length=20),
        existing_nullable=False,
    )

    op.add_column("funcionarios", sa.Column("tenant_id", sa.UUID(), nullable=True))
    op.create_index(op.f("ix_funcionarios_tenant_id"), "funcionarios", ["tenant_id"], unique=False)
    op.create_foreign_key(None, "funcionarios", "tenants", ["tenant_id"], ["id"], ondelete="CASCADE")


def downgrade() -> None:
    op.drop_constraint(None, "funcionarios", type_="foreignkey")
    op.drop_index(op.f("ix_funcionarios_tenant_id"), table_name="funcionarios")
    op.drop_column("funcionarios", "tenant_id")

    op.alter_column(
        "tenants",
        "plano",
        existing_type=sa.Enum("basic", "pro", "enterprise", name="plantype", native_enum=False, length=20),
        type_=sa.Enum("basic", "pro", name="plantype", native_enum=False, length=20),
        existing_nullable=False,
    )
