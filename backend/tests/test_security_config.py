import subprocess
import sys
from pathlib import Path

import jwt
import pytest

from tests.conftest import BACKEND_DIR, clear_cookies
from app.core.config import Settings, get_settings
from app.api.auth import create_access_token

PROD_SCRIPT = BACKEND_DIR / "tests" / "prod_checks.py"

STRONG_SECRET = "test-secret-key-not-for-production-long-enough-!!"


@pytest.fixture()
def env_without_jwt_secret(monkeypatch):
    monkeypatch.delenv("JWT_SECRET", raising=False)


def test_settings_default_has_no_secret(env_without_jwt_secret):
    settings = Settings(_env_file=None)
    assert settings.secret_key == ""


def test_app_refuses_to_start_when_jwt_secret_missing(env_without_jwt_secret):
    settings = Settings(_env_file=None)
    with pytest.raises(ValueError, match="JWT_SECRET must be set"):
        settings.validate_security_configuration()


def test_app_refuses_to_start_when_jwt_secret_empty(env_without_jwt_secret):
    settings = Settings(_env_file=None, JWT_SECRET="")
    with pytest.raises(ValueError, match="JWT_SECRET must be set"):
        settings.validate_security_configuration()


def test_app_refuses_to_start_when_jwt_secret_too_short(env_without_jwt_secret):
    settings = Settings(_env_file=None, JWT_SECRET="too-short")
    with pytest.raises(ValueError, match="at least 32"):
        settings.validate_security_configuration()


def test_app_starts_when_jwt_secret_configured():
    settings = Settings(_env_file=None, JWT_SECRET=STRONG_SECRET)
    settings.validate_security_configuration()
    assert settings.secret_key == STRONG_SECRET


def test_no_insecure_default_secret_is_used():
    assert get_settings().secret_key not in (
        "",
        "secret",
        "your-secret-key",
        "change-me",
        "dev-secret",
        "chartly-secret-key-change-in-production",
        "change-this-to-a-random-secret-key",
    )
    assert len(get_settings().secret_key) >= 32


def test_jwt_create_and_verify_with_configured_secret():
    token = create_access_token(data={"sub": 1})
    payload = jwt.decode(
        token,
        get_settings().secret_key,
        algorithms=[get_settings().ALGORITHM],
        options={"verify_sub": False},
    )
    assert payload["sub"] == 1
    assert payload["typ"] == "access"
    assert payload["jti"]


def test_production_rejects_placeholder_jwt_secret():
    settings = Settings(
        _env_file=None,
        ENVIRONMENT="production",
        JWT_SECRET="chartly-secret-key-change-in-production",
    )
    with pytest.raises(ValueError, match="unique value"):
        settings.validate_security_configuration()


def test_production_accepts_strong_jwt_secret():
    settings = Settings(
        _env_file=None,
        ENVIRONMENT="production",
        JWT_SECRET="production-test-secret-key-with-32-characters-minimum",
    )
    settings.validate_security_configuration()


def test_docs_enabled_in_dev(client):
    assert client.get("/docs").status_code == 200
    assert client.get("/redoc").status_code == 200
    assert client.get("/openapi.json").status_code == 200


def test_no_hsts_in_dev(client):
    r = client.get("/health")
    assert "Strict-Transport-Security" not in r.headers


def test_cookie_not_secure_in_dev(client):
    r = client.post(
        "/api/auth/login",
        json={"email": "admin@chartly.demo", "password": "admin-demo-123"},
    )
    assert r.status_code == 200
    sc = r.headers.get("set-cookie", "")
    assert "HttpOnly" in sc
    assert "SameSite=lax" in sc
    assert "Secure" not in sc


def test_login_response_does_not_contain_jwt(client):
    r = client.post(
        "/api/auth/login",
        json={"email": "admin@chartly.demo", "password": "admin-demo-123"},
    )
    assert r.status_code == 200
    body = r.json()
    assert "token" not in body
    assert "Authorization" not in body
    assert "access_token" not in body
    assert body["email"] == "admin@chartly.demo"


def test_login_sets_httponly_auth_cookie(client):
    r = client.post(
        "/api/auth/login",
        json={"email": "admin@chartly.demo", "password": "admin-demo-123"},
    )
    assert r.status_code == 200
    sc = r.headers.get("set-cookie", "")
    assert sc.startswith("chartly_token=")
    assert "HttpOnly" in sc
    assert "Path=/" in sc
    assert "Max-Age=" in sc


def test_protected_endpoint_works_with_cookie(client):
    r = client.post(
        "/api/auth/login",
        json={"email": "admin@chartly.demo", "password": "admin-demo-123"},
    )
    assert r.status_code == 200
    assert client.get("/api/auth/me").status_code == 200
    assert client.get("/api/datasets").status_code == 200


def test_request_without_auth_is_rejected(client):
    clear_cookies(client)
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/datasets").status_code == 401


def test_logout_clears_auth_cookie(client):
    r = client.post(
        "/api/auth/login",
        json={"email": "admin@chartly.demo", "password": "admin-demo-123"},
    )
    assert r.status_code == 200
    assert "chartly_token=" in r.headers.get("set-cookie", "")
    assert client.get("/api/auth/me").status_code == 200

    r = client.post("/api/auth/logout")
    assert r.status_code == 200
    invalidating = r.headers.get("set-cookie", "")
    assert "chartly_token=" in invalidating
    assert "Max-Age=0" in invalidating
    assert client.get("/api/auth/me").status_code == 401


def test_cors_credentials_configuration(client):
    ok = client.get("/health", headers={"Origin": "http://localhost:8000"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:8000"
    assert ok.headers.get("access-control-allow-origin") != "*"
    assert ok.headers.get("access-control-allow-credentials") == "true"

    preflight = client.options(
        "/api/auth/login",
        headers={
            "Origin": "http://localhost:8000",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert preflight.status_code == 200
    assert preflight.headers.get("access-control-allow-origin") == "http://localhost:8000"
    assert preflight.headers.get("access-control-allow-credentials") == "true"


def test_production_mode():
    # pytest's fd capture (used when no terminal) can end up closing the
    # devnull descriptor cached by subprocess.Popen, so re-opening it here
    # avoids a stale-handle "WinError 6" when the subprocess is spawned.
    subprocess.Popen._devnull = None
    result = subprocess.run(
        [sys.executable, str(PROD_SCRIPT)],
        capture_output=True,
        text=True,
        cwd=str(BACKEND_DIR),
        timeout=120,
    )
    print(result.stdout)
    assert result.returncode == 0, result.stderr
