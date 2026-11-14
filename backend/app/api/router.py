from fastapi import APIRouter

from app.api.routes import auth, dashboard, hackathons, students, teams, users

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(hackathons.router)
api_router.include_router(teams.router)
api_router.include_router(students.router)
api_router.include_router(dashboard.router)
