import os
import sys
import tempfile
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

_db = tempfile.mkdtemp(prefix="chartly_prod_")

os.environ["DATABASE_URL"] = "sqlite:///" + str(Path(_db, "prod.db").as_posix())
os.environ["SECRET_KEY"] = "prod-test-secret-key"
os.environ["ENVIRONMENT"] = "production"
os.environ["COOKIE_SECURE"] = "true"
os.environ.pop("ENABLE_API_DOCS", None)

from fastapi.testclient import TestClient

from main import app

failures = []


def check(name, cond):
    print(("PASS " if cond else "FAIL ") + name)
    if not cond:
        failures.append(name)


with TestClient(app) as c:
    check("docs_disabled_in_prod", c.get("/docs").status_code == 404)
    check("redoc_disabled_in_prod", c.get("/redoc").status_code == 404)
    check("openapi_disabled_in_prod", c.get("/openapi.json").status_code == 404)

    h = c.get("/health")
    check(
        "hsts_present_in_prod",
        h.headers.get("strict-transport-security") == "max-age=31536000; includeSubDomains",
    )

    r = c.post(
        "/api/auth/login",
        json={"email": "admin@chartly.demo", "password": "admin-demo-123"},
    )
    check("login_ok_in_prod", r.status_code == 200)
    sc = r.headers.get("set-cookie", "")
    check("cookie_secure_flag", "Secure" in sc)
    check("cookie_httponly_flag", "HttpOnly" in sc)
    check("cookie_samesite_lax", "SameSite=lax" in sc)

sys.exit(1 if failures else 0)