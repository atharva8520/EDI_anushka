"""execution features

Revision ID: 0003_execution_features
Revises: 0002_project_workspace
Create Date: 2026-11-14 14:00:00.000000

"""

revision = "0003_execution_features"
down_revision = "0002_project_workspace"
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    # 1. Project repo_url
    op.add_column("projects", sa.Column("repo_url", sa.String(500), nullable=True))

    # 2. Project notes
    op.create_table(
        "project_notes",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("updated_by", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_project_notes_project_id", "project_notes", ["project_id"])

    # 3. Checklist items
    op.create_table(
        "checklist_items",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("is_done", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("assignee_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("url", sa.String(500), nullable=True),
        sa.Column("position", sa.Integer(), server_default="0", nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_checklist_items_project_id", "checklist_items", ["project_id"])
    op.create_index("ix_checklist_items_assignee_id", "checklist_items", ["assignee_id"])


def downgrade() -> None:
    op.drop_index("ix_checklist_items_assignee_id", table_name="checklist_items")
    op.drop_index("ix_checklist_items_project_id", table_name="checklist_items")
    op.drop_table("checklist_items")

    op.drop_index("ix_project_notes_project_id", table_name="project_notes")
    op.drop_table("project_notes")

    op.drop_column("projects", "repo_url")
