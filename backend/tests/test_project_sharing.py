"""Project sharing and lifecycle:

- Viewers only ever see projects whose ``shared`` flag is set.
- Templates/theme templates are never exposed to viewers.
- Only the dataset owner or an admin may change sharing.
- Only admins may close/reopen a project; closed projects are read-only
  for everyone else (owners included).
- Charts may only be regenerated/restored by their creator or an admin.
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
    r = client.get("/api/auth/me", headers=auth_headers(token))
    assert r.status_code == 200
    return r.json()["id"]


def _upload_dataset(client, token, shared: int = 0) -> str:
    r = client.post(
        "/api/datasets/upload",
        files={"file": ("sales.csv", CSV_BYTES, "text/csv")},
        data={"shared": shared},
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


def _chart_versions(client, token, chart_id: str) -> list:
    charts = client.get("/api/charts/", headers=auth_headers(token)).json()
    chart = next(c for c in charts if c["id"] == chart_id)
    return chart["versions"]


def test_upload_defaults_to_unshared(client):
    analyst = login(client, "analyst@chartly.demo", "analyst-demo-123")
    r = client.post(
        "/api/datasets/upload",
        files={"file": ("sales.csv", CSV_BYTES, "text/csv")},
        headers=auth_headers(analyst),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["shared"] == 0
    assert body["status"] == "open"


def test_viewer_sees_only_shared_projects(client):
    analyst = login(client, "analyst@chartly.demo", "analyst-demo-123")
    viewer = login(client, "viewer@chartly.demo", "viewer-demo-123")
    private_id = _upload_dataset(client, analyst, shared=0)
    shared_id = _upload_dataset(client, analyst, shared=1)

    r = client.get("/api/datasets/", headers=auth_headers(viewer))
    assert r.status_code == 200
    ids = {d["id"] for d in r.json()}
    assert shared_id in ids
    assert private_id not in ids


def test_viewer_404_on_unshared_dataset_direct_access(client):
    analyst = login(client, "analyst@chartly.demo", "analyst-demo-123")
    viewer = login(client, "viewer@chartly.demo", "viewer-demo-123")
    private_id = _upload_dataset(client, analyst, shared=0)

    assert (
        client.get(f"/api/datasets/{private_id}", headers=auth_headers(viewer)).status_code
        == 404
    )
    assert (
        client.get(f"/api/datasets/{private_id}/preview", headers=auth_headers(viewer)).status_code
        == 404
    )


def test_viewer_sees_charts_only_in_shared_projects(client):
    analyst = login(client, "analyst@chartly.demo", "analyst-demo-123")
    viewer = login(client, "viewer@chartly.demo", "viewer-demo-123")
    private_id = _upload_dataset(client, analyst, shared=0)
    private_chart = _create_chart(client, analyst, private_id)
    shared_id = _upload_dataset(client, analyst, shared=1)
    shared_chart = _create_chart(client, analyst, shared_id)

    r = client.get("/api/charts/", headers=auth_headers(viewer))
    assert r.status_code == 200
    ids = {c["id"] for c in r.json()}
    assert shared_chart in ids
    assert private_chart not in ids

    assert (
        client.get(f"/api/charts/{private_chart}/render", headers=auth_headers(viewer)).status_code
        == 404
    )
    assert (
        client.get(f"/api/charts/{shared_chart}/render", headers=auth_headers(viewer)).status_code
        == 200
    )


def test_viewer_gets_empty_template_lists(client):
    analyst = login(client, "analyst@chartly.demo", "analyst-demo-123")
    viewer = login(client, "viewer@chartly.demo", "viewer-demo-123")
    ds_id = _upload_dataset(client, analyst)
    chart_id = _create_chart(client, analyst, ds_id)
    tpl = client.post(
        "/api/templates/",
        json={"chart_id": chart_id, "name": "Viewer Hidden"},
        headers=auth_headers(analyst),
    ).json()

    assert client.get("/api/templates/", headers=auth_headers(viewer)).json() == []
    assert client.get("/api/theme-templates/", headers=auth_headers(viewer)).json() == []
    assert (
        client.get(f"/api/templates/{tpl['id']}", headers=auth_headers(viewer)).status_code
        == 404
    )


def test_toggle_share_owner_or_admin_only(client):
    analyst = login(client, "analyst@chartly.demo", "analyst-demo-123")
    analyst2 = login(client, "analyst2@chartly.demo", "analyst2-demo-123")
    admin = login(client, "admin@chartly.demo", "admin-demo-123")
    ds_id = _upload_dataset(client, analyst, shared=0)

    assert (
        client.post(f"/api/datasets/{ds_id}/toggle-share", headers=auth_headers(analyst2)).status_code
        == 403
    )

    r = client.post(f"/api/datasets/{ds_id}/toggle-share", headers=auth_headers(analyst))
    assert r.status_code == 200
    assert r.json()["shared"] == 1

    r = client.post(f"/api/datasets/{ds_id}/toggle-share", headers=auth_headers(admin))
    assert r.status_code == 200
    assert r.json()["shared"] == 0


def test_patch_shared_requires_owner_or_admin(client):
    analyst = login(client, "analyst@chartly.demo", "analyst-demo-123")
    analyst2 = login(client, "analyst2@chartly.demo", "analyst2-demo-123")
    ds_id = _upload_dataset(client, analyst, shared=0)

    assert (
        client.patch(
            f"/api/datasets/{ds_id}",
            json={"shared": 1},
            headers=auth_headers(analyst2),
        ).status_code
        == 403
    )

    r = client.patch(f"/api/datasets/{ds_id}", json={"shared": 1}, headers=auth_headers(analyst))
    assert r.status_code == 200
    assert r.json()["shared"] == 1


def test_close_and_reopen_admin_only(client):
    analyst = login(client, "analyst@chartly.demo", "analyst-demo-123")
    admin = login(client, "admin@chartly.demo", "admin-demo-123")
    ds_id = _upload_dataset(client, analyst)

    assert client.post(f"/api/datasets/{ds_id}/close", headers=auth_headers(analyst)).status_code == 403
    assert client.post(f"/api/datasets/{ds_id}/reopen", headers=auth_headers(analyst)).status_code == 403

    closed = client.post(f"/api/datasets/{ds_id}/close", headers=auth_headers(admin))
    assert closed.status_code == 200
    assert closed.json()["status"] == "closed"

    reopened = client.post(f"/api/datasets/{ds_id}/reopen", headers=auth_headers(admin))
    assert reopened.status_code == 200
    assert reopened.json()["status"] == "open"


def test_closed_project_read_only_for_owner(client):
    analyst = login(client, "analyst@chartly.demo", "analyst-demo-123")
    admin = login(client, "admin@chartly.demo", "admin-demo-123")
    ds_id = _upload_dataset(client, analyst, shared=1)
    chart_id = _create_chart(client, analyst, ds_id)
    versions = _chart_versions(client, analyst, chart_id)
    oldest_version = versions[0]["id"]

    assert client.post(f"/api/datasets/{ds_id}/close", headers=auth_headers(admin)).status_code == 200

    # Even the dataset owner is locked out while closed.
    assert (
        client.post(
            "/api/charts/generate",
            json={"dataset_id": ds_id, "specification": SPEC},
            headers=auth_headers(analyst),
        ).status_code
        == 403
    )
    assert (
        client.post(f"/api/charts/{chart_id}/regenerate",
                    json={"dataset_id": ds_id, "specification": SPEC},
                    headers=auth_headers(analyst)).status_code
        == 403
    )
    assert (
        client.post(f"/api/charts/{chart_id}/restore/{oldest_version}", headers=auth_headers(analyst)).status_code
        == 403
    )
    assert (
        client.delete(f"/api/charts/{chart_id}", headers=auth_headers(analyst)).status_code
        == 403
    )
    assert (
        client.patch(f"/api/datasets/{ds_id}", json={"name": "Renamed"}, headers=auth_headers(analyst)).status_code
        == 403
    )
    assert (
        client.post(f"/api/datasets/{ds_id}/toggle-share", headers=auth_headers(analyst)).status_code
        == 403
    )


def test_closed_project_still_viewable_and_admin_editable(client):
    analyst = login(client, "analyst@chartly.demo", "analyst-demo-123")
    viewer = login(client, "viewer@chartly.demo", "viewer-demo-123")
    admin = login(client, "admin@chartly.demo", "admin-demo-123")
    ds_id = _upload_dataset(client, analyst, shared=1)
    chart_id = _create_chart(client, analyst, ds_id)

    assert client.post(f"/api/datasets/{ds_id}/close", headers=auth_headers(admin)).status_code == 200

    viewer_charts = client.get("/api/charts/", headers=auth_headers(viewer))
    assert viewer_charts.status_code == 200
    assert chart_id in {c["id"] for c in viewer_charts.json()}

    # Admin keeps full control in a closed project.
    r = client.post(
        "/api/charts/generate",
        json={"dataset_id": ds_id, "specification": SPEC},
        headers=auth_headers(admin),
    )
    assert r.status_code == 200


def test_regenerate_creator_or_admin_only(client):
    analyst = login(client, "analyst@chartly.demo", "analyst-demo-123")
    analyst2 = login(client, "analyst2@chartly.demo", "analyst2-demo-123")
    admin = login(client, "admin@chartly.demo", "admin-demo-123")
    ds_id = _upload_dataset(client, analyst)
    chart_id = _create_chart(client, analyst, ds_id)

    payload = {"dataset_id": ds_id, "specification": {**SPEC, "title": "Edited"}}
    assert (
        client.post(f"/api/charts/{chart_id}/regenerate", json=payload, headers=auth_headers(analyst2)).status_code
        == 403
    )
    assert (
        client.post(f"/api/charts/{chart_id}/regenerate", json=payload, headers=auth_headers(analyst)).status_code
        == 200
    )

    payload["specification"]["title"] = "Edited by admin"
    assert (
        client.post(f"/api/charts/{chart_id}/regenerate", json=payload, headers=auth_headers(admin)).status_code
        == 200
    )


def test_restore_creator_or_admin_only(client):
    analyst = login(client, "analyst@chartly.demo", "analyst-demo-123")
    analyst2 = login(client, "analyst2@chartly.demo", "analyst2-demo-123")
    admin = login(client, "admin@chartly.demo", "admin-demo-123")
    ds_id = _upload_dataset(client, analyst)
    chart_id = _create_chart(client, analyst, ds_id)

    # Create a second (current) version so the first becomes restorable.
    client.post(
        f"/api/charts/{chart_id}/regenerate",
        json={"dataset_id": ds_id, "specification": {**SPEC, "title": "v2"}},
        headers=auth_headers(analyst),
    )
    versions = _chart_versions(client, analyst, chart_id)
    oldest_version = versions[0]["id"]

    assert (
        client.post(f"/api/charts/{chart_id}/restore/{oldest_version}", headers=auth_headers(analyst2)).status_code
        == 403
    )
    assert (
        client.post(f"/api/charts/{chart_id}/restore/{oldest_version}", headers=auth_headers(analyst)).status_code
        == 200
    )