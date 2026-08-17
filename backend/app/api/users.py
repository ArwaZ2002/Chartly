from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import User
from app.models.schemas import UserCreate, UserUpdate, UserResponse
from app.api.auth import get_password_hash, require_role

router = APIRouter()

VALID_ROLES = {"admin", "analyst", "viewer"}


@router.get("/", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    users = db.query(User).order_by(User.created_at.asc()).all()
    return [UserResponse.model_validate(u) for u in users]


@router.post("/", response_model=UserResponse)
def create_user(
    request: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    if request.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail="Role must be one of: viewer, analyst, admin")

    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists")

    user = User(
        email=request.email.strip().lower(),
        name=request.name,
        hashed_password=get_password_hash(request.password),
        role=request.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    request: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if request.role is not None:
        if request.role not in VALID_ROLES:
            raise HTTPException(status_code=400, detail="Role must be one of: viewer, analyst, admin")
        if user.id == admin.id and request.role != "admin":
            raise HTTPException(status_code=400, detail="You cannot demote your own admin role")
        user.role = request.role

    if request.name is not None:
        user.name = request.name

    if request.password:
        user.hashed_password = get_password_hash(request.password)

    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@router.delete("/{user_id}")
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role == "admin":
        admin_count = db.query(User).filter(User.role == "admin").count()
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the last admin account")

    db.delete(user)
    db.commit()
    return {"message": "User deleted"}