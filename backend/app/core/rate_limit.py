"""Lightweight in-memory rate limiter for login brute-force protection.

Suitable for a single-process MVP deployment. If the app is scaled to
multiple workers/processes, replace this with a shared store (Redis).
"""

import threading
import time
from collections import defaultdict


class LoginRateLimiter:
    def __init__(self, limit: int, limit_ip: int, window_seconds: int):
        self.limit = limit
        self.limit_ip = limit_ip
        self.window_seconds = window_seconds
        self._failed: dict[str, list[float]] = defaultdict(list)
        self._lock = threading.Lock()

    def _purge(self, key: str) -> list[float]:
        cutoff = time.monotonic() - self.window_seconds
        items = self._failed.get(key, [])
        if items:
            items = [t for t in items if t > cutoff]
            self._failed[key] = items
        return items

    def allowed(self, account_key: str, ip_key: str) -> bool:
        with self._lock:
            account_ok = len(self._purge(account_key)) < self.limit
            ip_ok = len(self._purge(ip_key)) < self.limit_ip
            return account_ok and ip_ok

    def record(self, account_key: str, ip_key: str) -> None:
        now = time.monotonic()
        with self._lock:
            self._failed[account_key].append(now)
            self._failed[ip_key].append(now)

    def clear(self, account_key: str) -> None:
        with self._lock:
            self._failed.pop(account_key, None)

    def retry_after(self, account_key: str, ip_key: str) -> int:
        now = time.monotonic()
        with self._lock:
            stamps = self._failed.get(account_key, []) + self._failed.get(ip_key, [])
        if not stamps:
            return 1
        oldest = min(stamps)
        return max(1, int(self.window_seconds - (now - oldest)))