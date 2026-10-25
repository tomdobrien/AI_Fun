"""Add resume details to profiles and experience entries."""

from alembic import op
import sqlalchemy as sa

revision = "20261024_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "profiles" not in tables:
        # The app creates the base schema on startup before applying migrations.
        return

    profile_columns = {column["name"] for column in inspector.get_columns("profiles")}
    for name, column in (
        ("location", sa.Column("location", sa.String(length=160), nullable=True)),
        ("contact_email", sa.Column("contact_email", sa.String(length=254), nullable=True)),
        ("contact_phone", sa.Column("contact_phone", sa.String(length=80), nullable=True)),
    ):
        if name not in profile_columns:
            with op.batch_alter_table("profiles") as batch_op:
                batch_op.add_column(column)

    experience_columns = {column["name"] for column in inspector.get_columns("experience")} if "experience" in tables else set()
    for name, column in (
        ("location", sa.Column("location", sa.String(length=160), nullable=True)),
        ("work_mode", sa.Column("work_mode", sa.String(length=80), nullable=True)),
    ):
        if "experience" in tables and name not in experience_columns:
            with op.batch_alter_table("experience") as batch_op:
                batch_op.add_column(column)

    tables = set(sa.inspect(bind).get_table_names())
    if "awards" not in tables:
        op.create_table(
            "awards",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("profile_id", sa.Integer(), sa.ForeignKey("profiles.id"), nullable=False),
            sa.Column("title", sa.String(length=240), nullable=False),
            sa.Column("organization", sa.String(length=200), nullable=True),
            sa.Column("date", sa.String(length=80), nullable=True),
            sa.Column("description", sa.Text(), nullable=True),
        )
        op.create_index("ix_awards_profile_id", "awards", ["profile_id"])
    if "education" not in tables:
        op.create_table(
            "education",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("profile_id", sa.Integer(), sa.ForeignKey("profiles.id"), nullable=False),
            sa.Column("institution", sa.String(length=200), nullable=False),
            sa.Column("location", sa.String(length=160), nullable=True),
            sa.Column("degree", sa.String(length=160), nullable=False),
            sa.Column("field_of_study", sa.String(length=200), nullable=True),
            sa.Column("graduation_date", sa.String(length=80), nullable=True),
        )
        op.create_index("ix_education_profile_id", "education", ["profile_id"])


def downgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if "education" in tables:
        op.drop_index("ix_education_profile_id", table_name="education")
        op.drop_table("education")
    if "awards" in tables:
        op.drop_index("ix_awards_profile_id", table_name="awards")
        op.drop_table("awards")
    if "experience" in tables:
        experience_columns = {column["name"] for column in sa.inspect(bind).get_columns("experience")}
        remove = [name for name in ("location", "work_mode") if name in experience_columns]
        if remove:
            with op.batch_alter_table("experience") as batch_op:
                for name in remove:
                    batch_op.drop_column(name)
    if "profiles" in tables:
        profile_columns = {column["name"] for column in sa.inspect(bind).get_columns("profiles")}
        remove = [name for name in ("contact_phone", "contact_email", "location") if name in profile_columns]
        if remove:
            with op.batch_alter_table("profiles") as batch_op:
                for name in remove:
                    batch_op.drop_column(name)
