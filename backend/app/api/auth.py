import hashlib
import logging
import secrets
import uuid
from datetime import datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import get_settings
from app.core.rate_limit import LoginRateLimiter
from app.models.models import RevokedToken, User
from app.models.schemas import UserLogin, UserResponse

logger = logging.getLogger(__name__)

router = APIRouter()
settings = get_settings()

security = HTTPBearer(auto_error=False)

_argon2 = PasswordHasher()

_rate_limiter = LoginRateLimiter(
    limit=settings.LOGIN_RATE_LIMIT,
    limit_ip=settings.LOGIN_RATE_LIMIT_IP,
    window_seconds=settings.LOGIN_RATE_WINDOW_SECONDS,
)


# ---------------------------------------------------------------------------
# Password hashing (centralized). Argon2id for all new hashes.
# Legacy salted SHA-256 hashes ("salt:hexdigest") are only accepted for
# verification so existing accounts can be migrated on successful login.
# ---------------------------------------------------------------------------
def get_password_hash(password: str) -> str:
    return _argon2.hash(password)


def needs_password_migration(stored_hash: str) -> bool:
    return not stored_hash.startswith("$argon2")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if hashed_password.startswith("$argon2"):
        try:
            return _argon2.verify(hashed_password, plain_password)
        except VerifyMismatchError:
            return False
        except Exception:
            logger.exception("Argon2 verification failed for stored hash")
            return False

    try:
        salt, stored_hash = hashed_password.split(":")
        computed_hash = hashlib.sha256((plain_password + salt).encode()).hexdigest()
        return secrets.compare_digest(computed_hash, stored_hash)
    except Exception:
        logger.exception("Legacy password verification failed for stored hash")
        return False


def migrate_legacy_password(db: Session, user: User, plain_password: str) -> None:
    if not needs_password_migration(user.hashed_password):
        return
    user.hashed_password = get_password_hash(plain_password)
    db.commit()


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update(
        {
            "jti": str(uuid.uuid4()),
            "typ": "access",
            "exp": expire,
        }
    )
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.ALGORITHM)


def _client_ip(request: Request) -> str:
    if settings.TRUST_PROXY:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
    if request.client is not None:
        return request.client.host
    return "unknown"


def _token_from_request(request: Request) -> str | None:
    auth = request.headers.get("Authorization")
    if auth and auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return request.cookies.get(settings.COOKIE_NAME)


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
    )


def _clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.COOKIE_NAME,
        path="/",
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
    )


def _revoke_token(db: Session, token: str) -> None:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.ALGORITHM])
        jti = payload.get("jti")
        if not jti:
            return
        exp = payload.get("exp")
        expires_at = (
            datetime.fromtimestamp(exp)
            if exp
            else datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
    except jwt.InvalidTokenError:
        return
    existing = db.query(RevokedToken).filter(RevokedToken.jti == jti).first()
    if existing:
        return
    db.add(RevokedToken(jti=jti, expires_at=expires_at))
    db.commit()


def _purge_expired_revoked(db: Session) -> None:
    db.query(RevokedToken).filter(RevokedToken.expires_at < datetime.utcnow()).delete()
    db.commit()


def get_current_user(
    db: Session = Depends(get_db),
    request: Request = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = credentials.credentials if credentials is not None else None
    if not token and request is not None:
        token = request.cookies.get(settings.COOKIE_NAME)
    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.ALGORITHM])
        if payload.get("typ") != "access":
            raise credentials_exception
        user_id = payload.get("sub")
        jti = payload.get("jti")
        if user_id is None or jti is None:
            raise credentials_exception
    except jwt.InvalidTokenError:
        raise credentials_exception

    revoked = db.query(RevokedToken).filter(RevokedToken.jti == jti).first()
    if revoked is not None:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user


def require_role(*roles: str):
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user
    return dependency


@router.post("/login", response_model=UserResponse)
def login(
    request: Request,
    response: Response,
    body: UserLogin,
    db: Session = Depends(get_db),
):
    account_key = body.email.strip().lower()
    ip_key = f"ip:{_client_ip(request)}"

    if not _rate_limiter.allowed(account_key, ip_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again later.",
            headers={"Retry-After": str(_rate_limiter.retry_after(account_key, ip_key))},
        )

    user = db.query(User).filter(User.email == account_key).first()
    if not user or not verify_password(body.password, user.hashed_password):
        _rate_limiter.record(account_key, ip_key)
        logger.warning("Failed login attempt for %s from %s", account_key, ip_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    migrate_legacy_password(db, user, body.password)
    _rate_limiter.clear(account_key)

    access_token = create_access_token(data={"sub": user.id})
    _set_auth_cookie(response, access_token)
    # Deliberately do NOT return the JWT in the JSON body: it is only ever
    # carried in the HttpOnly cookie set above.
    return user


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    _purge_expired_revoked(db)
    token = _token_from_request(request)
    if token:
        _revoke_token(db, token)
    _clear_auth_cookie(response)
    return {"message": "Logged out"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)