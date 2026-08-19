import subprocess
import sys
from pathlib import Path

from tests.conftest import BACKEND_DIR, login

PROD_SCRIPT = BACKEND_DIR / "tests" / "prod_checks.py"


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