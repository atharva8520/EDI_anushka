from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import normalize_database_url, settings

normalized_url = normalize_database_url(settings.DATABASE_URL)
connect_args = {}
if normalized_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(normalized_url, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
