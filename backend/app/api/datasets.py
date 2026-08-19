import logging
import os
from uuid import uuid4

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import get_settings
from app.models.models import Dataset, User
from app.models.schemas import DatasetResponse, ColumnProfileResponse
from app.services.data_profiler import profile_dataset
from app.api.auth import get_current_user, require_role

logger = logging.getLogger(__name__)

router = APIRouter()
settings = get_settings()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

CHUNK_SIZE = 1024 * 1024  # 1 MB chunks while streaming the upload to disk

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


def _parse_dataset(file_path: str, ext: str) -> pd.DataFrame:
    try:
        if ext == ".csv":
            return pd.read_csv(file_path)
        return pd.read_excel(file_path)
    except Exception:
        logger.exception("Failed to parse uploaded file %s", os.path.basename(file_path))
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unable to parse the uploaded file as {_format_label(ext)}. "
                "The file may be corrupted or in an unsupported format."
            ),
        )


@router.post("/upload", response_model=DatasetResponse)
async def upload_dataset(
    file: UploadFile = File(...),
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
    safe_name = f"{uuid4().hex}_{os.path.basename(file.filename)}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)

    total = 0
    try:
        with open(file_path, "wb") as out:
            while chunk := await file.read(CHUNK_SIZE):
                total += len(chunk)
                if total > max_bytes:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds the {settings.MAX_UPLOAD_SIZE_MB} MB upload limit",
                    )
                out.write(chunk)
    except Exception:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise

    try:
        df = _parse_dataset(file_path, file_ext)
    except HTTPException:
        os.remove(file_path)
        raise

    columns = profile_dataset(df)

    dataset = Dataset(
        name=os.path.splitext(file.filename)[0],
        display_name=os.path.splitext(file.filename)[0],
        file_name=file.filename,
        file_path=file_path,
        columns_profile=columns,
        row_count=len(df),
        uploaded_by=user.id,
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    return DatasetResponse(
        id=dataset.id,
        name=dataset.name,
        display_name=dataset.display_name,
        file_name=dataset.file_name,
        columns=[ColumnProfileResponse(**c) for c in columns],
        row_count=dataset.row_count,
        uploaded_at=dataset.uploaded_at,
        uploaded_by=dataset.uploaded_by,
    )


@router.get("/", response_model=list[DatasetResponse])
def list_datasets(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    datasets = db.query(Dataset).order_by(Dataset.uploaded_at.desc()).all()
    return [
        DatasetResponse(
            id=d.id,
            name=d.name,
            display_name=d.display_name,
            file_name=d.file_name,
            columns=[ColumnProfileResponse(**c) for c in d.columns_profile],
            row_count=d.row_count,
            uploaded_at=d.uploaded_at,
            uploaded_by=d.uploaded_by,
        )
        for d in datasets
    ]


@router.get("/{dataset_id}", response_model=DatasetResponse)
def get_dataset(
    dataset_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    return DatasetResponse(
        id=dataset.id,
        name=dataset.name,
        display_name=dataset.display_name,
        file_name=dataset.file_name,
        columns=[ColumnProfileResponse(**c) for c in dataset.columns_profile],
        row_count=dataset.row_count,
        uploaded_at=dataset.uploaded_at,
        uploaded_by=dataset.uploaded_by,
    )


class RenameRequest(BaseModel):
    name: str


@router.patch("/{dataset_id}", response_model=DatasetResponse)
def rename_dataset(
    dataset_id: str,
    request: RenameRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "analyst")),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    dataset.display_name = request.name
    db.commit()
    db.refresh(dataset)
    return DatasetResponse(
        id=dataset.id,
        name=dataset.name,
        display_name=dataset.display_name,
        file_name=dataset.file_name,
        columns=[ColumnProfileResponse(**c) for c in dataset.columns_profile],
        row_count=dataset.row_count,
        uploaded_at=dataset.uploaded_at,
        uploaded_by=dataset.uploaded_by,
    )


@router.get("/{dataset_id}/preview")
def preview_dataset(
    dataset_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    try:
        file_ext = os.path.splitext(dataset.file_name)[1].lower()
        df = _parse_dataset(dataset.file_path, file_ext)
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

    if os.path.exists(dataset.file_path):
        os.remove(dataset.file_path)

    db.delete(dataset)
    db.commit()
    return {"message": "Dataset deleted"}