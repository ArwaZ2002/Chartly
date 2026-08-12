from fastapi import APIRouter
from app.api import auth, datasets, charts, templates, audit

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(datasets.router, prefix="/datasets", tags=["Datasets"])
api_router.include_router(charts.router, prefix="/charts", tags=["Charts"])
api_router.include_router(templates.router, prefix="/templates", tags=["Templates"])
api_router.include_router(audit.router, prefix="/audit", tags=["Audit"])
