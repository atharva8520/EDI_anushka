import pytest
from pydantic import ValidationError

from app.core.config import Settings, normalize_database_url


# =========================================================================
# 1. Database URL normalization tests
# =========================================================================


def test_normalize_database_url_postgres_prefix():
    url = "postgres://user:secret@localhost:5432/mydb"
    expected = "postgresql+psycopg://user:secret@localhost:5432/mydb"
    assert normalize_database_url(url) == expected


def test_normalize_database_url_postgresql_prefix():
    url = "postgresql://user:secret@localhost:5432/mydb"
    expected = "postgresql+psycopg://user:secret@localhost:5432/mydb"
    assert normalize_database_url(url) == expected


def test_normalize_database_url_psycopg_unchanged():
    url = "postgresql+psycopg://user:secret@localhost:5432/mydb"
    assert normalize_database_url(url) == url


def test_normalize_database_url_sqlite_unchanged():
    url_mem = "sqlite+pysqlite:///:memory:"
    url_file = "sqlite:///local.db"
    assert normalize_database_url(url_mem) == url_mem
    assert normalize_database_url(url_file) == url_file


# =========================================================================
# 2. Config guard tests
# =========================================================================


VALID_PROD_SECRET = "a" * 32
VALID_ORIGIN = "https://hacknova.example.com"


def test_prod_rejects_default_jwt_secret():
    with pytest.raises((ValidationError, ValueError), match="default value"):
        Settings(
            APP_ENV="production",
            JWT_SECRET="change-me-to-a-long-random-string",
            CORS_ORIGINS=VALID_ORIGIN,
        )


def test_prod_rejects_short_jwt_secret():
    with pytest.raises((ValidationError, ValueError), match="at least 32 characters"):
        Settings(
            APP_ENV="production",
            JWT_SECRET="short-secret-less-than-32-chars",
            CORS_ORIGINS=VALID_ORIGIN,
        )


def test_prod_rejects_empty_cors_origins():
    with pytest.raises((ValidationError, ValueError), match="CORS_ORIGINS cannot be empty"):
        Settings(
            APP_ENV="production",
            JWT_SECRET=VALID_PROD_SECRET,
            CORS_ORIGINS="",
        )

    with pytest.raises((ValidationError, ValueError), match="CORS_ORIGINS cannot be empty"):
        Settings(
            APP_ENV="production",
            JWT_SECRET=VALID_PROD_SECRET,
            CORS_ORIGINS="   ",
        )


def test_prod_rejects_wildcard_cors_origins():
    with pytest.raises((ValidationError, ValueError), match="wildcard '\\*'"):
        Settings(
            APP_ENV="production",
            JWT_SECRET=VALID_PROD_SECRET,
            CORS_ORIGINS="*",
        )

    with pytest.raises((ValidationError, ValueError), match="wildcard '\\*'"):
        Settings(
            APP_ENV="production",
            JWT_SECRET=VALID_PROD_SECRET,
            CORS_ORIGINS=f"{VALID_ORIGIN}, *",
        )


def test_prod_accepts_valid_config():
    cfg = Settings(
        APP_ENV="production",
        JWT_SECRET=VALID_PROD_SECRET,
        CORS_ORIGINS=VALID_ORIGIN,
    )
    assert cfg.APP_ENV == "production"
    assert cfg.JWT_SECRET == VALID_PROD_SECRET
    assert cfg.cors_origin_list == [VALID_ORIGIN]


def test_non_prod_permits_dev_defaults():
    # Development allows default secret, short secret, wildcard CORS, empty CORS
    cfg = Settings(
        APP_ENV="development",
        JWT_SECRET="change-me-to-a-long-random-string",
        CORS_ORIGINS="*",
    )
    assert cfg.APP_ENV == "development"
    assert cfg.JWT_SECRET == "change-me-to-a-long-random-string"
