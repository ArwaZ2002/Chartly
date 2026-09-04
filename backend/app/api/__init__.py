from fastapi import APIRouter
from app.api import auth, datasets, charts, templates, theme_templates, audit, users, settings, notifications

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(datasets.router, prefix="/datasets", tags=["Datasets"])
api_router.include_router(charts.router, prefix="/charts", tags=["Charts"])
api_router.include_router(templates.router, prefix="/templates", tags=["Templates"])
api_router.include_router(theme_templates.router, prefix="/theme-templates", tags=["Theme Templates"])
api_router.include_router(audit.router, prefix="/audit", tags=["Audit"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(settings.router, prefix="/settings", tags=["Settings"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
