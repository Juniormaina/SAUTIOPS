from fastapi.testclient import TestClient

from app.api.main import app

TOOL_AUTH = {"Authorization": "Bearer test-tool-token"}
API_AUTH = {"Authorization": "Bearer test-api-token"}


def ticket_payload(title: str = "Freezer stopped cooling") -> dict:
    return {
        "title": title,
        "description": "The back-room freezer stopped cooling.",
        "category": "maintenance",
        "priority": "high",
        "location": "Back room",
        "reporter": "Amina",
    }


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_create_and_list_open_ticket(client: TestClient) -> None:
    created = client.post(
        "/tickets",
        headers=API_AUTH,
        json=ticket_payload(),
    )
    assert created.status_code == 201
    assert created.json()["ticket_id"] == "SO-0001"

    listed = client.get("/tickets?status=open")
    assert listed.status_code == 200
    assert len(listed.json()) == 1
    assert listed.json()[0]["status"] == "open"


def test_create_requires_api_auth(client: TestClient) -> None:
    unauthorized = client.post("/tickets", json=ticket_payload())
    assert unauthorized.status_code == 401

    wrong = client.post(
        "/tickets",
        headers={"Authorization": "Bearer wrong-token"},
        json=ticket_payload(),
    )
    assert wrong.status_code == 401


def test_close_ticket_persists(client: TestClient) -> None:
    client.post("/tickets", headers=API_AUTH, json=ticket_payload())
    response = client.post(
        "/tickets/SO-0001/close",
        headers=API_AUTH,
        json={"note": "The freezer was repaired."},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "closed"
    assert client.get("/tickets?status=open").json() == []
    assert client.get("/tickets/SO-0001").json()["closed_at"] is not None


def test_unknown_ticket(client: TestClient) -> None:
    response = client.post(
        "/tickets/SO-9999/close",
        headers=API_AUTH,
        json={"note": "Resolved."},
    )
    assert response.status_code == 404


def test_invalid_ticket_id(client: TestClient) -> None:
    response = client.post(
        "/tickets/not-a-ticket/close",
        headers=API_AUTH,
        json={"note": "Resolved."},
    )
    assert response.status_code == 400


def test_cannot_close_ticket_twice(client: TestClient) -> None:
    client.post("/tickets", headers=API_AUTH, json=ticket_payload())
    client.post(
        "/tickets/SO-0001/close",
        headers=API_AUTH,
        json={"note": "Repaired."},
    )
    response = client.post(
        "/tickets/SO-0001/close",
        headers=API_AUTH,
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
        headers=TOOL_AUTH,
        json=ticket_payload(),
    )
    assert created.status_code == 201

    opened = client.get("/tools/open-tickets", headers=TOOL_AUTH)
    assert opened.status_code == 200
    assert opened.json()[0]["ticket_id"] == "SO-0001"

    closed = client.post(
        "/tools/close-ticket",
        headers=TOOL_AUTH,
        json={
            "ticket_id": "SO-0001",
            "note": "The freezer was repaired.",
        },
    )
    assert closed.status_code == 200
    assert closed.json()["status"] == "closed"


def test_events_hub_publish() -> None:
    import asyncio

    from app.api.events import EventHub, encode_sse

    assert "event: ticket.created" in encode_sse(
        "ticket.created",
        {"ticket_id": "SO-0001"},
    )

    local_hub = EventHub()

    async def roundtrip() -> dict:
        queue = local_hub.subscribe()
        try:
            local_hub.publish("ticket.closed", {"ticket_id": "SO-0001"})
            return await asyncio.wait_for(queue.get(), timeout=1.0)
        finally:
            local_hub.unsubscribe(queue)

    message = asyncio.run(roundtrip())
    assert message["type"] == "ticket.closed"
    assert message["data"]["ticket_id"] == "SO-0001"
