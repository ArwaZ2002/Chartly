import os
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Dataset, Chart, ChartVersion, AuditEntry
from app.models.schemas import (
    ChartGenerateRequest,
    ChartResponse,
    ChartRecommendation,
)
from app.services.chart_generator import generate_chart, chart_to_html
from app.services.data_profiler import recommend_chart_type

router = APIRouter()


@router.post("/generate", response_model=ChartResponse)
def generate_chart_endpoint(
    request: ChartGenerateRequest,
    db: Session = Depends(get_db),
):
    dataset = db.query(Dataset).filter(Dataset.id == request.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    if not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=404, detail="Dataset file not found")

    ext = os.path.splitext(dataset.file_name)[1].lower()
    if ext == ".csv":
        df = pd.read_csv(dataset.file_path)
    else:
        df = pd.read_excel(dataset.file_path)

    spec_dict = request.specification.model_dump()

    try:
        chart_json = generate_chart(df, spec_dict)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    chart = Chart(
        dataset_id=request.dataset_id,
        specification=spec_dict,
        created_by="system",
    )
    db.add(chart)
    db.flush()

    version = ChartVersion(
        chart_id=chart.id,
        specification=spec_dict,
    )
    db.add(version)

    audit = AuditEntry(
        chart_id=chart.id,
        action="create",
        user_id="system",
        specification=spec_dict,
    )
    db.add(audit)

    db.commit()
    db.refresh(chart)

    return ChartResponse(
        id=chart.id,
        dataset_id=chart.dataset_id,
        specification=chart.specification,
        created_at=chart.created_at,
        created_by=chart.created_by,
        versions=[{"id": v.id, "specification": v.specification, "created_at": v.created_at.isoformat()} for v in chart.versions],
    )


@router.get("/recommendations/{dataset_id}", response_model=list[ChartRecommendation])
def get_recommendations(dataset_id: str, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    recommendations = recommend_chart_type(dataset.columns_profile)
    return [ChartRecommendation(**r) for r in recommendations]


@router.get("/", response_model=list[ChartResponse])
def list_charts(
    dataset_id: str = None,
    db: Session = Depends(get_db),
):
    query = db.query(Chart)
    if dataset_id:
        query = query.filter(Chart.dataset_id == dataset_id)
    charts = query.order_by(Chart.created_at.desc()).all()

    return [
        ChartResponse(
            id=c.id,
            dataset_id=c.dataset_id,
            specification=c.specification,
            created_at=c.created_at,
            created_by=c.created_by,
            versions=[{"id": v.id, "specification": v.specification, "created_at": v.created_at.isoformat()} for v in c.versions],
        )
        for c in charts
    ]


@router.get("/{chart_id}/render")
def render_chart(chart_id: str, db: Session = Depends(get_db)):
    chart = db.query(Chart).filter(Chart.id == chart_id).first()
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    dataset = db.query(Dataset).filter(Dataset.id == chart.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    ext = os.path.splitext(dataset.file_name)[1].lower()
    if ext == ".csv":
        df = pd.read_csv(dataset.file_path)
    else:
        df = pd.read_excel(dataset.file_path)

    try:
        chart_json = generate_chart(df, chart.specification)
        chart_html = chart_to_html(chart_json)
        return {"html": chart_html, "json": chart_json}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{chart_id}/restore/{version_id}", response_model=ChartResponse)
def restore_chart_version(
    chart_id: str,
    version_id: str,
    db: Session = Depends(get_db),
):
    chart = db.query(Chart).filter(Chart.id == chart_id).first()
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    version = (
        db.query(ChartVersion)
        .filter(ChartVersion.id == version_id, ChartVersion.chart_id == chart_id)
        .first()
    )
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    chart.specification = version.specification

    new_version = ChartVersion(
        chart_id=chart.id,
        specification=version.specification,
    )
    db.add(new_version)

    audit = AuditEntry(
        chart_id=chart.id,
        action="restore",
        user_id="system",
        specification=version.specification,
    )
    db.add(audit)

    db.commit()
    db.refresh(chart)

    return ChartResponse(
        id=chart.id,
        dataset_id=chart.dataset_id,
        specification=chart.specification,
        created_at=chart.created_at,
        created_by=chart.created_by,
        versions=[{"id": v.id, "specification": v.specification, "created_at": v.created_at.isoformat()} for v in chart.versions],
    )


@router.post("/{chart_id}/regenerate", response_model=ChartResponse)
def regenerate_chart(
    chart_id: str,
    request: ChartGenerateRequest,
    db: Session = Depends(get_db),
):
    chart = db.query(Chart).filter(Chart.id == chart_id).first()
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    dataset = db.query(Dataset).filter(Dataset.id == request.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    ext = os.path.splitext(dataset.file_name)[1].lower()
    if ext == ".csv":
        df = pd.read_csv(dataset.file_path)
    else:
        df = pd.read_excel(dataset.file_path)

    spec_dict = request.specification.model_dump()

    try:
        chart_json = generate_chart(df, spec_dict)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    chart.specification = spec_dict
    version = ChartVersion(
        chart_id=chart.id,
        specification=spec_dict,
    )
    db.add(version)

    audit = AuditEntry(
        chart_id=chart.id,
        action="regenerate",
        user_id="system",
        specification=spec_dict,
    )
    db.add(audit)

    db.commit()
    db.refresh(chart)

    return ChartResponse(
        id=chart.id,
        dataset_id=chart.dataset_id,
        specification=chart.specification,
        created_at=chart.created_at,
        created_by=chart.created_by,
        versions=[{"id": v.id, "specification": v.specification, "created_at": v.created_at.isoformat()} for v in chart.versions],
    )
