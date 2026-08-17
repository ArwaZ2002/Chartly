import os
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import get_settings
from app.models.models import Dataset, User
from app.models.schemas import DatasetResponse, ColumnProfileResponse
from app.services.data_profiler import profile_dataset
from app.api.auth import get_current_user, require_role

router = APIRouter()
settings = get_settings()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


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

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds the {settings.MAX_UPLOAD_SIZE_MB} MB upload limit",
        )

    safe_name = f"{uuid4().hex}_{os.path.basename(file.filename)}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    with open(file_path, "wb") as f:
        f.write(content)

    import pandas as pd
    if file_ext == ".csv":
        df = pd.read_csv(file_path)
    else:
        df = pd.read_excel(file_path)

    columns = profile_dataset(df)

    dataset = Dataset(
        name=os.path.splitext(file.filename)[0],
        display_name=os.path.splitext(file.filename)[0],
        file_name=file.filename,
        file_path=file_path,
        columns_profile=columns,
        row_count=len(df),
        uploaded_by="system",
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

    import pandas as pd
    file_ext = os.path.splitext(dataset.file_name)[1].lower()
    if file_ext == ".csv":
        df = pd.read_csv(dataset.file_path)
    else:
        df = pd.read_excel(dataset.file_path)

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
