import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import ThemeTemplate, User
from app.models.schemas import ThemeTemplateCreate, ThemeTemplateResponse
from app.api.auth import get_current_user, require_role

router = APIRouter()

HEX_COLOR = re.compile(r"^#[0-9a-fA-F]{3}$|^#[0-9a-fA-F]{6}$")


@router.post("/", response_model=ThemeTemplateResponse)
def create_theme_template(
    request: ThemeTemplateCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "analyst")),
):
    name = request.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Template name is required")

    colors = [c.strip() for c in request.colors if c and c.strip()]
    if not colors:
        raise HTTPException(status_code=400, detail="At least one color is required")
    if len(colors) > 10:
        raise HTTPException(status_code=400, detail="Too many colors (max 10)")
    if any(not HEX_COLOR.match(c) for c in colors):
        raise HTTPException(status_code=400, detail="Colors must be hex values like #f97316")

    template = ThemeTemplate(
        name=name,
        colors=colors,
        font_family=request.font_family or None,
        created_by=user.id,
    )
    db.add(template)
    db.commit()
    db.refresh(template)

    return ThemeTemplateResponse(
        id=template.id,
        name=template.name,
        colors=template.colors,
        font_family=template.font_family,
        created_by=template.created_by,
        created_at=template.created_at,
    )


@router.get("/", response_model=list[ThemeTemplateResponse])
def list_theme_templates(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    templates = db.query(ThemeTemplate).order_by(ThemeTemplate.created_at.desc()).all()
    return [
        ThemeTemplateResponse(
            id=t.id,
            name=t.name,
            colors=t.colors,
            font_family=t.font_family,
            created_by=t.created_by,
            created_at=t.created_at,
        )
        for t in templates
    ]


@router.delete("/{template_id}")
def delete_theme_template(
    template_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "analyst")),
):
    template = db.query(ThemeTemplate).filter(ThemeTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Theme template not found")

    db.delete(template)
    db.commit()
    return {"message": "Theme template deleted"}