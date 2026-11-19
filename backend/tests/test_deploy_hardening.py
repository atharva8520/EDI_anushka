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


# =========================================================================
# 3. scripts/create_admin.py tests (using in-memory db)
# =========================================================================

from sqlalchemy import select
from app.core.security import verify_password
from app.models.user import User, UserRole


def test_create_admin_success(client, capsys):
    from scripts.create_admin import create_or_update_admin
    _, db = client

    email = "admin_cli@hacknova.dev"
    name = "CLI Admin"
    password = "SuperSecretAdmin123!"

    success, msg = create_or_update_admin(email, name, password, reset_password=False, db=db)
    assert success is True
    assert "created successfully" in msg

    user = db.scalar(select(User).where(User.email == email))
    assert user is not None
    assert user.full_name == name
    assert user.role == UserRole.admin
    assert verify_password(password, user.password_hash) is True

    # Ensure password is not printed to stdout/stderr
    captured = capsys.readouterr()
    assert password not in captured.out
    assert password not in captured.err


def test_create_admin_refuses_short_password(client):
    from scripts.create_admin import create_or_update_admin
    _, db = client

    with pytest.raises(ValueError, match="at least 12 characters"):
        create_or_update_admin("short@hacknova.dev", "Short Pass", "shortpass", db=db)


def test_create_admin_idempotent_without_reset(client):
    from scripts.create_admin import create_or_update_admin
    _, db = client

    email = "idem_admin@hacknova.dev"
    pass1 = "AdminPassword123!"
    pass2 = "DifferentPassword456!"

    # First run creates
    s1, _ = create_or_update_admin(email, "Idem Admin", pass1, db=db)
    assert s1 is True
    user = db.scalar(select(User).where(User.email == email))
    orig_hash = user.password_hash

    # Second run without reset should report exists and leave unchanged
    s2, msg2 = create_or_update_admin(email, "New Name", pass2, reset_password=False, db=db)
    assert s2 is False
    assert "already exists" in msg2

    db.refresh(user)
    assert user.password_hash == orig_hash
    assert verify_password(pass1, user.password_hash) is True
    assert verify_password(pass2, user.password_hash) is False


def test_create_admin_reset_password(client):
    from scripts.create_admin import create_or_update_admin
    _, db = client

    email = "reset_admin@hacknova.dev"
    pass1 = "AdminPassword123!"
    pass2 = "NewPassword456!"

    create_or_update_admin(email, "Reset Admin", pass1, db=db)
    user = db.scalar(select(User).where(User.email == email))
    assert verify_password(pass1, user.password_hash) is True

    # With reset_password=True, password is updated
    s2, msg2 = create_or_update_admin(email, "Reset Admin", pass2, reset_password=True, db=db)
    assert s2 is True
    assert "reset successfully" in msg2

    db.refresh(user)
    assert verify_password(pass2, user.password_hash) is True
    assert verify_password(pass1, user.password_hash) is False


def test_create_admin_cli_main_with_env(client, monkeypatch, capsys):
    import scripts.create_admin as ca_module
    _, db = client

    monkeypatch.setenv("ADMIN_EMAIL", "env_admin@hacknova.dev")
    monkeypatch.setenv("ADMIN_NAME", "Env Admin")
    monkeypatch.setenv("ADMIN_PASSWORD", "EnvAdminPassword123!")

    # Override SessionLocal to use test db
    monkeypatch.setattr(ca_module, "SessionLocal", lambda: db)

    exit_code = ca_module.main([])
    assert exit_code == 0

    user = db.scalar(select(User).where(User.email == "env_admin@hacknova.dev"))
    assert user is not None
    assert user.full_name == "Env Admin"
    assert verify_password("EnvAdminPassword123!", user.password_hash) is True

    captured = capsys.readouterr()
    assert "EnvAdminPassword123!" not in captured.out
    assert "EnvAdminPassword123!" not in captured.err


# =========================================================================
# 4. app/seed.py safety tests
# =========================================================================


def test_seed_refuses_in_production_without_allow_flag(client, monkeypatch):
    import app.seed as seed_module
    from app.core.config import settings
    _, db = client

    monkeypatch.setattr(settings, "APP_ENV", "production")
    monkeypatch.delenv("ALLOW_PRODUCTION_SEED", raising=False)

    with pytest.raises(RuntimeError, match="Seeding is disabled in production"):
        seed_module.seed(db=db)


def test_seed_refuses_in_production_without_mandatory_passwords(client, monkeypatch):
    import app.seed as seed_module
    from app.core.config import settings
    _, db = client

    monkeypatch.setattr(settings, "APP_ENV", "production")
    monkeypatch.setenv("ALLOW_PRODUCTION_SEED", "true")
    monkeypatch.delenv("SEED_ADMIN_PASSWORD", raising=False)
    monkeypatch.delenv("SEED_STUDENT_PASSWORD", raising=False)

    with pytest.raises(ValueError, match="mandatory"):
        seed_module.seed(db=db)


def test_seed_production_with_mandatory_passwords_succeeds(client, monkeypatch):
    import app.seed as seed_module
    from app.core.config import settings
    _, db = client

    monkeypatch.setattr(settings, "APP_ENV", "production")
    monkeypatch.setenv("ALLOW_PRODUCTION_SEED", "true")
    monkeypatch.setenv("SEED_ADMIN_PASSWORD", "ProdAdminSecure123!")
    monkeypatch.setenv("SEED_STUDENT_PASSWORD", "ProdStudentSecure123!")

    seed_module.seed(db=db)

    admin = db.scalar(select(User).where(User.email == "admin@hacknova.dev"))
    assert admin is not None
    assert verify_password("ProdAdminSecure123!", admin.password_hash) is True

    student = db.scalar(select(User).where(User.email == "aditi@hacknova.dev"))
    assert student is not None
    assert verify_password("ProdStudentSecure123!", student.password_hash) is True


def test_seed_non_production_defaults(client, monkeypatch):
    import app.seed as seed_module
    from app.core.config import settings
    _, db = client

    monkeypatch.setattr(settings, "APP_ENV", "development")
    monkeypatch.delenv("ALLOW_PRODUCTION_SEED", raising=False)
    monkeypatch.delenv("SEED_ADMIN_PASSWORD", raising=False)
    monkeypatch.delenv("SEED_STUDENT_PASSWORD", raising=False)

    seed_module.seed(db=db)

    admin = db.scalar(select(User).where(User.email == "admin@hacknova.dev"))
    assert admin is not None
    assert verify_password("Admin@12345", admin.password_hash) is True

    student = db.scalar(select(User).where(User.email == "aditi@hacknova.dev"))
    assert student is not None
    assert verify_password("Student@123", student.password_hash) is True


def test_seed_non_production_custom_passwords(client, monkeypatch):
    import app.seed as seed_module
    from app.core.config import settings
    _, db = client

    monkeypatch.setattr(settings, "APP_ENV", "development")
    monkeypatch.setenv("SEED_ADMIN_PASSWORD", "DevAdminCustom123!")
    monkeypatch.setenv("SEED_STUDENT_PASSWORD", "DevStudentCustom123!")

    seed_module.seed(db=db)

    admin = db.scalar(select(User).where(User.email == "admin@hacknova.dev"))
    assert admin is not None
    assert verify_password("DevAdminCustom123!", admin.password_hash) is True

    student = db.scalar(select(User).where(User.email == "aditi@hacknova.dev"))
    assert student is not None
    assert verify_password("DevStudentCustom123!", student.password_hash) is True


