import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

DEFAULT_PATH = Path(__file__).resolve().parents[2] / "data" / "sautiops.db"


def database_path() -> str:
    return os.getenv("DATABASE_PATH", str(DEFAULT_PATH))


@contextmanager
def connection() -> Iterator[sqlite3.Connection]:
    path = database_path()
    if path != ":memory:":
        Path(path).parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(path, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def initialize_database() -> None:
    with connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                category TEXT NOT NULL CHECK (
                    category IN (
                        'maintenance', 'stock', 'customer',
                        'safety', 'delivery', 'other'
                    )
                ),
                priority TEXT NOT NULL CHECK (
                    priority IN ('low', 'medium', 'high', 'critical')
                ),
                location TEXT NOT NULL,
                reporter TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'closed')),
                created_at TEXT NOT NULL,
                closed_at TEXT,
                close_note TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_tickets_status_created
            ON tickets(status, created_at DESC);

            CREATE TABLE IF NOT EXISTS activity (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action TEXT NOT NULL CHECK (
                    action IN ('ticket_created', 'tickets_viewed', 'ticket_closed')
                ),
                ticket_id INTEGER,
                detail TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(ticket_id) REFERENCES tickets(id)
            );

            CREATE INDEX IF NOT EXISTS idx_activity_created
            ON activity(created_at DESC);
            """
        )