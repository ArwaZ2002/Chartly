from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.models.models import Setting, User
from app.api.auth import get_current_user, require_role

router = APIRouter()

ALLOWED_KEYS = {"default_chart_type"}


class SettingsUpdateRequest(BaseModel):
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


VALID_THEMES = {"light", "dark"}


class ThemeUpdateRequest(BaseModel):
    theme: str


def _user_theme_key(user: User) -> str:
    return f"theme:{user.id}"


@router.get("/theme")
def get_user_theme(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = db.query(Setting).filter(Setting.key == _user_theme_key(user)).first()
    return {"theme": row.value if row and row.value in VALID_THEMES else "light"}


@router.put("/theme")
def update_user_theme(
    request: ThemeUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    theme = request.theme.strip().lower()
    if theme not in VALID_THEMES:
        raise HTTPException(status_code=400, detail="Theme must be 'light' or 'dark'")

    key = _user_theme_key(user)
    row = db.query(Setting).filter(Setting.key == key).first()
    if row:
        row.value = theme
    else:
        db.add(Setting(key=key, value=theme))
    db.commit()
    return {"theme": theme}