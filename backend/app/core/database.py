from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import get_settings

settings = get_settings()

DATABASE_URL = settings.DATABASE_URL

# Accept plain postgres:// URLs (e.g. Neon connection strings) and use the
# psycopg v3 dialect bundled in requirements.txt.
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = "postgresql+psycopg://" + DATABASE_URL[len("postgresql://"):]
elif DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = "postgresql+psycopg://" + DATABASE_URL[len("postgres://"):]

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _migrate_add_chart_audit_columns():
    """Lightweight additive migration for Plan A (no data loss).

    Adds charts.updated_at, charts.updated_by, chart_versions.created_by if
    missing. Works for both SQLite (existing local DB) and Postgres
    (Neon/Vercel). Idempotent — safe to run on every cold start.
    """
    from sqlalchemy import text as _text

    is_sqlite = DATABASE_URL.startswith("sqlite")
    try:
        with engine.begin() as conn:
            if is_sqlite:
                # SQLite: PRAGMA table_info
                def _sqlite_cols(table: str) -> set[str]:
                    rows = conn.execute(_text(f"PRAGMA table_info({table})")).fetchall()
                    return {r[1] for r in rows}  # second column is name

                try:
                    chart_cols = _sqlite_cols("charts")
                except Exception:
                    chart_cols = set()
                try:
                    ver_cols = _sqlite_cols("chart_versions")
                except Exception:
                    ver_cols = set()

                if chart_cols and "updated_at" not in chart_cols:
                    conn.execute(_text("ALTER TABLE charts ADD COLUMN updated_at DATETIME"))
                if chart_cols and "updated_by" not in chart_cols:
                    conn.execute(_text("ALTER TABLE charts ADD COLUMN updated_by VARCHAR"))
                if ver_cols and "created_by" not in ver_cols:
                    conn.execute(_text("ALTER TABLE chart_versions ADD COLUMN created_by VARCHAR"))
            else:
                # Postgres — ADD COLUMN IF NOT EXISTS (idempotent)
                conn.execute(_text("ALTER TABLE charts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP"))
                conn.execute(_text("ALTER TABLE charts ADD COLUMN IF NOT EXISTS updated_by VARCHAR"))
                conn.execute(_text("ALTER TABLE chart_versions ADD COLUMN IF NOT EXISTS created_by VARCHAR"))
    except Exception:
        # Never break startup if migration fails (e.g. permissions, race)
        import logging as _logging
        _logging.getLogger(__name__).exception("Chart audit migration skipped")


def _migrate_notifications():
    """Create notifications table if missing (idempotent)."""
    from sqlalchemy import text as _text

    try:
        with engine.begin() as conn:
            if DATABASE_URL.startswith("sqlite"):
                rows = conn.execute(_text("SELECT name FROM sqlite_master WHERE type='table' AND name='notifications'")).fetchall()
                if not rows:
                    # Will be created by create_all, but ensure for existing DBs
                    pass
            # Base.metadata.create_all already handles creation; no extra ALTER needed
    except Exception:
        import logging as _logging
        _logging.getLogger(__name__).exception("Notifications migration skipped")


def _migrate_notifications_project_columns():
    """Extend notifications for project-scoped events (idempotent).

    Adds notifications.dataset_id and drops the NOT NULL on notifications.chart_id
    so project events (upload/shared/close/reopen) can be stored without a chart.
    Postgres: plain ALTER. SQLite: table rebuild (SQLite cannot drop NOT NULL).
    """
    from sqlalchemy import text as _text

    is_sqlite = DATABASE_URL.startswith("sqlite")
    try:
        with engine.begin() as conn:
            if is_sqlite:
                rows = conn.execute(_text("PRAGMA table_info(notifications)")).fetchall()
                cols = {r[1] for r in rows}
                if cols and "dataset_id" not in cols:
                    conn.execute(_text("""
                        CREATE TABLE notifications_new (
                            id VARCHAR NOT NULL PRIMARY KEY,
                            user_id VARCHAR NOT NULL,
                            chart_id VARCHAR,
                            dataset_id VARCHAR,
                            actor_id VARCHAR NOT NULL,
                            action VARCHAR NOT NULL,
                            title VARCHAR NOT NULL,
                            is_read INTEGER NOT NULL,
                            created_at DATETIME
                        )
                    """))
                    conn.execute(_text("""
                        INSERT INTO notifications_new
                            (id, user_id, chart_id, dataset_id, actor_id, action, title, is_read, created_at)
                        SELECT id, user_id, chart_id, NULL, actor_id, action, title, is_read, created_at
                        FROM notifications
                    """))
                    conn.execute(_text("DROP TABLE notifications"))
                    conn.execute(_text("ALTER TABLE notifications_new RENAME TO notifications"))
                for name, column in (
                    ("ix_notifications_user_id", "user_id"),
                    ("ix_notifications_chart_id", "chart_id"),
                    ("ix_notifications_dataset_id", "dataset_id"),
                    ("ix_notifications_is_read", "is_read"),
                    ("ix_notifications_created_at", "created_at"),
                ):
                    conn.execute(_text(f"CREATE INDEX IF NOT EXISTS {name} ON notifications ({column})"))
            else:
                conn.execute(_text("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS dataset_id VARCHAR"))
                conn.execute(_text("ALTER TABLE notifications ALTER COLUMN chart_id DROP NOT NULL"))
                conn.execute(_text("CREATE INDEX IF NOT EXISTS ix_notifications_dataset_id ON notifications (dataset_id)"))
    except Exception:
        import logging as _logging
        _logging.getLogger(__name__).exception("Notifications project columns migration skipped")


def _migrate_datasets_project_columns():
    """Add datasets.shared and datasets.status (idempotent), backfilling
    existing rows so viewer access is preserved (shared=1, status='open')."""
    from sqlalchemy import text as _text

    is_sqlite = DATABASE_URL.startswith("sqlite")
    try:
        with engine.begin() as conn:
            if is_sqlite:
                def _col_names(table: str) -> set[str]:
                    rows = conn.execute(_text(f"PRAGMA table_info({table})")).fetchall()
                    return {r[1] for r in rows}
                try:
                    cols = _col_names("datasets")
                except Exception:
                    cols = set()
                if cols:
                    if "shared" not in cols:
                        conn.execute(_text("ALTER TABLE datasets ADD COLUMN shared INTEGER DEFAULT 0"))
                    if "status" not in cols:
                        conn.execute(_text("ALTER TABLE datasets ADD COLUMN status VARCHAR DEFAULT 'open'"))
            else:
                conn.execute(_text("ALTER TABLE datasets ADD COLUMN IF NOT EXISTS shared INTEGER DEFAULT 0"))
                conn.execute(_text("ALTER TABLE datasets ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'open'"))

            # Backfill: any existing rows without an explicit value become shared/open.
            if is_sqlite:
                conn.execute(_text("UPDATE datasets SET shared = 1 WHERE shared IS NULL"))
                conn.execute(_text("UPDATE datasets SET status = 'open' WHERE status IS NULL"))
            else:
                conn.execute(_text("UPDATE datasets SET shared = 1 WHERE shared IS NULL"))
                conn.execute(_text("UPDATE datasets SET status = 'open' WHERE status IS NULL"))
    except Exception:
        import logging as _logging
        _logging.getLogger(__name__).exception("Datasets project columns migration skipped")


def init_db():
    Base.metadata.create_all(bind=engine)
    _migrate_add_chart_audit_columns()
    _migrate_notifications()
    _migrate_notifications_project_columns()
    _migrate_datasets_project_columns()
