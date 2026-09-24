import os

import pytest
from fastapi.testclient import TestClient

from app.api.database import initialize_database
from app.api.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    database = tmp_path / "test.db"
    monkeypatch.setenv("DATABASE_PATH", str(database))
    monkeypatch.setenv("TOOL_BEARER_TOKEN", "test-tool-token")
    initialize_database()
    with TestClient(app) as test_client:
        yield test_client