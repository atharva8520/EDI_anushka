"""submissions and judging

Revision ID: 0005_submissions_and_judging
Revises: 0004_ai_logging
Create Date: 2026-11-20 00:00:00.000000

"""

revision = "0005_submissions_and_judging"
down_revision = "0004_ai_logging"
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    # 1. Add submission columns to projects
    with op.batch_alter_table("projects") as batch_op:
        batch_op.add_column(sa.Column("demo_url", sa.String(500), nullable=True))
        batch_op.add_column(sa.Column("video_url", sa.String(500), nullable=True))
        batch_op.add_column(sa.Column("pitch_deck_url", sa.String(500), nullable=True))
        batch_op.add_column(sa.Column("tech_stack", sa.JSON(), nullable=False, server_default="[]"))
        batch_op.add_column(sa.Column("is_submitted", sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(
            sa.Column(
                "submitted_by",
                sa.Uuid(),
                sa.ForeignKey("users.id", ondelete="SET NULL", name="fk_projects_submitted_by"),
                nullable=True,
            )
        )
        batch_op.add_column(sa.Column("submission_notes", sa.Text(), nullable=True))

    # 2. Table project_evaluations
    op.create_table(
        "project_evaluations",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("hackathon_id", sa.Uuid(), sa.ForeignKey("hackathons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("judge_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column("total_score", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("project_id", "judge_id", name="uq_project_judge_evaluation"),
    )
    op.create_index("ix_project_evaluations_project_id", "project_evaluations", ["project_id"])
    op.create_index("ix_project_evaluations_hackathon_id", "project_evaluations", ["hackathon_id"])
    op.create_index("ix_project_evaluations_judge_id", "project_evaluations", ["judge_id"])

    # 3. Table criterion_scores
    op.create_table(
        "criterion_scores",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("evaluation_id", sa.Uuid(), sa.ForeignKey("project_evaluations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("criterion_id", sa.Uuid(), sa.ForeignKey("judging_criteria.id", ondelete="CASCADE"), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.UniqueConstraint("evaluation_id", "criterion_id", name="uq_evaluation_criterion"),
    )
    op.create_index("ix_criterion_scores_evaluation_id", "criterion_scores", ["evaluation_id"])
    op.create_index("ix_criterion_scores_criterion_id", "criterion_scores", ["criterion_id"])


def downgrade() -> None:
    op.drop_index("ix_criterion_scores_criterion_id", table_name="criterion_scores")
    op.drop_index("ix_criterion_scores_evaluation_id", table_name="criterion_scores")
    op.drop_table("criterion_scores")

    op.drop_index("ix_project_evaluations_judge_id", table_name="project_evaluations")
    op.drop_index("ix_project_evaluations_hackathon_id", table_name="project_evaluations")
    op.drop_index("ix_project_evaluations_project_id", table_name="project_evaluations")
    op.drop_table("project_evaluations")

    with op.batch_alter_table("projects") as batch_op:
        batch_op.drop_column("submission_notes")
        batch_op.drop_column("submitted_by")
        batch_op.drop_column("submitted_at")
        batch_op.drop_column("is_submitted")
        batch_op.drop_column("tech_stack")
        batch_op.drop_column("pitch_deck_url")
        batch_op.drop_column("video_url")
        batch_op.drop_column("demo_url")
