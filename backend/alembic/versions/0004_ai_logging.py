"""ai logging and feedback

Revision ID: 0004_ai_logging
Revises: 0003_execution_features
Create Date: 2026-11-14 16:00:00.000000

"""

revision = "0004_ai_logging"
down_revision = "0003_execution_features"
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    # 1. Table ai_runs
    op.create_table(
        "ai_runs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("feature", sa.String(50), nullable=False),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("team_id", sa.Uuid(), sa.ForeignKey("teams.id", ondelete="SET NULL"), nullable=True),
        sa.Column("input_json", sa.JSON(), nullable=False),
        sa.Column("output_json", sa.JSON(), nullable=False),
        sa.Column("model_version", sa.String(50), server_default="weighted-v1", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_ai_runs_user_id", "ai_runs", ["user_id"])
    op.create_index("ix_ai_runs_team_id", "ai_runs", ["team_id"])

    # 2. Table ai_feedback
    op.create_table(
        "ai_feedback",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("run_id", sa.Uuid(), sa.ForeignKey("ai_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("candidate_id", sa.Uuid(), nullable=True),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("comment", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("run_id", "user_id", "candidate_id", name="uq_ai_feedback_run_user_candidate"),
    )
    op.create_index("ix_ai_feedback_run_id", "ai_feedback", ["run_id"])


def downgrade() -> None:
    op.drop_index("ix_ai_feedback_run_id", table_name="ai_feedback")
    op.drop_table("ai_feedback")

    op.drop_index("ix_ai_runs_team_id", table_name="ai_runs")
    op.drop_index("ix_ai_runs_user_id", table_name="ai_runs")
    op.drop_table("ai_runs")
