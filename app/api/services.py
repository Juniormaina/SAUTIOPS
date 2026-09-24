import re
from datetime import datetime, timezone
from sqlite3 import Connection, IntegrityError, Row

from fastapi import HTTPException

from .database import connection
from .models import TicketClose, TicketCreate

TICKET_PATTERN = re.compile(r"^SO-(\d{4,})$")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def format_ticket_id(value: int) -> str:
    return f"SO-{value:04d}"


def parse_ticket_id(ticket_id: str) -> int:
    match = TICKET_PATTERN.fullmatch(ticket_id.upper())
    if not match:
        raise HTTPException(
            status_code=400,
            detail="Invalid ticket ID. Expected a value such as SO-0001.",
        )
    return int(match.group(1))


def serialize_ticket(row: Row) -> dict:
    return {
        "ticket_id": format_ticket_id(row["id"]),
        "title": row["title"],
        "description": row["description"],
        "category": row["category"],
        "priority": row["priority"],
        "location": row["location"],
        "reporter": row["reporter"],
        "status": row["status"],
        "created_at": row["created_at"],
        "closed_at": row["closed_at"],
        "close_note": row["close_note"],
    }


def record_activity(
    conn: Connection,
    action: str,
    detail: str,
    ticket_id: int | None = None,
) -> None:
    conn.execute(
        """
        INSERT INTO activity(action, ticket_id, detail, created_at)
        VALUES (?, ?, ?, ?)
        """,
        (action, ticket_id, detail, utc_now()),
    )


def create_ticket(payload: TicketCreate) -> dict:
    with connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO tickets (
                title, description, category, priority,
                location, reporter, status, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, 'open', ?)
            """,
            (
                payload.title,
                payload.description,
                payload.category.value,
                payload.priority.value,
                payload.location,
                payload.reporter,
                utc_now(),
            ),
        )
        ticket_id = int(cursor.lastrowid)
        display_id = format_ticket_id(ticket_id)
        record_activity(
            conn,
            "ticket_created",
            f"{display_id} created: {payload.title}",
            ticket_id,
        )

    return {
        "ticket_id": display_id,
        "status": "open",
        "message": "Issue created successfully.",
    }


def list_tickets(status: str | None = None, record_view: bool = False) -> list[dict]:
    query = "SELECT * FROM tickets"
    parameters: tuple[str, ...] = ()

    if status:
        query += " WHERE status = ?"
        parameters = (status,)

    query += " ORDER BY created_at DESC"

    with connection() as conn:
        rows = conn.execute(query, parameters).fetchall()
        if record_view:
            label = status or "all"
            record_activity(
                conn,
                "tickets_viewed",
                f"Viewed {len(rows)} {label} ticket(s)",
            )
        return [serialize_ticket(row) for row in rows]


def get_ticket(ticket_id: str) -> dict:
    numeric_id = parse_ticket_id(ticket_id)
    with connection() as conn:
        row = conn.execute(
            "SELECT * FROM tickets WHERE id = ?",
            (numeric_id,),
        ).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Ticket not found.")
    return serialize_ticket(row)


def close_ticket(ticket_id: str, payload: TicketClose) -> dict:
    numeric_id = parse_ticket_id(ticket_id)
    timestamp = utc_now()

    try:
        with connection() as conn:
            cursor = conn.execute(
                """
                UPDATE tickets
                SET status = 'closed', closed_at = ?, close_note = ?
                WHERE id = ? AND status = 'open'
                """,
                (timestamp, payload.note, numeric_id),
            )

            if cursor.rowcount == 0:
                row = conn.execute(
                    "SELECT status FROM tickets WHERE id = ?",
                    (numeric_id,),
                ).fetchone()
                if row is None:
                    raise HTTPException(status_code=404, detail="Ticket not found.")
                raise HTTPException(
                    status_code=409,
                    detail="Ticket is already closed.",
                )

            display_id = format_ticket_id(numeric_id)
            record_activity(
                conn,
                "ticket_closed",
                f"{display_id} closed: {payload.note}",
                numeric_id,
            )
    except IntegrityError as exc:
        raise HTTPException(status_code=400, detail="Invalid ticket update.") from exc

    return {
        "ticket_id": format_ticket_id(numeric_id),
        "status": "closed",
        "message": "Issue closed successfully.",
    }


def list_activity(limit: int = 12) -> list[dict]:
    with connection() as conn:
        rows = conn.execute(
            """
            SELECT id, action, ticket_id, detail, created_at
            FROM activity
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    return [
        {
            "id": row["id"],
            "action": row["action"],
            "ticket_id": (
                format_ticket_id(row["ticket_id"])
                if row["ticket_id"] is not None
                else None
            ),
            "detail": row["detail"],
            "created_at": row["created_at"],
        }
        for row in rows
    ]