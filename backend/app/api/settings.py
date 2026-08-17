from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.models.models import Setting, User
from app.api.auth import get_current_user, require_role

router = APIRouter()

ALLOWED_KEYS = {"platform_name", "default_chart_type"}


class SettingsUpdateRequest(BaseModel):
    platform_name: str | None = None
    default_chart_type: str | None = None


@router.get("/")
def get_settings(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = db.query(Setting).all()
    return {row.key: row.value for row in rows}


@router.put("/")
def update_settings(
    request: SettingsUpdateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    updates = request.model_dump(exclude_none=True)
    for key, value in updates.items():
        if key not in ALLOWED_KEYS:
            continue
        row = db.query(Setting).filter(Setting.key == key).first()
        if row:
            row.value = str(value)
        else:
            db.add(Setting(key=key, value=str(value)))
    db.commit()

    rows = db.query(Setting).all()
    return {row.key: row.value for row in rows}