from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def normalize_database_url(url: str) -> str:
    """Normalize PostgreSQL URL schemes to use psycopg3 driver.
    Leaves sqlite and already normalized postgresql+psycopg URLs unchanged.
    """
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")

    DATABASE_URL: str = "postgresql+psycopg://hacknova:hacknova@localhost:5432/hacknova"
    JWT_SECRET: str = "change-me-to-a-long-random-string"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    ACCESS_TOKEN_EXPIRE_MINUTES_REMEMBER: int = 10080
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    APP_ENV: str = "development"
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_PROVIDER: str = "stub"

    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def _normalize_db_url(cls, v: str) -> str:
        return normalize_database_url(v)

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.CORS_ORIGINS.split(",") if item.strip()]

    @model_validator(mode="after")
    def validate_production_config(self) -> "Settings":
        if self.APP_ENV.lower() == "production":
            if self.JWT_SECRET == "change-me-to-a-long-random-string":
                raise ValueError("In production, JWT_SECRET cannot be the default value.")
            if len(self.JWT_SECRET) < 32:
                raise ValueError("In production, JWT_SECRET must be at least 32 characters long.")
            origins = self.cors_origin_list
            if not origins:
                raise ValueError("In production, CORS_ORIGINS cannot be empty.")
        return self


settings = Settings()
