import logging
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool

from app.core.config import settings

logger = logging.getLogger(__name__)

IS_VERCEL = os.getenv("VERCEL", "") == "1"

# Log da URL do banco (sem mostrar a senha)
db_url = settings.database_url
safe_url = db_url.split("@")[-1] if "@" in db_url else "not configured"
logger.info(f"Connecting to database: ...@{safe_url}")

try:
    # Em serverless (Vercel), usar NullPool para evitar problemas de pool
    # Em servidores persistentes, usar pool normal
    if IS_VERCEL:
        engine = create_engine(
            settings.database_url,
            pool_pre_ping=True,
            poolclass=NullPool,
            connect_args={
                "connect_timeout": 10,
            },
            echo=False,
        )
    else:
        engine = create_engine(
            settings.database_url,
            pool_pre_ping=True,
            pool_size=3,
            max_overflow=5,
            connect_args={
                "connect_timeout": 5,
            },
            echo=False,
        )
    logger.info("Database engine created successfully")
except Exception as e:
    logger.error(f"Failed to create database engine: {e}")
    raise

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency para obter sessão do banco."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
