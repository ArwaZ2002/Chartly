import json

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    APP_NAME: str = "Chartly"
    APP_VERSION: str = "2.0.0"
    # development | production
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    DATABASE_URL: str = "sqlite:///./chartly.db"

    # JWT signing secret. MUST be provided via the JWT_SECRET environment
    # variable (there is deliberately NO default value). The application
    # fails fast at startup if it is missing or empty.
    # Generate a strong random value:
    #   python -c "import secrets; print(secrets.token_urlsafe(64))"
    JWT_SECRET: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120

    # Comma-separated list of allowed browser origins.
    # Never use "*" together with credentials (cookies).
    ALLOWED_ORIGINS: str = "http://localhost:8000"

    # API docs (/docs, /redoc, /openapi.json).
    # None = auto: enabled in development, disabled in production.
    ENABLE_API_DOCS: bool | None = None

    # Auth cookie
    COOKIE_NAME: str = "chartly_token"
    COOKIE_SECURE: bool = False  # set True when serving over HTTPS (also enables HSTS)
    COOKIE_SAMESITE: str = "lax"

    # Set True when the app runs behind a trusted reverse proxy
    # so the client IP is read from X-Forwarded-For.
    TRUST_PROXY: bool = False

    # Login brute-force protection (failed attempts per window)
    LOGIN_RATE_LIMIT: int = 5
    LOGIN_RATE_LIMIT_IP: int = 20
    LOGIN_RATE_WINDOW_SECONDS: int = 60

    MAX_UPLOAD_SIZE_MB: int = 50
    ALLOWED_EXTENSIONS: list[str] = [".csv", ".xlsx", ".xls"]

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

    @property
    def secret_key(self) -> str:
        return self.JWT_SECRET

    @property
    def api_docs_enabled(self) -> bool:
        if self.ENABLE_API_DOCS is not None:
            return self.ENABLE_API_DOCS
        return self.ENVIRONMENT != "production"

    @property
    def cors_origins(self) -> list[str]:
        raw = self.ALLOWED_ORIGINS.strip()
        if raw.startswith("["):
            try:
                return [str(o).strip() for o in json.loads(raw)]
            except (ValueError, TypeError):
                pass
        return [o.strip() for o in raw.split(",") if o.strip()]

    def validate_security_configuration(self) -> None:
        """Reject missing or insecure JWT signing configuration.

        Fail fast in every environment: a JWT secret is mandatory, never
        optional, so development cannot ship with an insecure default.
        """
        secret = self.secret_key
        if not secret:
            raise ValueError(
                "JWT_SECRET must be set via the environment (no default is provided)"
            )
        if len(secret) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters")
        if self.ENVIRONMENT.strip().lower() == "production" and secret == "chartly-secret-key-change-in-production":
            raise ValueError(
                "JWT_SECRET must be set to a unique value in production"
            )


@lru_cache()
def get_settings() -> Settings:
    settings = Settings()
    settings.validate_security_configuration()
    return settings
