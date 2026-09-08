from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Notification, User, Chart
from app.models.schemas import NotificationResponse, UnreadCountResponse
from app.api.auth import get_current_user

router = APIRouter()

MAX_PER_USER = 100
RETENTION_DAYS = 30


def _purge_old(db: Session, user_id: str):
    """Delete notifications older than 30 days and cap to 100 per user."""
    cutoff = datetime.utcnow() - timedelta(days=RETENTION_DAYS)
    # Delete old by age (for this user)
    db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.created_at < cutoff
    ).delete()
    # Cap to 100: keep latest 100, delete rest
    total = db.query(Notification).filter(Notification.user_id == user_id).count()
    if total > MAX_PER_USER:
        to_keep_ids = [
            n.id for n in db.query(Notification.id)
            .filter(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc(), Notification.id.desc())
            .limit(MAX_PER_USER)
            .all()
        ]
        db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.id.notin_(to_keep_ids)
        ).delete(synchronize_session=False)
    db.commit()


def _to_response(n: Notification, actor_name: str, chart_title: str | None) -> NotificationResponse:
    return NotificationResponse(
        id=n.id,
        chart_id=n.chart_id,
        dataset_id=n.dataset_id,
        chart_title=chart_title or n.title,
        actor_id=n.actor_id,
        actor_name=actor_name,
        action=n.action,
        is_read=bool(n.is_read),
        created_at=n.created_at,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _purge_old(db, user.id)
    count = db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.is_read == 0
    ).count()
    return UnreadCountResponse(count=count)


@router.get("/", response_model=list[NotificationResponse])
def list_notifications(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _purge_old(db, user.id)
    # After purge, fetch all remaining for this user (max 100)
    notifs = db.query(Notification).filter(
        Notification.user_id == user.id
    ).order_by(Notification.created_at.desc(), Notification.id.desc()).limit(MAX_PER_USER).all()

    if not notifs:
        return []

    # Batch load actors and charts for titles
    actor_ids = {n.actor_id for n in notifs}
    chart_ids = {n.chart_id for n in notifs if n.chart_id}
    actors = {u.id: u for u in db.query(User).filter(User.id.in_(list(actor_ids))).all()} if actor_ids else {}
    charts = {c.id: c for c in db.query(Chart).filter(Chart.id.in_(list(chart_ids))).all()} if chart_ids else {}

    result = []
    for n in notifs:
        actor = actors.get(n.actor_id)
        actor_name = actor.name if actor else "Unknown"
        chart = charts.get(n.chart_id)
        # Prefer stored title, fallback to chart spec title if available
        chart_title = n.title
        if chart and not chart_title:
            try:
                chart_title = (chart.specification or {}).get("title")
            except Exception:
                chart_title = None
        result.append(_to_response(n, actor_name, chart_title))
    return result


@router.post("/{notif_id}/read", response_model=NotificationResponse)
def mark_read(
    notif_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    notif = db.query(Notification).filter(Notification.id == notif_id).first()
    if not notif or notif.user_id != user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = 1
    db.commit()
    db.refresh(notif)
    # need actor name for response
    actor = db.query(User).filter(User.id == notif.actor_id).first()
    actor_name = actor.name if actor else "Unknown"
    chart = db.query(Chart).filter(Chart.id == notif.chart_id).first()
    chart_title = notif.title
    if chart and not chart_title:
        try:
            chart_title = (chart.specification or {}).get("title")
        except Exception:
            pass
    return _to_response(notif, actor_name, chart_title)


@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.is_read == 0
    ).update({Notification.is_read: 1})
    db.commit()
    return {"message": "All marked as read"}

