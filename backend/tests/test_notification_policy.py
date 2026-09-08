"""Notification policy:

- Project upload  -> all admins + analysts (actor excluded)
- Chart created   -> the project owner (actor excluded)
- Regenerate/Restore -> chart creator + prior editors (actor excluded)
- Project close/reopen -> project owner + analysts with charts there (actor excluded)
- Project shared  -> all viewers, but only on the 0->1 transition

In-app delivery only; notifications are chart- or project-scoped rows.
"""

from tests.conftest import auth_headers, login

CSV_BYTES = b"category,value\na,1\nb,2\nc,3\n"
SPEC = {
    "chart_type": "bar",
    "dimension": "category",
    "metric": "value",
    "aggregation": "sum",
    "sorting": "none",
    "orientation": "vertical",
    "show_labels": False,
}


def _user_id(client, token) -> str:
    return client.get("/api/auth/me", headers=auth_headers(token)).json()["id"]


def _upload_dataset(client, token, shared: int = 0) -> str:
    r = client.post(
        "/api/datasets/upload",
        files={"file": ("sales.csv", CSV_BYTES, "text/csv")},
        data={"shared": shared},
        headers=auth_headers(token),
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


def _create_chart(client, token, dataset_id: str, title: str = "Sales Chart") -> str:
    spec = {**SPEC, "title": title}
    r = client.post(
        "/api/charts/generate",
        json={"dataset_id": dataset_id, "specification": spec},
        headers=auth_headers(token),
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


def _notifs(client, token) -> list:
    r = client.get("/api/notifications/", headers=auth_headers(token))
    assert r.status_code == 200, r.text
    return r.json()


def _find(notifs, action, dataset_id=None, chart_id=None):
    for n in notifs:
        if n["action"] != action:
            continue
        if dataset_id is not None and n.get("dataset_id") != dataset_id:
            continue
        if chart_id is not None and n.get("chart_id") != chart_id:
            continue
        return n
    return None


def _count(notifs, action, dataset_id=None, chart_id=None):
    return sum(1 for n in _find_all(notifs, action, dataset_id, chart_id))


def _find_all(notifs, action, dataset_id=None, chart_id=None):
    return [
        n for n in notifs
        if n["action"] == action
        and (dataset_id is None or n.get("dataset_id") == dataset_id)
        and (chart_id is None or n.get("chart_id") == chart_id)
    ]


def test_upload_notifies_other_analysts_and_admins(client):
    analyst = login(client, "analyst@chartly.demo", "analyst-demo-123")
    analyst2 = login(client, "analyst2@chartly.demo", "analyst2-demo-123")
    admin = login(client, "admin@chartly.demo", "admin-demo-123")
    viewer = login(client, "viewer@chartly.demo", "viewer-demo-123")
    analyst_id = _user_id(client, analyst)

    ds_id = _upload_dataset(client, analyst)

    admin_notif = _find(_notifs(client, admin), "upload", dataset_id=ds_id)
    assert admin_notif is not None
    assert admin_notif["actor_id"] == analyst_id
    assert admin_notif["chart_id"] is None
    assert admin_notif["dataset_id"] == ds_id
    assert admin_notif["chart_title"] == "sales"

    other_analyst_notif = _find(_notifs(client, analyst2), "upload", dataset_id=ds_id)
    assert other_analyst_notif is not None

    # Actor excluded, viewer not in the collaboration core.
    assert _find(_notifs(client, analyst), "upload", dataset_id=ds_id) is None
    assert _find(_notifs(client, viewer), "upload", dataset_id=ds_id) is None


def test_admin_upload_notifies_analysts_not_self(client):
    admin = login(client, "admin@chartly.demo", "admin-demo-123")
    analyst = login(client, "analyst@chartly.demo", "analyst-demo-123")

    ds_id = _upload_dataset(client, admin)

    assert _find(_notifs(client, analyst), "upload", dataset_id=ds_id) is not None
    assert _find(_notifs(client, admin), "upload", dataset_id=ds_id) is None


def test_chart_create_notifies_project_owner_not_creator(client):
    analyst = login(client, "analyst@chartly.demo", "analyst-demo-123")
    analyst2 = login(client, "analyst2@chartly.demo", "analyst2-demo-123")

    ds_id = _upload_dataset(client, analyst)
    chart_id = _create_chart(client, analyst2, ds_id)

    owner_notif = _find(_notifs(client, analyst), "create", chart_id=chart_id)
    assert owner_notif is not None
    assert owner_notif["dataset_id"] == ds_id

    # Owner editing their own project gets nothing for their own chart.
    own_chart_id = _create_chart(client, analyst, ds_id)
    assert _find(_notifs(client, analyst), "create", chart_id=own_chart_id) is None


def test_close_and_reopen_notify_contributors(client):
    analyst = login(client, "analyst@chartly.demo", "analyst-demo-123")
    analyst2 = login(client, "analyst2@chartly.demo", "analyst2-demo-123")
    admin = login(client, "admin@chartly.demo", "admin-demo-123")
    viewer = login(client, "viewer@chartly.demo", "viewer-demo-123")

    ds_id = _upload_dataset(client, analyst)
    _create_chart(client, analyst2, ds_id)

    assert client.post(f"/api/datasets/{ds_id}/close", headers=auth_headers(admin)).status_code == 200
    assert client.post(f"/api/datasets/{ds_id}/reopen", headers=auth_headers(admin)).status_code == 200

    owner_close = _find(_notifs(client, analyst), "close", dataset_id=ds_id)
    contributor_close = _find(_notifs(client, analyst2), "close", dataset_id=ds_id)
    assert owner_close is not None
    assert contributor_close is not None
    assert owner_close["chart_id"] is None

    owner_reopen = _find(_notifs(client, analyst), "reopen", dataset_id=ds_id)
    assert owner_reopen is not None
    assert _find(_notifs(client, analyst2), "reopen", dataset_id=ds_id) is not None

    # Viewers are not project contributors.
    assert _find(_notifs(client, viewer), "close", dataset_id=ds_id) is None
    # Admin actor excluded.
    assert _find(_notifs(client, admin), "close", dataset_id=ds_id) is None


def test_share_notifies_all_viewers_on_0_1_transition(client, db):
    analyst = login(client, "analyst@chartly.demo", "analyst-demo-123")
    admin = login(client, "admin@chartly.demo", "admin-demo-123")
    viewer = login(client, "viewer@chartly.demo", "viewer-demo-123")

    r = client.post(
        "/api/users/",
        json={"name": "Viewer Two", "email": "viewer2@chartly.demo", "password": "viewer-two-123", "role": "viewer"},
        headers=auth_headers(admin),
    )
    assert r.status_code == 200, r.text
    viewer2 = login(client, "viewer2@chartly.demo", "viewer-two-123")

    ds_id = _upload_dataset(client, analyst, shared=0)

    assert client.post(f"/api/datasets/{ds_id}/toggle-share", headers=auth_headers(analyst)).status_code == 200
    assert _find(_notifs(client, viewer), "shared", dataset_id=ds_id) is not None
    assert _find(_notifs(client, viewer2), "shared", dataset_id=ds_id) is not None

    # Unshare + repeated turn-ons each notify once; read side is unaffected.
    assert client.post(f"/api/datasets/{ds_id}/toggle-share", headers=auth_headers(analyst)).status_code == 200
    assert _count(_notifs(client, viewer), "shared", dataset_id=ds_id) == 1
    assert client.post(f"/api/datasets/{ds_id}/toggle-share", headers=auth_headers(analyst)).status_code == 200
    assert _count(_notifs(client, viewer), "shared", dataset_id=ds_id) == 2


def test_patch_shared_also_notifies_viewers(client):
    analyst = login(client, "analyst@chartly.demo", "analyst-demo-123")
    viewer = login(client, "viewer@chartly.demo", "viewer-demo-123")

    ds_id = _upload_dataset(client, analyst, shared=0)
    r = client.patch(f"/api/datasets/{ds_id}", json={"shared": 1}, headers=auth_headers(analyst))
    assert r.status_code == 200

    assert _find(_notifs(client, viewer), "shared", dataset_id=ds_id) is not None


def test_regenerate_and_restore_still_notify_creator(client):
    analyst = login(client, "analyst@chartly.demo", "analyst-demo-123")
    admin = login(client, "admin@chartly.demo", "admin-demo-123")

    ds_id = _upload_dataset(client, analyst)
    chart_id = _create_chart(client, analyst, ds_id)
    payload = {"dataset_id": ds_id, "specification": {**SPEC, "title": "Edited"}}

    assert client.post(f"/api/charts/{chart_id}/regenerate", json=payload, headers=auth_headers(admin)).status_code == 200
    assert _find(_notifs(client, analyst), "regenerate", chart_id=chart_id) is not None
    assert _find(_notifs(client, admin), "regenerate", chart_id=chart_id) is None

    # Restore needs a non-current version; regenerate created a second one.
    chart = next(c for c in client.get("/api/charts/", headers=auth_headers(analyst)).json() if c["id"] == chart_id)
    oldest_version = chart["versions"][0]["id"]
    assert client.post(f"/api/charts/{chart_id}/restore/{oldest_version}", headers=auth_headers(admin)).status_code == 200
    assert _find(_notifs(client, analyst), "restore", chart_id=chart_id) is not None

    # Self-edit is never notified.
    assert client.post(f"/api/charts/{chart_id}/regenerate", json=payload, headers=auth_headers(analyst)).status_code == 200
    restore_count = _count(_notifs(client, analyst), "restore", chart_id=chart_id)
    assert restore_count == 1


def test_deleting_dataset_removes_project_notifications(client, db):
    from app.models.models import Notification

    analyst = login(client, "analyst@chartly.demo", "analyst-demo-123")
    admin = login(client, "admin@chartly.demo", "admin-demo-123")

    ds_id = _upload_dataset(client, analyst, shared=1)
    assert client.post(f"/api/datasets/{ds_id}/close", headers=auth_headers(admin)).status_code == 200

    assert db.query(Notification).filter(Notification.dataset_id == ds_id).count() > 0
    assert client.delete(f"/api/datasets/{ds_id}", headers=auth_headers(admin)).status_code == 200
    assert db.query(Notification).filter(Notification.dataset_id == ds_id).count() == 0