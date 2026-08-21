import logging
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import get_settings
from app.core.database import init_db
from app.api import api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

logger = logging.getLogger(__name__)

settings = get_settings()


class SecurityMiddleware(BaseHTTPMiddleware):
    """Security headers + lightweight CSRF defense for cookie-based auth.

    Headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, CSP.
    HSTS is only added when serving over HTTPS (COOKIE_SECURE=true).
    For state-changing methods, requests with an Origin header that is not
    in the allowlist are rejected. Same-origin requests and API clients
    (no Origin header) are unaffected.
    """

    UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

    CSP = (
        "default-src 'self'; "
        "script-src 'self' https://cdn.plot.ly 'unsafe-inline'; "
        "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; "
        "font-src 'self' https://fonts.gstatic.com data:; "
        "img-src 'self' data:; "
        "connect-src 'self'; "
        "base-uri 'self'; "
        "form-action 'self'; "
        "frame-ancestors 'none'"
    )

    def __init__(self, app, allowed_origins, hsts: bool = False):
        super().__init__(app)
        self.allowed_origins = set(allowed_origins)
        self.hsts = hsts

    async def dispatch(self, request: Request, call_next):
        if request.method in self.UNSAFE_METHODS:
            origin = request.headers.get("origin")
            own_origin = f"{request.url.scheme}://{request.headers.get('host', '')}"
            if origin and origin not in self.allowed_origins and origin != own_origin:
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Origin not allowed"},
                )
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = self.CSP
        if self.hsts:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.api_docs_enabled else None,
    redoc_url="/redoc" if settings.api_docs_enabled else None,
    openapi_url="/openapi.json" if settings.api_docs_enabled else None,
)

app.add_middleware(
    SecurityMiddleware,
    allowed_origins=settings.cors_origins,
    hsts=settings.COOKIE_SECURE,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


def _seed_default_settings():
    from app.core.database import SessionLocal
    from app.models.models import Setting

    db = SessionLocal()
    try:
        defaults = {"platform_name": "Chartly", "default_chart_type": "bar"}
        for key, value in defaults.items():
            existing = db.query(Setting).filter(Setting.key == key).first()
            if not existing:
                db.add(Setting(key=key, value=value))
        db.commit()
    finally:
        db.close()


# Demo accounts for the public MVP. These are intentionally fake credentials
# documented in the README so anyone can test the app after cloning.
DEMO_USERS = [
    {"email": "admin@chartly.demo", "name": "Admin", "password": "admin-demo-123", "role": "admin"},
    {"email": "analyst@chartly.demo", "name": "Analyst", "password": "analyst-demo-123", "role": "analyst"},
    {"email": "viewer@chartly.demo", "name": "Viewer", "password": "viewer-demo-123", "role": "viewer"},
]


def _seed_default_user():
    from app.core.database import SessionLocal
    from app.models.models import User
    from app.api.auth import get_password_hash

    db = SessionLocal()
    try:
        for demo in DEMO_USERS:
            existing = db.query(User).filter(User.email == demo["email"]).first()
            if not existing:
                db.add(
                    User(
                        email=demo["email"],
                        name=demo["name"],
                        hashed_password=get_password_hash(demo["password"]),
                        role=demo["role"],
                    )
                )
        db.commit()
    finally:
        db.close()


@app.get("/")
def root():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


@app.get("/health")
def health():
    return {"status": "ok"}


# Initialize the schema and demo data at import time (not in a startup event)
# so it also runs reliably on serverless cold starts (e.g. Vercel), where
# lifespan ordering is not guaranteed. All operations are idempotent.
init_db()
_seed_default_user()
_seed_default_settings()