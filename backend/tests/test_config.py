from app.config import Settings

def test_plain_postgresql_url_uses_psycopg3_driver() -> None:
    settings = Settings(database_url="postgresql://user:password@localhost/profile")
    assert settings.sqlalchemy_database_url == "postgresql+psycopg://user:password@localhost/profile"
