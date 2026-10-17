revision = "0001_part1_foundation"
down_revision = None
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(160), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("college", sa.String(200)),
        sa.Column("branch", sa.String(120)),
        sa.Column("year", sa.String(20)),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "skills",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("category", sa.String(80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_skills_name", "skills", ["name"], unique=True)
    op.create_index("ix_skills_category", "skills", ["category"])

    op.create_table(
        "profiles",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), unique=True),
        sa.Column("bio", sa.Text()),
        sa.Column("github_url", sa.String(255)),
        sa.Column("portfolio_url", sa.String(255)),
        sa.Column("availability", sa.String(20)),
        sa.Column("hackathon_experience", sa.String(80)),
        sa.Column("avatar_seed", sa.String(80)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "user_skills",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("skill_id", sa.Uuid(), sa.ForeignKey("skills.id", ondelete="CASCADE"), nullable=False),
        sa.Column("proficiency", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "skill_id", name="uq_user_skill"),
    )
    op.create_index("ix_user_skills_user_id", "user_skills", ["user_id"])

    op.create_table(
        "user_preferred_roles",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role_name", sa.String(80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "role_name", name="uq_user_role_pref"),
    )

    op.create_table(
        "user_domain_interests",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("domain", sa.String(80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "domain", name="uq_user_domain"),
    )

    op.create_table(
        "previous_projects",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("tech_stack", sa.String(255)),
        sa.Column("year", sa.Integer()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "hackathons",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("name", sa.String(180), nullable=False),
        sa.Column("slug", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("short_description", sa.String(320), nullable=False),
        sa.Column("banner_url", sa.String(500)),
        sa.Column("organizer", sa.String(180), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("registration_deadline", sa.Date(), nullable=False),
        sa.Column("location", sa.String(180), nullable=False),
        sa.Column("team_size_min", sa.Integer(), nullable=False),
        sa.Column("team_size_max", sa.Integer(), nullable=False),
        sa.Column("rules", sa.Text(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_hackathons_slug", "hackathons", ["slug"], unique=True)
    op.create_index("ix_hackathons_status", "hackathons", ["status"])
    op.create_index("ix_hackathons_name", "hackathons", ["name"])

    op.create_table(
        "hackathon_domains",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("hackathon_id", sa.Uuid(), sa.ForeignKey("hackathons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("domain", sa.String(80), nullable=False),
        sa.UniqueConstraint("hackathon_id", "domain", name="uq_hackathon_domain"),
    )

    op.create_table(
        "hackathon_problems",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("hackathon_id", sa.Uuid(), sa.ForeignKey("hackathons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("code", sa.String(20), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("statement", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("domain", sa.String(80), nullable=False),
        sa.Column("target_users", sa.Text(), nullable=False),
        sa.Column("constraints", sa.Text(), nullable=False),
        sa.Column("expected_outcome", sa.Text(), nullable=False),
        sa.Column("evaluation_criteria", sa.Text(), nullable=False),
        sa.Column("required_technologies", sa.String(255)),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_hackathon_problems_domain", "hackathon_problems", ["domain"])

    op.create_table(
        "judging_criteria",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("hackathon_id", sa.Uuid(), sa.ForeignKey("hackathons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("weight", sa.Integer(), nullable=False),
    )

    op.create_table(
        "teams",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("hackathon_id", sa.Uuid(), sa.ForeignKey("hackathons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("invite_code", sa.String(12), nullable=False),
        sa.Column("leader_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("hackathon_id", "name", name="uq_team_name_per_hackathon"),
    )
    op.create_index("ix_teams_invite_code", "teams", ["invite_code"], unique=True)

    op.create_table(
        "team_members",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("team_id", sa.Uuid(), sa.ForeignKey("teams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("member_role", sa.String(80), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("team_id", "user_id", name="uq_team_member"),
    )

    op.create_table(
        "team_problem_selections",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("team_id", sa.Uuid(), sa.ForeignKey("teams.id", ondelete="CASCADE"), unique=True),
        sa.Column("problem_id", sa.Uuid(), sa.ForeignKey("hackathon_problems.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("selected_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("selected_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "team_invites",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("team_id", sa.Uuid(), sa.ForeignKey("teams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("inviter_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("invitee_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("team_id", "invitee_id", name="uq_team_invitee"),
    )


def downgrade() -> None:
    for table in [
        "team_invites",
        "team_problem_selections",
        "team_members",
        "teams",
        "judging_criteria",
        "hackathon_problems",
        "hackathon_domains",
        "hackathons",
        "previous_projects",
        "user_domain_interests",
        "user_preferred_roles",
        "user_skills",
        "profiles",
        "skills",
        "users",
    ]:
        op.drop_table(table)
