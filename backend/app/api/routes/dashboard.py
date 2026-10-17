from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_admin
from app.database.session import get_db
from app.models.user import User, UserRole
from app.schemas.dashboard import AdminStats, StudentDashboard
from app.services.dashboard_service import admin_stats, student_dashboard

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard", response_model=StudentDashboard)
def get_student_dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != UserRole.student:
        # Admins still get a compact payload if they hit this route.
        pass
    return student_dashboard(db, user)


@router.get("/admin/stats", response_model=AdminStats)
def get_admin_stats(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    return admin_stats(db)
