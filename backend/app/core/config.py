from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Configuração carregada do .env."""

    # Database (variáveis separadas)
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "sistemaxi_crm"

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # JWT
    SECRET_KEY: str = "change-me-in-production-use-long-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h

    # Primeiro usuário admin (só usado pelo seed)
    ADMIN_EMAIL: str = "admin@sistemaxi.com"
    ADMIN_PASSWORD: str = "admin123"
    ADMIN_NOME: str = "Administrador"

    # S3/MinIO Storage
    S3_ENDPOINT: Optional[str] = None
    S3_REGION: str = "us-east-1"
    S3_BUCKET: Optional[str] = None
    S3_ACCESS_KEY: Optional[str] = None
    S3_SECRET_KEY: Optional[str] = None
    S3_PUBLIC_BASE_URL: Optional[str] = None
    S3_USE_SSL: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
