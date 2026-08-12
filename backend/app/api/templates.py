from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Template, Chart, Dataset
from app.models.schemas import (
    TemplateCreateRequest,
    TemplateApplyRequest,
    TemplateResponse,
)

router = APIRouter()


@router.post("/", response_model=TemplateResponse)
def create_template(
    request: TemplateCreateRequest,
    db: Session = Depends(get_db),
):
    chart = db.query(Chart).filter(Chart.id == request.chart_id).first()
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    template = Template(
        name=request.name,
        chart_type=chart.specification["chart_type"],
        specification=chart.specification,
        created_by="system",
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
        created_at=template.created_at,
    )


@router.get("/", response_model=list[TemplateResponse])
def list_templates(db: Session = Depends(get_db)):
    templates = db.query(Template).order_by(Template.created_at.desc()).all()
    return [
        TemplateResponse(
            id=t.id,
            name=t.name,
            chart_type=t.chart_type,
            specification=t.specification,
            created_by=t.created_by,
            created_at=t.created_at,
        )
        for t in templates
    ]


@router.get("/{template_id}", response_model=TemplateResponse)
def get_template(template_id: str, db: Session = Depends(get_db)):
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    return TemplateResponse(
        id=template.id,
        name=template.name,
        chart_type=template.chart_type,
        specification=template.specification,
        created_by=template.created_by,
        created_at=template.created_at,
    )


@router.delete("/{template_id}")
def delete_template(template_id: str, db: Session = Depends(get_db)):
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    db.delete(template)
    db.commit()
    return {"message": "Template deleted"}
