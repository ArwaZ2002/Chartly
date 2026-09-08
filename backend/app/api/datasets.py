import logging
import os

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import get_settings
from app.models.models import Dataset, User
from app.models.schemas import DatasetResponse, ColumnProfileResponse, DatasetUpdateRequest
from app.services.data_io import parse_dataset_bytes, get_dataset_file
from app.services.data_profiler import profile_dataset
from app.api.auth import get_current_user, require_role

logger = logging.getLogger(__name__)

router = APIRouter()
settings = get_settings()


def _to_response(d: Dataset) -> DatasetResponse:
    return DatasetResponse(
        id=d.id,
        name=d.name,
        display_name=d.display_name,
        file_name=d.file_name,
        columns=[ColumnProfileResponse(**c) for c in d.columns_profile],
        row_count=d.row_count,
        uploaded_at=d.uploaded_at,
        uploaded_by=d.uploaded_by,
        shared=int(d.shared or 0),
        status=d.status or "open",
    )


def _can_view_dataset(dataset: Dataset, user: User) -> bool:
    """Viewers may only see shared projects. Analysts/admins see everything."""
    if user.role in ("admin", "analyst"):
        return True
    return bool(dataset.shared)


def _require_project_open(dataset: Dataset, user: User) -> None:
    """Closed projects are frozen for everyone except admins."""
    if dataset.status == "closed" and user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="This project is closed and is read-only",
        )

# Lenient MIME allowlist per extension. application/octet-stream and an
# empty/missing content type are always accepted because browsers often
# send them regardless of the actual file format.
EXPECTED_MIME = {
    ".csv": {"text/csv", "text/plain", "application/csv", "application/vnd.ms-excel"},
    ".xlsx": {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/zip"},
    ".xls": {"application/vnd.ms-excel"},
}
GENERIC_MIME = {"application/octet-stream", "binary/octet-stream", ""}


def _format_label(ext: str) -> str:
    return {"csv": "CSV", "xlsx": "Excel", "xls": "Excel"}.get(ext.lstrip("."), "data")


def _validate_mime(ext: str, content_type: str | None) -> None:
    if ext not in EXPECTED_MIME:
        return
    mime = (content_type or "").strip().lower()
    if mime in GENERIC_MIME or mime in EXPECTED_MIME[ext]:
        return
    raise HTTPException(
        status_code=400,
        detail=f"The file content type '{content_type}' does not match the '{_format_label(ext)}' format",
    )


def _parse_dataset(file_name: str, data: bytes) -> pd.DataFrame:
    try:
        df = parse_dataset_bytes(file_name, data)
        df = _coerce_numeric_columns(df)
        return df
    except Exception:
        logger.exception("Failed to parse uploaded file %s", file_name)
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unable to parse the uploaded file as {_format_label(os.path.splitext(file_name)[1])}. "
                "The file may be corrupted or in an unsupported format."
            ),
        )


def _coerce_numeric_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Attempt to convert string columns to numeric where possible."""
    for col in df.columns:
        if df[col].dtype == object:
            converted = pd.to_numeric(
                df[col].astype(str).str.replace(",", "").str.replace("$", "")
                .str.replace("\u00a3", "").str.replace("\u20ac", "")
                .str.replace("\u00a5", "").str.rstrip("%"),
                errors="coerce",
            )
            # Convert if at least 80% of non-null values parsed successfully
            non_null = df[col].dropna()
            if len(non_null) > 0 and converted.notna().mean() >= 0.8:
                df[col] = converted
    return df


@router.post("/upload", response_model=DatasetResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    shared: int = Form(0),
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "analyst")),
):
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file_ext} not allowed. Use: {', '.join(settings.ALLOWED_EXTENSIONS)}",
        )

    _validate_mime(file_ext, file.content_type)

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty")
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds the {settings.MAX_UPLOAD_SIZE_MB} MB upload limit",
        )

    df = _parse_dataset(file.filename, content)

    columns = profile_dataset(df)

    dataset = Dataset(
        name=os.path.splitext(file.filename)[0],
        display_name=os.path.splitext(file.filename)[0],
        file_name=file.filename,
        file_data=content,
        file_path=None,
        columns_profile=columns,
        row_count=len(df),
        uploaded_by=user.id,
        shared=int(shared or 0),
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    return _to_response(dataset)


@router.get("/", response_model=list[DatasetResponse])
def list_datasets(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Dataset)
    if user.role not in ("admin", "analyst"):
        query = query.filter(Dataset.shared == 1)
    datasets = query.order_by(Dataset.uploaded_at.desc()).all()
    return [_to_response(d) for d in datasets]


@router.get("/{dataset_id}", response_model=DatasetResponse)
def get_dataset(
    dataset_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if not _can_view_dataset(dataset, user):
        raise HTTPException(status_code=404, detail="Dataset not found")
    return _to_response(dataset)


@router.patch("/{dataset_id}", response_model=DatasetResponse)
def update_dataset(
    dataset_id: str,
    request: DatasetUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "analyst")),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    _require_project_open(dataset, user)

    if request.name is not None:
        dataset.display_name = request.name
    if request.shared is not None:
        # Only the owner or an admin may toggle sharing.
        if user.role != "admin" and dataset.uploaded_by != user.id:
            raise HTTPException(
                status_code=403,
                detail="Only the dataset owner or an admin can change sharing",
            )
        dataset.shared = int(request.shared)
    db.commit()
    db.refresh(dataset)
    return _to_response(dataset)


@router.post("/{dataset_id}/toggle-share", response_model=DatasetResponse)
def toggle_share(
    dataset_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "analyst")),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    _require_project_open(dataset, user)
    if user.role != "admin" and dataset.uploaded_by != user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the dataset owner or an admin can change sharing",
        )
    dataset.shared = 0 if dataset.shared else 1
    db.commit()
    db.refresh(dataset)
    return _to_response(dataset)


@router.post("/{dataset_id}/close", response_model=DatasetResponse)
def close_project(
    dataset_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    dataset.status = "closed"
    db.commit()
    db.refresh(dataset)
    return _to_response(dataset)


@router.post("/{dataset_id}/reopen", response_model=DatasetResponse)
def reopen_project(
    dataset_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    dataset.status = "open"
    db.commit()
    db.refresh(dataset)
    return _to_response(dataset)


@router.get("/{dataset_id}/preview")
def preview_dataset(
    dataset_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if not _can_view_dataset(dataset, user):
        raise HTTPException(status_code=404, detail="Dataset not found")

    try:
        file_name, data = get_dataset_file(dataset)
        df = _parse_dataset(file_name, data)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to preview dataset %s", dataset.id)
        raise HTTPException(
            status_code=400,
            detail="Dataset file could not be read. Please re-upload the file.",
        )

    head = df.head(10).fillna("").to_dict(orient="records")
    columns = list(df.columns)
    return {"columns": columns, "rows": head, "total_rows": len(df)}


@router.delete("/{dataset_id}")
def delete_dataset(
    dataset_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "analyst")),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    _require_project_open(dataset, user)

    if user.role != "admin" and dataset.uploaded_by != user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the dataset owner or an admin can delete this dataset",
        )

    if dataset.file_path and os.path.exists(dataset.file_path):
        os.remove(dataset.file_path)

    db.delete(dataset)
    db.commit()
    return {"message": "Dataset deleted"}