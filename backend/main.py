from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.core.config import get_settings
from app.core.database import init_db
from app.api import api_router
import os

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.on_event("startup")
def startup():
    init_db()
    _seed_default_user()


def _seed_default_user():
    from app.core.database import SessionLocal
    from app.models.models import User
    from app.api.auth import get_password_hash

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "admin@chartly.com").first()
        if not existing:
            admin = User(
                email="admin@chartly.com",
                name="Admin",
                hashed_password=get_password_hash("admin123"),
                role="admin",
            )
            db.add(admin)

            analyst = User(
                email="analyst@chartly.com",
                name="Analyst",
                hashed_password=get_password_hash("analyst123"),
                role="analyst",
            )
            db.add(analyst)

            viewer = User(
                email="viewer@chartly.com",
                name="Viewer",
                hashed_password=get_password_hash("viewer123"),
                role="viewer",
            )
            db.add(viewer)

            db.commit()
    finally:
        db.close()


@app.get("/")
def root():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


@app.get("/health")
def health():
    return {"status": "ok"}
