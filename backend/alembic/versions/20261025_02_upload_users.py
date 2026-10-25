"""Add invited photo uploader accounts."""

from alembic import op
import sqlalchemy as sa


revision = "20261025_02"
down_revision = "20261024_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    tables = set(sa.inspect(op.get_bind()).get_table_names())
    if "upload_users" not in tables:
        op.create_table(
            "upload_users",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("email", sa.String(length=254), nullable=False),
            sa.Column("display_name", sa.String(length=160), nullable=True),
            sa.Column("password_hash", sa.String(length=300), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("disabled_at", sa.DateTime(timezone=True), nullable=True),
            sa.UniqueConstraint("email", name="uq_upload_users_email"),
        )
        op.create_index("ix_upload_users_email", "upload_users", ["email"])

    tables = set(sa.inspect(op.get_bind()).get_table_names())
    if "upload_invitations" not in tables:
        op.create_table(
            "upload_invitations",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("email", sa.String(length=254), nullable=False),
            sa.Column("display_name", sa.String(length=160), nullable=True),
            sa.Column("token_hash", sa.String(length=64), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
            sa.UniqueConstraint("token_hash", name="uq_upload_invitations_token_hash"),
        )
        op.create_index("ix_upload_invitations_email", "upload_invitations", ["email"])
        op.create_index("ix_upload_invitations_token_hash", "upload_invitations", ["token_hash"])


def downgrade() -> None:
    tables = set(sa.inspect(op.get_bind()).get_table_names())
    if "upload_invitations" in tables:
        op.drop_index("ix_upload_invitations_token_hash", table_name="upload_invitations")
        op.drop_index("ix_upload_invitations_email", table_name="upload_invitations")
        op.drop_table("upload_invitations")
    if "upload_users" in tables:
        op.drop_index("ix_upload_users_email", table_name="upload_users")
        op.drop_table("upload_users")
