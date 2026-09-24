from sqlalchemy import CheckConstraint, Index
from sqlmodel import Field, SQLModel


class TicketRow(SQLModel, table=True):
    # Explicit annotations required on Python 3.14+ (PEP 649) for SQLModel.
    __annotations__ = {
        "id": int | None,
        "title": str,
        "description": str,
        "category": str,
        "priority": str,
        "location": str,
        "reporter": str,
        "status": str,
        "created_at": str,
        "closed_at": str | None,
        "close_note": str | None,
    }
    __tablename__ = "tickets"
    __table_args__ = (
        CheckConstraint(
            "category IN ("
            "'maintenance', 'stock', 'customer', "
            "'safety', 'delivery', 'other')"
        ),
        CheckConstraint(
            "priority IN ('low', 'medium', 'high', 'critical')"
        ),
        CheckConstraint("status IN ('open', 'closed')"),
        Index("idx_tickets_status_created", "status", "created_at"),
    )

    id = Field(default=None, primary_key=True)
    title = Field()
    description = Field()
    category = Field()
    priority = Field()
    location = Field()
    reporter = Field()
    status = Field(default="open")
    created_at = Field()
    closed_at = Field(default=None)
    close_note = Field(default=None)


class ActivityRow(SQLModel, table=True):
    __annotations__ = {
        "id": int | None,
        "action": str,
        "ticket_id": int | None,
        "detail": str,
        "created_at": str,
    }
    __tablename__ = "activity"
    __table_args__ = (
        CheckConstraint(
            "action IN ("
            "'ticket_created', 'tickets_viewed', 'ticket_closed')"
        ),
        Index("idx_activity_created", "created_at"),
    )

    id = Field(default=None, primary_key=True)
    action = Field()
    ticket_id = Field(default=None, foreign_key="tickets.id")
    detail = Field()
    created_at = Field()
