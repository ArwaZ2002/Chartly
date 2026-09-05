import os
import sys
import tempfile
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

_TEST_ROOT = tempfile.mkdtemp(prefix="chartly_tests_")

os.environ["DATABASE_URL"] = "sqlite:///" + str(Path(_TEST_ROOT, "test.db").as_posix())
os.environ["JWT_SECRET"] = "test-secret-key-not-for-production-long-enough-!!"
os.environ["ENVIRONMENT"] = "development"
os.environ.pop("ENABLE_API_DOCS", None)
os.environ["COOKIE_SECURE"] = "false"
os.environ["TRUST_PROXY"] = "false"

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.database import SessionLocal
from main import app
from app.models.models import User


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def db():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="session", autouse=True)
def cleanup_test_uploads():
    uploads = BACKEND_DIR / "uploads"
    before = {p for p in uploads.iterdir()} if uploads.exists() else set()
    yield
    after = {p for p in uploads.iterdir()} if uploads.exists() else set()
    for p in after - before:
        try:
            p.unlink()
        except OSError:
            pass


def login(client, email: str, password: str) -> str:
    """Log in and return the raw JWT for programmatic (Bearer) use.

    The login response intentionally does NOT contain the JWT in its JSON
    body (see security issue #3); the token is only carried in the HttpOnly
    cookie. Tests that need the raw token parse it from Set-Cookie.
    """
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    token = _cookie_value(r, get_settings().COOKIE_NAME)
    assert token, "login did not set the auth cookie"
    return token


def _cookie_value(response, name: str) -> str | None:
    set_cookie = response.headers.get("set-cookie", "")
    for part in set_cookie.split(";"):
        part = part.strip()
        if part.startswith(name + "="):
            return part.split("=", 1)[1]
    return None


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def clear_cookies(client) -> None:
    try:
        client.cookies.clear()
    except AttributeError:
        client.cookies = type(client.cookies)()