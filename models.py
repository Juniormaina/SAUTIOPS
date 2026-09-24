from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Category(str, Enum):
    maintenance = "maintenance"
    stock = "stock"
    customer = "customer"
    safety = "safety"
    delivery = "delivery"
    other = "other"


class Priority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class Status(str, Enum):
    open = "open"
    closed = "closed"


class TicketCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=3, max_length=2000)
    category: Category
    priority: Priority
    location: str = Field(min_length=2, max_length=120)
    reporter: str = Field(default="Unknown", min_length=1, max_length=120)

    @field_validator("title", "description", "location", "reporter")
    @classmethod
    def reject_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be blank")
        return value.strip()


class Ticket(BaseModel):
    ticket_id: str
    title: str
    description: str
    category: Category
    priority: Priority
    location: str
    reporter: str
    status: Status
    created_at: datetime
    closed_at: datetime | None
    close_note: str | None


class TicketCreated(BaseModel):
    ticket_id: str
    status: Status
    message: str


class TicketClose(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    note: str = Field(min_length=2, max_length=1000)


class ToolCloseTicket(TicketClose):
    ticket_id: str = Field(pattern=r"^SO-\d{4,}$")


class TicketClosed(BaseModel):
    ticket_id: str
    status: Status
    message: str


class Activity(BaseModel):
    id: int
    action: str
    ticket_id: str | None
    detail: str
    created_at: datetime