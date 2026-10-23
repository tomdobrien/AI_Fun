from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str = "sqlite:///./data/profile.db"
    frontend_origin: str = "http://localhost:3000"
    model_config = SettingsConfigDict(env_file=(".env", "backend/.env"), extra="ignore")

    @property
    def sqlalchemy_database_url(self) -> str:
        # psycopg 3 is installed; normalize the common PostgreSQL URL form to its driver.
        if self.database_url.startswith("postgresql://"):
            return self.database_url.replace("postgresql://", "postgresql+psycopg://", 1)
        return self.database_url

settings = Settings()
