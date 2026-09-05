from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Template, Chart, Dataset, User
from app.models.schemas import (
    TemplateCreateRequest,
    TemplateApplyRequest,
    TemplateApplyResponse,
    TemplateResponse,
)
from app.services.spec_validation import validate_specification
from app.api.auth import get_current_user, require_role

router = APIRouter()


def _name(template: Template, user_map: dict[str, User]) -> str | None:
    """Resolve the display name of a template's creator, falling back to a
    readable label for legacy rows that predate user-tracking."""
    uid = template.created_by
    if uid:
        u = user_map.get(uid)
        if u:
            return u.name
    if template.created_by == "system":
        return "System"
    if template.created_by:
        return f"user-{template.created_by[:8]}"
    return None


def _load_user_map(db: Session, templates: list[Template]) -> dict[str, User]:
    ids = {t.created_by for t in templates if t.created_by}
    if not ids:
        return {}
    return {u.id: u for u in db.query(User).filter(User.id.in_(list(ids))).all()}


@router.post("/", response_model=TemplateResponse)
def create_template(
    request: TemplateCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "analyst")),
):
    chart = db.query(Chart).filter(Chart.id == request.chart_id).first()
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    template = Template(
        name=request.name,
        chart_type=chart.specification["chart_type"],
        specification=chart.specification,
        created_by=user.id,
    )
    db.add(template)
    db.commit()
    db.refresh(template)

    return TemplateResponse(
        id=template.id,
        name=template.name,
        chart_type=template.chart_type,
        specification=template.specification,
        created_by=template.created_by,
        created_by_name=_name(template, _load_user_map(db, [template])),
        created_at=template.created_at,
    )


@router.get("/", response_model=list[TemplateResponse])
def list_templates(
    search: str = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Template)
    if search:
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            Template.name.ilike(term) | Template.chart_type.ilike(term)
        )
    templates = query.order_by(Template.created_at.desc()).all()
    user_map = _load_user_map(db, templates)
    return [
        TemplateResponse(
            id=t.id,
            name=t.name,
            chart_type=t.chart_type,
            specification=t.specification,
            created_by=t.created_by,
            created_by_name=_name(t, user_map),
            created_at=t.created_at,
        )
        for t in templates
    ]


@router.post("/apply", response_model=TemplateApplyResponse)
def apply_template(
    request: TemplateApplyRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "analyst")),
):
    template = db.query(Template).filter(Template.id == request.template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    dataset = db.query(Dataset).filter(Dataset.id == request.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    error = validate_specification(dataset.columns_profile, template.specification)
    if error:
        raise HTTPException(
            status_code=400,
            detail=f"Template is not compatible with dataset '{dataset.display_name or dataset.name}': {error}",
        )

    return TemplateApplyResponse(
        template_id=template.id,
        template_name=template.name,
        specification=template.specification,
    )


@router.get("/{template_id}", response_model=TemplateResponse)
def get_template(
    template_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    return TemplateResponse(
        id=template.id,
        name=template.name,
        chart_type=template.chart_type,
        specification=template.specification,
        created_by=template.created_by,
        created_by_name=_name(template, _load_user_map(db, [template])),
        created_at=template.created_at,
    )


@router.delete("/{template_id}")
def delete_template(
    template_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "analyst")),
):
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    if user.role != "admin" and template.created_by != user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the template creator or an admin can delete this template",
        )

    db.delete(template)
    db.commit()
    return {"message": "Template deleted"}
