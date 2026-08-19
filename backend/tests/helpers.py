import hashlib
import secrets


def make_legacy_hash(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}:{digest}"