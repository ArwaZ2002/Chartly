"""Ownership checks: charts and templates can only be deleted by their
creator or an admin."""

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
    r = client.get("/api/auth/me", headers=auth_headers(token))
    assert r.status_code == 200
    return r.json()["id"]


def _upload_dataset(client, token) -> str:
    r = client.post(
        "/api/datasets/upload",
        files={"file": ("sales.csv", CSV_BYTES, "text/csv")},
        headers=auth_headers(token),
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


def _create_chart(client, token, dataset_id: str) -> str:
    r = client.post(
        "/api/charts/generate",
        json={"dataset_id": dataset_id, "specification": SPEC},
        headers=auth_headers(token),
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


def _create_template(client, token, chart_id: str) -> dict:
    r = client.post(
        "/api/templates/",
        json={"chart_id": chart_id, "name": "Shared Template"},
        headers=auth_headers(token),
    )
    assert r.status_code == 200, r.text
    return r.json()


def test_template_records_the_actual_creator(client):
    analyst = login(client, "analyst@chartly.demo", "analyst-demo-123")
    analyst_id = _user_id(client, analyst)
    ds_id = _upload_dataset(client, analyst)
    chart_id = _create_chart(client, analyst, ds_id)
    tpl = _create_template(client, analyst, chart_id)
    assert tpl["created_by"] == analyst_id


def test_template_exposes_the_creator_name(client):
    analyst = login(client, "analyst@chartly.demo", "analyst-demo-123")
    me = client.get("/api/auth/me", headers=auth_headers(analyst))
    assert me.status_code == 200
    expected_name = me.json()["name"]

    ds_id = _upload_dataset(client, analyst)
    chart_id = _create_chart(client, analyst, ds_id)
    tpl = _create_template(client, analyst, chart_id)
    assert tpl["created_by_name"] == expected_name

    listing = client.get("/api/templates/", headers=auth_headers(analyst))
    assert listing.status_code == 200
    found = next(t for t in listing.json() if t["id"] == tpl["id"])
    assert found["created_by_name"] == expected_name


def test_legacy_system_template_cannot_be_deleted_by_user(client):
    analyst = login(client, "analyst@chartly.demo", "analyst-demo-123")
    admin = login(client, "admin@chartly.demo", "admin-demo-123")

    r = client.get("/api/templates/", headers=auth_headers(admin))
    assert r.status_code == 200
    system_tpl = next((t for t in r.json() if t["created_by"] == "system"), None)
    if system_tpl is None:
        return

    assert (
        client.delete(f"/api/templates/{system_tpl['id']}", headers=auth_headers(analyst)).status_code
        == 403
    )


def test_chart_delete_only_creator_or_admin(client):
    analyst = login(client, "analyst@chartly.demo", "analyst-demo-123")
    analyst2 = login(client, "analyst2@chartly.demo", "analyst2-demo-123")
    ds_id = _upload_dataset(client, analyst)
    chart_id = _create_chart(client, analyst, ds_id)

    assert (
        client.delete(f"/api/charts/{chart_id}", headers=auth_headers(analyst2)).status_code
        == 403
    )
    assert (
        client.delete(f"/api/charts/{chart_id}", headers=auth_headers(analyst)).status_code
        == 200
    )


def test_chart_admin_can_delete_any_chart(client):
    analyst = login(client, "analyst@chartly.demo", "analyst-demo-123")
    admin = login(client, "admin@chartly.demo", "admin-demo-123")
    ds_id = _upload_dataset(client, analyst)
    chart_id = _create_chart(client, analyst, ds_id)

    assert (
        client.delete(f"/api/charts/{chart_id}", headers=auth_headers(admin)).status_code
        == 200
    )


def test_template_delete_only_creator_or_admin(client):
    analyst = login(client, "analyst@chartly.demo", "analyst-demo-123")
    analyst2 = login(client, "analyst2@chartly.demo", "analyst2-demo-123")
    admin = login(client, "admin@chartly.demo", "admin-demo-123")
    ds_id = _upload_dataset(client, analyst)
    chart_id = _create_chart(client, analyst, ds_id)
    tpl = _create_template(client, analyst, chart_id)
    tpl_id = tpl["id"]

    assert (
        client.delete(f"/api/templates/{tpl_id}", headers=auth_headers(analyst2)).status_code
        == 403
    )
    assert (
        client.delete(f"/api/templates/{tpl_id}", headers=auth_headers(analyst)).status_code
        == 200
    )


def test_template_admin_can_delete_any_template(client):
    analyst = login(client, "analyst@chartly.demo", "analyst-demo-123")
    admin = login(client, "admin@chartly.demo", "admin-demo-123")
    ds_id = _upload_dataset(client, analyst)
    chart_id = _create_chart(client, analyst, ds_id)
    tpl = _create_template(client, analyst, chart_id)

    assert (
        client.delete(f"/api/templates/{tpl['id']}", headers=auth_headers(admin)).status_code
        == 200
    )


def test_viewer_cannot_delete_charts_or_templates(client):
    analyst = login(client, "analyst@chartly.demo", "analyst-demo-123")
    viewer = login(client, "viewer@chartly.demo", "viewer-demo-123")
    ds_id = _upload_dataset(client, analyst)
    chart_id = _create_chart(client, analyst, ds_id)
    tpl = _create_template(client, analyst, chart_id)

    assert (
        client.delete(f"/api/charts/{chart_id}", headers=auth_headers(viewer)).status_code
        == 403
    )
    assert (
        client.delete(f"/api/templates/{tpl['id']}", headers=auth_headers(viewer)).status_code
        == 403
    )