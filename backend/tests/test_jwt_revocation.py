from app.core.config import get_settings
from tests.conftest import clear_cookies, login

settings = get_settings()


def test_revoke_via_cookie_kills_bearer_and_cookie(client):
    token = login(client, "admin@chartly.demo", "admin-demo-123")
    assert client.get("/api/auth/me").status_code == 200

    r = client.post("/api/auth/logout")
    assert r.status_code == 200

    assert (
        client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code
        == 401
    )
    assert (
        client.get("/api/auth/me", cookies={settings.COOKIE_NAME: token}).status_code == 401
    )


def test_revoke_via_bearer_kills_bearer_and_cookie(client):
    token = login(client, "analyst@chartly.demo", "analyst-demo-123")
    clear_cookies(client)

    r = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200

    assert (
        client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code
        == 401
    )
    assert (
        client.get("/api/auth/me", cookies={settings.COOKIE_NAME: token}).status_code == 401
    )


def test_unrelated_token_still_valid_after_other_revocation(client):
    token_a = login(client, "admin@chartly.demo", "admin-demo-123")
    token_b = login(client, "analyst@chartly.demo", "analyst-demo-123")
    clear_cookies(client)

    r = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token_b}"})
    assert r.status_code == 200

    assert (
        client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_a}"}).status_code
        == 200
    )
    assert (
        client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_b}"}).status_code
        == 401
    )


def test_revoked_token_rejected_on_other_endpoints(client):
    token = login(client, "admin@chartly.demo", "admin-demo-123")
    clear_cookies(client)
    assert client.get("/api/datasets", headers={"Authorization": f"Bearer {token}"}).status_code == 200

    r = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200

    assert (
        client.get("/api/datasets", headers={"Authorization": f"Bearer {token}"}).status_code
        == 401
    )


def test_login_after_logout_gets_fresh_working_token(client):
    token = login(client, "viewer@chartly.demo", "viewer-demo-123")
    clear_cookies(client)
    assert (
        client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code
        == 200
    )

    client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})

    token2 = login(client, "viewer@chartly.demo", "viewer-demo-123")
    assert (
        client.get("/api/auth/me", headers={"Authorization": f"Bearer {token2}"}).status_code
        == 200
    )
    assert (
        client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code
        == 401
    )
