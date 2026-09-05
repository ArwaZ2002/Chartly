import subprocess
import sys
from pathlib import Path

import jwt
import pytest

from tests.conftest import BACKEND_DIR
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


def test_production_mode():
    result = subprocess.run(
        [sys.executable, str(PROD_SCRIPT)],
        capture_output=True,
        text=True,
        cwd=str(BACKEND_DIR),
        timeout=120,
    )
    print(result.stdout)
    assert result.returncode == 0, result.stderr
