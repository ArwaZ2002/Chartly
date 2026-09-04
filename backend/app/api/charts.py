import logging
import os
from datetime import datetime
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


def build_response(chart: Chart, db: Session) -> ChartResponse:
    versions = chart.versions or []
    # --- collect user ids for creator / updater / version creators ---
    user_ids: set[str] = set()
    created_by = getattr(chart, "created_by", None)
    updated_by = getattr(chart, "updated_by", None)
    updated_at = getattr(chart, "updated_at", None)
    if created_by:
        user_ids.add(created_by)
    if updated_by:
        user_ids.add(updated_by)
    for v in versions:
        cb = getattr(v, "created_by", None)
        if cb:
            user_ids.add(cb)

    # Fetch audits for fallback (legacy rows where version.created_by is null)
    audits: list[AuditEntry] = []
    try:
        audits = (
            db.query(AuditEntry)
            .filter(AuditEntry.chart_id == chart.id)
            .order_by(AuditEntry.timestamp.asc(), AuditEntry.id.asc())
            .all()
        )
    except Exception:
        audits = []
    audit_user_ids = {a.user_id for a in audits if getattr(a, "user_id", None)}
    # Merge missing ids before bulk fetch
    user_ids |= audit_user_ids

    # Bulk load users -> id -> name
    user_map: dict[str, User] = {}
    if user_ids:
        try:
            for u in db.query(User).filter(User.id.in_(list(user_ids))).all():
                user_map[u.id] = u
        except Exception:
            pass

    def _name(uid: str | None) -> str | None:
        if not uid:
            return None
        u = user_map.get(uid)
        if u:
            return u.name
        # fallback: deleted user -> short id
        return None

    # Derive updated_* fallback if null but edits exist
    # If chart has been edited (more than 1 version) but updated_by is null,
    # use last audit (regenerate/restore) or last version's creator.
    if not updated_by and not updated_at and len(versions) > 1 and audits:
        # last non-create audit is the last edit
        for a in reversed(audits):
            if a.action in ("regenerate", "restore"):
                updated_by = a.user_id
                updated_at = a.timestamp
                break
        # if still none, fall back to last version's creator/timestamp
        if not updated_by:
            last_v = versions[-1]
            updated_by = getattr(last_v, "created_by", None)
            updated_at = getattr(last_v, "created_at", None)
            if not updated_by and audits:
                # use last audit as last resort
                updated_by = audits[-1].user_id
                updated_at = audits[-1].timestamp

    # Build version dicts with creator info (with audit fallback)
    version_dicts: list[dict] = []
    for idx, v in enumerate(versions):
        cb = getattr(v, "created_by", None)
        cb_name = _name(cb)
        # Legacy fallback: version has no creator -> infer from audit
        if not cb and audits:
            matched = None
            # Try spec + timestamp proximity
            for a in audits:
                if a.specification == v.specification:
                    # time proximity check (60s)
                    try:
                        if a.timestamp and v.created_at:
                            diff = abs((a.timestamp - v.created_at).total_seconds())
                            if diff < 75:
                                matched = a
                                break
                        else:
                            matched = a
                            break
                    except Exception:
                        matched = a
                        break
            # Index fallback: i-th version <-> i-th audit with create/regenerate/restore
            if not matched and idx < len(audits):
                # Only if counts line up and audit is one of the version-creating actions
                cand = audits[idx]
                if cand.action in ("create", "regenerate", "restore"):
                    matched = cand
            if matched:
                cb = matched.user_id
                cb_name = _name(cb)
        version_dicts.append(
            {
                "id": v.id,
                "specification": v.specification,
                "created_at": v.created_at.isoformat() if getattr(v, "created_at", None) else None,
                "created_by": cb,
                "created_by_name": cb_name,
            }
        )

    return ChartResponse(
        id=chart.id,
        dataset_id=chart.dataset_id,
        specification=chart.specification,
        created_at=chart.created_at,
        created_by=chart.created_by,
        created_by_name=_name(chart.created_by),
        updated_at=updated_at,
        updated_by=updated_by,
        updated_by_name=_name(updated_by),
        current_version_id=versions[-1].id if versions else None,
        versions=version_dicts,
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
        # updated_* stays null until first edit (regenerate/restore)
    )
    db.add(chart)
    db.flush()

    version = ChartVersion(
        chart_id=chart.id,
        specification=spec_dict,
        created_by=user.id,
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

    return build_response(chart, db)


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

    return [build_response(c, db) for c in charts]


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
    chart.updated_at = datetime.utcnow()
    chart.updated_by = user.id

    new_version = ChartVersion(
        chart_id=chart.id,
        specification=version.specification,
        created_by=user.id,
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

    return build_response(chart, db)


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
    chart.updated_at = datetime.utcnow()
    chart.updated_by = user.id
    version = ChartVersion(
        chart_id=chart.id,
        specification=spec_dict,
        created_by=user.id,
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

    return build_response(chart, db)


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
