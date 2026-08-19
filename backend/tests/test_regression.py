import pytest

from tests.conftest import auth_headers, clear_cookies, login

CSV_BYTES = b"category,value\na,1\nb,2\nc,3\n"
GARBAGE_BYTES = b"\x89PK\x03\x04 not really a csv \xff\xfe\x00"


def test_rbac_users_admin_only(client):
    admin = login(client, "admin@chartly.demo", "admin-demo-123")
    analyst = login(client, "analyst@chartly.demo", "analyst-demo-123")
    viewer = login(client, "viewer@chartly.demo", "viewer-demo-123")

    assert client.get("/api/users/", headers=auth_headers(admin)).status_code == 200
    assert client.get("/api/users/", headers=auth_headers(analyst)).status_code == 403
    assert client.get("/api/users/", headers=auth_headers(viewer)).status_code == 403
    clear_cookies(client)
    assert client.get("/api/users/").status_code == 401


def test_rbac_upload_roles(client):
    analyst = login(client, "analyst@chartly.demo", "analyst-demo-123")
    viewer = login(client, "viewer@chartly.demo", "viewer-demo-123")

    r = client.post(
        "/api/datasets/upload",
        files={"file": ("sales.csv", CSV_BYTES, "text/csv")},
        headers=auth_headers(analyst),
    )
    assert r.status_code == 200, r.text

    r = client.post(
        "/api/datasets/upload",
        files={"file": ("sales.csv", CSV_BYTES, "text/csv")},
        headers=auth_headers(viewer),
    )
    assert r.status_code == 403

    clear_cookies(client)
    r = client.post(
        "/api/datasets/upload",
        files={"file": ("sales.csv", CSV_BYTES, "text/csv")},
    )
    assert r.status_code == 401


def test_upload_csv_ok(client):
    token = login(client, "analyst@chartly.demo", "analyst-demo-123")
    r = client.post(
        "/api/datasets/upload",
        files={"file": ("sales.csv", CSV_BYTES, "text/csv")},
        headers=auth_headers(token),
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["row_count"] == 3
    assert {c["name"] for c in data["columns"]} == {"category", "value"}


def test_upload_bad_extension(client):
    token = login(client, "analyst@chartly.demo", "analyst-demo-123")
    r = client.post(
        "/api/datasets/upload",
        files={"file": ("notes.txt", b"hello", "text/plain")},
        headers=auth_headers(token),
    )
    assert r.status_code == 400
    assert "not allowed" in r.json()["detail"]


def test_upload_wrong_mime(client):
    token = login(client, "analyst@chartly.demo", "analyst-demo-123")
    r = client.post(
        "/api/datasets/upload",
        files={"file": ("sales.csv", CSV_BYTES, "image/png")},
        headers=auth_headers(token),
    )
    assert r.status_code == 400
    assert "content type" in r.json()["detail"]


def test_upload_garbage_file_rejected(client):
    token = login(client, "analyst@chartly.demo", "analyst-demo-123")
    r = client.post(
        "/api/datasets/upload",
        files={"file": ("broken.csv", GARBAGE_BYTES, "text/csv")},
        headers=auth_headers(token),
    )
    assert r.status_code == 400


def test_rate_limit_blocks_after_5_failures(client):
    email = "ratelimit-test@example.com"
    for _ in range(5):
        r = client.post("/api/auth/login", json={"email": email, "password": "nope"})
        assert r.status_code == 401

    r = client.post("/api/auth/login", json={"email": email, "password": "nope"})
    assert r.status_code == 429
    assert "Retry-After" in r.headers

    r = client.post(
        "/api/auth/login",
        json={"email": email, "password": "correct-pass"},
    )
    assert r.status_code == 429


def test_security_headers_present(client):
    r = client.get("/health")
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["x-frame-options"] == "DENY"
    assert r.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert "default-src 'self'" in r.headers["content-security-policy"]
    assert "frame-ancestors 'none'" in r.headers["content-security-policy"]
    assert "Strict-Transport-Security" not in r.headers


def test_csrf_origin_blocked(client):
    r = client.post(
        "/api/auth/login",
        json={"email": "admin@chartly.demo", "password": "admin-demo-123"},
        headers={"Origin": "http://evil.example"},
    )
    assert r.status_code == 403