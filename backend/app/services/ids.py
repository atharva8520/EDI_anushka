import re
import secrets
import string

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.hackathon import Hackathon
from app.models.team import Team


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:180] or "hackathon"


def unique_slug(db: Session, name: str) -> str:
    base = slugify(name)
    slug = base
    n = 2
    while db.scalar(select(Hackathon.id).where(Hackathon.slug == slug)):
        slug = f"{base}-{n}"
        n += 1
    return slug


def generate_invite_code(db: Session) -> str:
    alphabet = string.ascii_uppercase + string.digits
    while True:
        code = "".join(secrets.choice(alphabet) for _ in range(8))
        exists = db.scalar(select(Team.id).where(Team.invite_code == code))
        if not exists:
            return code
