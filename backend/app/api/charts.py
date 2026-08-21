import logging
import os
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Dataset, Chart, ChartVersion, AuditEntry, User
from app.models.schemas import (
    ChartGenerateRequest,
    ChartResponse,
    ChartRecommendation,
)
from app.services.chart_generator import generate_chart, chart_to_html
from app.services.data_io import get_dataset_file, parse_dataset_bytes
from app.services.data_profiler import recommend_chart_type
from app.services.spec_validation import validate_specification
from app.api.auth import get_current_user, require_role

logger = logging.getLogger(__name__)

router = APIRouter()


def load_dataset_df(db: Session, dataset_id: str) -> tuple[Dataset, pd.DataFrame]:
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    if not dataset.file_data and (not dataset.file_path or not os.path.exists(dataset.file_path)):
        raise HTTPException(status_code=404, detail="Dataset file not found")

    try:
        file_name, data = get_dataset_file(dataset)
        df = parse_dataset_bytes(file_name, data)
    except Exception:
        logger.exception("Failed to parse dataset file %s", dataset.file_name)
        raise HTTPException(
            status_code=400,
            detail="Dataset file could not be read or parsed. Please re-upload the file.",
        )
    return dataset, df


def build_response(chart: Chart) -> ChartResponse:
    versions = chart.versions
    return ChartResponse(
        id=chart.id,
        dataset_id=chart.dataset_id,
        specification=chart.specification,
        created_at=chart.created_at,
        created_by=chart.created_by,
        current_version_id=versions[-1].id if versions else None,
        versions=[{"id": v.id, "specification": v.specification, "created_at": v.created_at.isoformat()} for v in versions],
    )


@router.post("/generate", response_model=ChartResponse)
def generate_chart_endpoint(
    request: ChartGenerateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "analyst")),
):
    dataset, df = load_dataset_df(db, request.dataset_id)

    spec_dict = request.specification.model_dump()
    error = validate_specification(dataset.columns_profile, spec_dict)
    if error:
        raise HTTPException(status_code=400, detail=error)

    try:
        generate_chart(df, spec_dict)
    except Exception:
        logger.exception("Chart generation failed for dataset %s", request.dataset_id)
        raise HTTPException(
            status_code=400,
            detail="Failed to generate the chart from this specification. Adjust the chart settings and try again.",
        )

    chart = Chart(
        dataset_id=request.dataset_id,
        specification=spec_dict,
        created_by=user.id,
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
        user_id=user.id,
        specification=spec_dict,
    )
    db.add(audit)

    db.commit()
    db.refresh(chart)

    return build_response(chart)


@router.get("/recommendations/{dataset_id}", response_model=list[ChartRecommendation])
def get_recommendations(
    dataset_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    recommendations = recommend_chart_type(dataset.columns_profile)
    return [ChartRecommendation(**r) for r in recommendations]


@router.get("/", response_model=list[ChartResponse])
def list_charts(
    dataset_id: str = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Chart)
    if dataset_id:
        query = query.filter(Chart.dataset_id == dataset_id)
    charts = query.order_by(Chart.created_at.desc()).all()

    return [build_response(c) for c in charts]


@router.get("/{chart_id}/render")
def render_chart(
    chart_id: str,
    version_id: str = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    chart = db.query(Chart).filter(Chart.id == chart_id).first()
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    spec = chart.specification
    if version_id:
        version = (
            db.query(ChartVersion)
            .filter(ChartVersion.id == version_id, ChartVersion.chart_id == chart_id)
            .first()
        )
        if not version:
            raise HTTPException(status_code=404, detail="Version not found")
        spec = version.specification

    dataset, df = load_dataset_df(db, chart.dataset_id)

    try:
        chart_json = generate_chart(df, spec)
        chart_html = chart_to_html(chart_json)
        return {"html": chart_html, "json": chart_json}
    except Exception:
        logger.exception("Chart render failed for chart %s", chart_id)
        raise HTTPException(
            status_code=400,
            detail="Failed to render the chart. The underlying dataset may be invalid.",
        )


@router.post("/{chart_id}/restore/{version_id}", response_model=ChartResponse)
def restore_chart_version(
    chart_id: str,
    version_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "analyst")),
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
        user_id=user.id,
        specification=version.specification,
    )
    db.add(audit)

    db.commit()
    db.refresh(chart)

    return build_response(chart)


@router.post("/{chart_id}/regenerate", response_model=ChartResponse)
def regenerate_chart(
    chart_id: str,
    request: ChartGenerateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "analyst")),
):
    chart = db.query(Chart).filter(Chart.id == chart_id).first()
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    dataset, df = load_dataset_df(db, request.dataset_id)

    spec_dict = request.specification.model_dump()
    error = validate_specification(dataset.columns_profile, spec_dict)
    if error:
        raise HTTPException(status_code=400, detail=error)

    try:
        generate_chart(df, spec_dict)
    except Exception:
        logger.exception("Chart regeneration failed for chart %s", chart_id)
        raise HTTPException(
            status_code=400,
            detail="Failed to regenerate the chart from this specification. Adjust the chart settings and try again.",
        )

    chart.specification = spec_dict
    version = ChartVersion(
        chart_id=chart.id,
        specification=spec_dict,
    )
    db.add(version)

    audit = AuditEntry(
        chart_id=chart.id,
        action="regenerate",
        user_id=user.id,
        specification=spec_dict,
    )
    db.add(audit)

    db.commit()
    db.refresh(chart)

    return build_response(chart)


@router.delete("/{chart_id}")
def delete_chart(
    chart_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "analyst")),
):
    chart = db.query(Chart).filter(Chart.id == chart_id).first()
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    db.delete(chart)
    db.commit()
    return {"message": "Chart deleted"}
