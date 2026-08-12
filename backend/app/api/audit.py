from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import AuditEntry, User
from app.models.schemas import AuditEntryResponse

router = APIRouter()


@router.get("/", response_model=list[AuditEntryResponse])
def list_audit_entries(
    chart_id: str = None,
    db: Session = Depends(get_db),
):
    query = db.query(AuditEntry)
    if chart_id:
        query = query.filter(AuditEntry.chart_id == chart_id)
    entries = query.order_by(AuditEntry.timestamp.desc()).limit(100).all()

    result = []
    for entry in entries:
        user = db.query(User).filter(User.id == entry.user_id).first()
        result.append(
            AuditEntryResponse(
                id=entry.id,
                chart_id=entry.chart_id,
                action=entry.action,
                user_id=entry.user_id,
                user_name=user.name if user else "System",
                timestamp=entry.timestamp,
                specification=entry.specification,
            )
        )
    return result
