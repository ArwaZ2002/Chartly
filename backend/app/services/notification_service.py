"""Notification fan-out helpers used by the datasets/charts endpoints.

All notification events funnel through ``create_notifications`` so the
recipient/actor rules stay consistent. Recipien resolvers below encode the
notification policy:

- ``admin_and_analyst_ids``      — the collaboration core (upload events)
- ``project_contributor_ids``    — project owner + analysts with charts there (close/reopen)
- ``viewer_ids``                 — everyone who can only view (share events)
"""

from sqlalchemy.orm import Session

from app.models.models import Chart, Dataset, Notification, User


def create_notifications(
    db: Session,
    *,
    recipient_ids: set[str],
    actor_id: str,
    action: str,
    title: str | None,
    chart_id: str | None = None,
    dataset_id: str | None = None,
) -> int:
    """Insert one Notification per recipient (never to the actor).

    Chart events set ``chart_id``; project events set ``dataset_id``.
    Returns how many notifications were created.
    """
    recipient_ids = {r for r in (recipient_ids or set()) if r and r != actor_id}
    if not recipient_ids:
        return 0

    existing = {
        u.id for u in db.query(User.id).filter(User.id.in_(list(recipient_ids))).all()
    }
    recipients = recipient_ids & existing
    notif_title = title or "Untitled"

    for rid in recipients:
        db.add(Notification(
            user_id=rid,
            chart_id=chart_id,
            dataset_id=dataset_id,
            actor_id=actor_id,
            action=action,
            title=notif_title,
            is_read=0,
        ))
    return len(recipients)


def admin_and_analyst_ids(db: Session, exclude: str | None = None) -> set[str]:
    """All admins + analysts (the collaboration core)."""
    ids = {u.id for u in db.query(User.id).filter(User.role.in_(["admin", "analyst"])).all()}
    if exclude:
        ids.discard(exclude)
    return ids


def project_contributor_ids(db: Session, dataset_id: str) -> set[str]:
    """Project owner + analysts who created charts in the project."""
    owner_id = db.query(Dataset.uploaded_by).filter(Dataset.id == dataset_id).scalar()
    contributor_ids = {
        c.created_by
        for c in db.query(Chart.created_by).filter(Chart.dataset_id == dataset_id).all()
    }
    ids = set(contributor_ids)
    if owner_id:
        ids.add(owner_id)
    user_ids = {u.id for u in db.query(User.id).filter(User.id.in_(list(ids))).all()}
    return user_ids


def viewer_ids(db: Session) -> set[str]:
    """All users who can only view shared content."""
    return {u.id for u in db.query(User.id).filter(User.role == "viewer").all()}