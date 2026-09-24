import re
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, col, select

from .database import session_scope
from .models import TicketClose, TicketCreate
from .tables import ActivityRow, TicketRow

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


def serialize_ticket(row: TicketRow) -> dict:
    return {
        "ticket_id": format_ticket_id(row.id),
        "title": row.title,
        "description": row.description,
        "category": row.category,
        "priority": row.priority,
        "location": row.location,
        "reporter": row.reporter,
        "status": row.status,
        "created_at": row.created_at,
        "closed_at": row.closed_at,
        "close_note": row.close_note,
    }


def record_activity(
    session: Session,
    action: str,
    detail: str,
    ticket_id: int | None = None,
) -> None:
    session.add(
        ActivityRow(
            action=action,
            ticket_id=ticket_id,
            detail=detail,
            created_at=utc_now(),
        )
    )


def _speakable_integrity_detail(exc: IntegrityError) -> str:
    message = str(exc.orig) if getattr(exc, "orig", None) else str(exc)
    lowered = message.lower()
    if "priority" in lowered:
        return (
            "I couldn't save that ticket because the priority was invalid. "
            "Please repeat the priority as low, medium, high, or critical."
        )
    if "category" in lowered:
        return (
            "I couldn't save that ticket because the category was invalid. "
            "Please repeat the category."
        )
    if "status" in lowered:
        return (
            "I couldn't update that ticket due to an invalid status. "
            "Please try again."
        )
    return (
        "I couldn't save that ticket due to a database issue. "
        "Please try again."
    )


def create_ticket(payload: TicketCreate) -> dict:
    try:
        with session_scope() as session:
            ticket = TicketRow(
                title=payload.title,
                description=payload.description,
                category=payload.category.value,
                priority=payload.priority.value,
                location=payload.location,
                reporter=payload.reporter,
                status="open",
                created_at=utc_now(),
            )
            session.add(ticket)
            session.flush()
            ticket_id = int(ticket.id)
            display_id = format_ticket_id(ticket_id)
            record_activity(
                session,
                "ticket_created",
                f"{display_id} created: {payload.title}",
                ticket_id,
            )
    except IntegrityError as exc:
        raise HTTPException(
            status_code=400,
            detail=_speakable_integrity_detail(exc),
        ) from exc

    return {
        "ticket_id": display_id,
        "status": "open",
        "message": "Issue created successfully.",
    }


def list_tickets(status: str | None = None, record_view: bool = False) -> list[dict]:
    with session_scope() as session:
        statement = select(TicketRow)
        if status:
            statement = statement.where(TicketRow.status == status)
        statement = statement.order_by(col(TicketRow.created_at).desc())
        rows = session.exec(statement).all()
        if record_view:
            label = status or "all"
            record_activity(
                session,
                "tickets_viewed",
                f"Viewed {len(rows)} {label} ticket(s)",
            )
        return [serialize_ticket(row) for row in rows]


def get_ticket(ticket_id: str) -> dict:
    numeric_id = parse_ticket_id(ticket_id)
    with session_scope() as session:
        row = session.get(TicketRow, numeric_id)
        if row is None:
            raise HTTPException(status_code=404, detail="Ticket not found.")
        return serialize_ticket(row)


def close_ticket(ticket_id: str, payload: TicketClose) -> dict:
    numeric_id = parse_ticket_id(ticket_id)
    timestamp = utc_now()

    try:
        with session_scope() as session:
            row = session.get(TicketRow, numeric_id)
            if row is None:
                raise HTTPException(status_code=404, detail="Ticket not found.")
            if row.status != "open":
                raise HTTPException(
                    status_code=409,
                    detail="Ticket is already closed.",
                )

            row.status = "closed"
            row.closed_at = timestamp
            row.close_note = payload.note
            session.add(row)

            display_id = format_ticket_id(numeric_id)
            record_activity(
                session,
                "ticket_closed",
                f"{display_id} closed: {payload.note}",
                numeric_id,
            )
    except IntegrityError as exc:
        raise HTTPException(
            status_code=400,
            detail=_speakable_integrity_detail(exc),
        ) from exc

    return {
        "ticket_id": format_ticket_id(numeric_id),
        "status": "closed",
        "message": "Issue closed successfully.",
    }


def list_activity(limit: int = 12) -> list[dict]:
    with session_scope() as session:
        statement = (
            select(ActivityRow)
            .order_by(col(ActivityRow.created_at).desc())
            .limit(limit)
        )
        rows = session.exec(statement).all()
        return [
            {
                "id": row.id,
                "action": row.action,
                "ticket_id": (
                    format_ticket_id(row.ticket_id)
                    if row.ticket_id is not None
                    else None
                ),
                "detail": row.detail,
                "created_at": row.created_at,
            }
            for row in rows
        ]
