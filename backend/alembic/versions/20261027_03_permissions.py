"""Add explicit invitation and account permissions, preserving legacy file access."""

from alembic import op
import sqlalchemy as sa

revision = "20261027_03"
down_revision = "20261025_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for table in ("upload_users", "upload_invitations"):
        columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table)}
        # Fresh installations may already have these columns through create_all.
        if "permissions" not in columns:
            op.add_column(table, sa.Column("permissions", sa.JSON(), nullable=False, server_default="[]"))
            op.execute(sa.text(f"UPDATE {table} SET permissions = :permissions").bindparams(
                permissions='["files:upload","files:view"]'))
    if "public_access" not in sa.inspect(op.get_bind()).get_table_names():
        op.create_table("public_access", sa.Column("id", sa.Integer(), primary_key=True),
                        sa.Column("permissions", sa.JSON(), nullable=False, server_default="[]"))
    public = sa.table("public_access", sa.column("id", sa.Integer()), sa.column("permissions", sa.JSON()))
    if op.get_bind().execute(sa.select(public.c.id).where(public.c.id == 1)).first() is None:
        op.get_bind().execute(public.insert().values(id=1, permissions=["resume:view"]))


def downgrade() -> None:
    op.drop_table("public_access")
    for table in ("upload_invitations", "upload_users"):
        with op.batch_alter_table(table) as batch:
            batch.drop_column("permissions")
