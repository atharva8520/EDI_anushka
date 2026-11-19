"""CLI script to create or update an admin user."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

# Ensure backend root is on sys.path
backend_root = Path(__file__).resolve().parents[1]
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.database.session import SessionLocal
from app.models.profile import Profile
from app.models.user import User, UserRole


def create_or_update_admin(
    email: str,
    full_name: str,
    password: str,
    reset_password: bool = False,
    db: Session | None = None,
) -> tuple[bool, str]:
    if not email or not email.strip():
        raise ValueError("Admin email cannot be empty.")
    if not full_name or not full_name.strip():
        raise ValueError("Admin full name cannot be empty.")
    if not password or len(password) < 12:
        raise ValueError("Admin password must be at least 12 characters long.")

    clean_email = email.strip().lower()
    clean_name = full_name.strip()

    close_session = False
    if db is None:
        db = SessionLocal()
        close_session = True

    try:
        user = db.scalar(select(User).where(User.email == clean_email))
        if user is not None:
            if not reset_password:
                return False, f"Admin user with email '{clean_email}' already exists. No changes made."
            user.password_hash = hash_password(password)
            user.full_name = clean_name
            user.role = UserRole.admin
            user.is_active = True
            db.commit()
            return True, f"Password reset successfully for admin '{clean_email}'."

        new_admin = User(
            email=clean_email,
            password_hash=hash_password(password),
            full_name=clean_name,
            role=UserRole.admin,
            is_active=True,
        )
        new_admin.profile = Profile(bio="Organizer account", avatar_seed=clean_name)
        db.add(new_admin)
        db.commit()
        return True, f"Admin user '{clean_email}' created successfully."
    finally:
        if close_session:
            db.close()


def main(args: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Create or reset an admin user.")
    parser.add_argument(
        "--email",
        default=os.getenv("ADMIN_EMAIL"),
        help="Admin email (or ADMIN_EMAIL environment variable)",
    )
    parser.add_argument(
        "--name",
        "--full-name",
        dest="name",
        default=os.getenv("ADMIN_NAME"),
        help="Admin full name (or ADMIN_NAME environment variable)",
    )
    parser.add_argument(
        "--password",
        default=os.getenv("ADMIN_PASSWORD"),
        help="Admin password (or ADMIN_PASSWORD environment variable)",
    )
    parser.add_argument(
        "--reset-password",
        action="store_true",
        help="Reset password if user already exists",
    )

    parsed = parser.parse_args(args)

    if not parsed.email:
        sys.stderr.write("Error: Admin email is required (use --email or ADMIN_EMAIL).\n")
        return 1
    if not parsed.name:
        sys.stderr.write("Error: Admin full name is required (use --name or ADMIN_NAME).\n")
        return 1
    if not parsed.password:
        sys.stderr.write("Error: Admin password is required (use --password or ADMIN_PASSWORD).\n")
        return 1
    if len(parsed.password) < 12:
        sys.stderr.write("Error: Admin password must be at least 12 characters long.\n")
        return 1

    try:
        success, message = create_or_update_admin(
            email=parsed.email,
            full_name=parsed.name,
            password=parsed.password,
            reset_password=parsed.reset_password,
        )
        sys.stdout.write(f"{message}\n")
        return 0
    except Exception as exc:
        sys.stderr.write(f"Error: {exc}\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
