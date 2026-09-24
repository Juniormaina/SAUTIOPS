import os
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from sqlalchemy import event
from sqlmodel import Session, SQLModel, create_engine

from . import tables  # noqa: F401 — register table metadata

DEFAULT_PATH = Path(__file__).resolve().parents[2] / "data" / "sautiops.db"
_engine = None


def database_url() -> str:
    configured = os.getenv("DATABASE_URL")
    if configured:
        return configured

    path = os.getenv("DATABASE_PATH", str(DEFAULT_PATH))
    if path == ":memory:":
        return "sqlite://"

    db_path = Path(path)
    if not db_path.is_absolute():
        db_path = Path.cwd() / db_path
    return f"sqlite:///{db_path}"


def get_engine():
    global _engine
    if _engine is None:
        url = database_url()
        connect_args = {}
        if url.startswith("sqlite"):
            connect_args["check_same_thread"] = False
        _engine = create_engine(url, connect_args=connect_args)
        if url.startswith("sqlite"):

            @event.listens_for(_engine, "connect")
            def _set_sqlite_pragma(dbapi_connection, _connection_record) -> None:
                cursor = dbapi_connection.cursor()
                cursor.execute("PRAGMA foreign_keys=ON")
                cursor.execute("PRAGMA journal_mode=WAL")
                cursor.close()
    return _engine


def reset_engine() -> None:
    global _engine
    if _engine is not None:
        _engine.dispose()
        _engine = None


@contextmanager
def session_scope() -> Iterator[Session]:
    with Session(get_engine(), expire_on_commit=False) as session:
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise


def initialize_database() -> None:
    url = database_url()
    if url.startswith("sqlite:///") and url != "sqlite:///":
        path = Path(url.removeprefix("sqlite:///"))
        path.parent.mkdir(parents=True, exist_ok=True)
    SQLModel.metadata.create_all(get_engine())
