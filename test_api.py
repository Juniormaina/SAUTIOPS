import os

os.environ["TOOL_BEARER_TOKEN"] = "test-tool-token"

from fastapi.testclient import TestClient  # noqa: E402

from app.api.database import initialize_database  # noqa: E402
from app.api.main import app  # noqa: E402

AUTH = {"Authorization": "Bearer test-tool-token"}


def ticket_payload(title: str = "Freezer stopped cooling") -> dict:
    return {
        "title": title,
        "description": "The back-room freezer stopped cooling.",
        "category": "maintenance",
        "priority": "high",
        "location": "Back room",
        "reporter": "Amina",
    }


def setup_function() -> None:
    initialize_database()


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_create_and_list_open_ticket(client: TestClient) -> None:
    created = client.post("/tickets", json=ticket_payload())
    assert created.status_code == 201
    assert created.json()["ticket_id"] == "SO-0001"

    listed = client.get("/tickets?status=open")
    assert listed.status_code == 200
    assert len(listed.json()) == 1
    assert listed.json()[0]["status"] == "open"


def test_close_ticket_persists(client: TestClient) -> None:
    client.post("/tickets", json=ticket_payload())
    response = client.post(
        "/tickets/SO-0001/close",
        json={"note": "The freezer was repaired."},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "closed"
    assert client.get("/tickets?status=open").json() == []
    assert client.get("/tickets/SO-0001").json()["closed_at"] is not None


def test_unknown_ticket(client: TestClient) -> None:
    response = client.post(
        "/tickets/SO-9999/close",
        json={"note": "Resolved."},
    )
    assert response.status_code == 404


def test_invalid_ticket_id(client: TestClient) -> None:
    response = client.post(
        "/tickets/not-a-ticket/close",
        json={"note": "Resolved."},
    )
    assert response.status_code == 400


def test_cannot_close_ticket_twice(client: TestClient) -> None:
    client.post("/tickets", json=ticket_payload())
    client.post(
        "/tickets/SO-0001/close",
        json={"note": "Repaired."},
    )
    response = client.post(
        "/tickets/SO-0001/close",
        json={"note": "Closing again."},
    )
    assert response.status_code == 409


def test_tool_contract_and_authentication(client: TestClient) -> None:
    unauthorized = client.post(
        "/tools/create-ticket",
        json=ticket_payload(),
    )
    assert unauthorized.status_code == 401

    created = client.post(
        "/tools/create-ticket",
        headers=AUTH,
        json=ticket_payload(),
    )
    assert created.status_code == 201

    opened = client.get("/tools/open-tickets", headers=AUTH)
    assert opened.status_code == 200
    assert opened.json()[0]["ticket_id"] == "SO-0001"

    closed = client.post(
        "/tools/close-ticket",
        headers=AUTH,
        json={
            "ticket_id": "SO-0001",
            "note": "The freezer was repaired.",
        },
    )
    assert closed.status_code == 200
    assert closed.json()["status"] == "closed"