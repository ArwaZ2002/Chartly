from pathlib import Path

from app.api.auth import get_password_hash
from app.models.models import User
from tests.conftest import auth_headers, login
from tests.helpers import make_legacy_hash


def test_argon2_default_hash_format():
    h = get_password_hash("some-password")
    assert h.startswith("$argon2id$")


def test_demo_accounts_login_and_are_argon2(client, db):
    for email, password, role in [
        ("admin@chartly.demo", "admin-demo-123", "admin"),
        ("analyst@chartly.demo", "analyst-demo-123", "analyst"),
        ("viewer@chartly.demo", "viewer-demo-123", "viewer"),
    ]:
        r = client.post("/api/auth/login", json={"email": email, "password": password})
        assert r.status_code == 200, r.text
        assert r.json()["user"]["role"] == role
        user = db.query(User).filter(User.email == email).first()
        assert user is not None
        assert user.hashed_password.startswith("$argon2id$")


def test_admin_created_user_uses_argon2(client, db):
    token = login(client, "admin@chartly.demo", "admin-demo-123")
    r = client.post(
        "/api/users/",
        json={
            "name": "New User",
            "email": "newuser@test.com",
            "password": "newuser-pass-789",
            "role": "analyst",
        },
        headers=auth_headers(token),
    )
    assert r.status_code == 200, r.text

    user = db.query(User).filter(User.email == "newuser@test.com").first()
    assert user is not None
    assert user.hashed_password.startswith("$argon2id$")

    r = client.post(
        "/api/auth/login",
        json={"email": "newuser@test.com", "password": "newuser-pass-789"},
    )
    assert r.status_code == 200


def test_legacy_hash_migrated_on_successful_login(client, db):
    db.add(
        User(
            email="legacy@user.test",
            name="Legacy",
            hashed_password=make_legacy_hash("legacy-pass-456"),
            role="viewer",
        )
    )
    db.commit()

    r = client.post(
        "/api/auth/login",
        json={"email": "legacy@user.test", "password": "legacy-pass-456"},
    )
    assert r.status_code == 200, r.text

    db.expire_all()
    user = db.query(User).filter(User.email == "legacy@user.test").first()
    assert user.hashed_password.startswith("$argon2id$")

    r = client.post(
        "/api/auth/login",
        json={"email": "legacy@user.test", "password": "legacy-pass-456"},
    )
    assert r.status_code == 200


def test_legacy_hash_kept_after_wrong_password(client, db):
    db.add(
        User(
            email="legacy2@user.test",
            name="Legacy 2",
            hashed_password=make_legacy_hash("legacy-pass-456"),
            role="viewer",
        )
    )
    db.commit()

    r = client.post(
        "/api/auth/login",
        json={"email": "legacy2@user.test", "password": "totally-wrong"},
    )
    assert r.status_code == 401

    db.expire_all()
    user = db.query(User).filter(User.email == "legacy2@user.test").first()
    assert not user.hashed_password.startswith("$argon2id$")

    r = client.post(
        "/api/auth/login",
        json={"email": "legacy2@user.test", "password": "legacy-pass-456"},
    )
    assert r.status_code == 200

    db.expire_all()
    user = db.query(User).filter(User.email == "legacy2@user.test").first()
    assert user.hashed_password.startswith("$argon2id$")


def test_wrong_password_rejected(client):
    r = client.post(
        "/api/auth/login",
        json={"email": "admin@chartly.demo", "password": "definitely-wrong"},
    )
    assert r.status_code == 401
    assert r.json()["detail"] == "Incorrect email or password"


def test_sha256_only_in_legacy_migration_path():
    backend = Path(__file__).resolve().parents[1]
    hits = []
    for p in (backend / "app").rglob("*.py"):
        for i, line in enumerate(p.read_text(encoding="utf-8").splitlines(), 1):
            if "hashlib.sha256" in line.lower():
                hits.append((p, i, line.strip()))
    assert len(hits) == 1, f"expected exactly one sha256 usage, got {hits}"
    assert "app" in str(hits[0][0]) and "auth.py" in str(hits[0][0])
    assert "computed_hash" in hits[0][2]