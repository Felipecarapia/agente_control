"""Add site_url to tenants

Revision ID: 026_tenant_site
Revises: 025_enterprise_func
Create Date: 2026-05-04
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "026_tenant_site"
down_revision: Union[str, None] = "025_enterprise_func"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tenants", sa.Column("site_url", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("tenants", "site_url")

