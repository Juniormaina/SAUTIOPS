import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from .database import initialize_database
from .events import encode_sse, hub
from .models import (
    Activity,
    Status,
    Ticket,
    TicketClose,
    TicketClosed,
    TicketCreate,
    TicketCreated,
    ToolCloseTicket,
)
from .services import (
    close_ticket,
    create_ticket,
    get_ticket,
    list_activity,
    list_tickets,
)

load_dotenv()
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("sautiops")
FRONTEND = Path(__file__).resolve().parents[1] / "frontend"


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    hub.bind_loop(asyncio.get_running_loop())
    yield


app = FastAPI(
    title="SautiOps",
    version="0.1.0",
    lifespan=lifespan,
)


def require_tool_secret(
    authorization: str | None = Header(default=None),
) -> None:
    expected = os.getenv("TOOL_BEARER_TOKEN")
    if not expected:
        logger.error("TOOL_BEARER_TOKEN is not configured")
        raise HTTPException(status_code=503, detail="Tool authentication unavailable.")
    if authorization != f"Bearer {expected}":
        raise HTTPException(status_code=401, detail="Unauthorized tool request.")


def require_api_secret(
    authorization: str | None = Header(default=None),
) -> None:
    expected = os.getenv("API_BEARER_TOKEN")
    if not expected:
        logger.error("API_BEARER_TOKEN is not configured")
        raise HTTPException(status_code=503, detail="API authentication unavailable.")
    if authorization != f"Bearer {expected}":
        raise HTTPException(status_code=401, detail="Unauthorized API request.")


@app.exception_handler(RequestValidationError)
async def validation_error(
    _: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={"detail": "Invalid request data.", "errors": exc.errors()},
    )


@app.exception_handler(Exception)
async def unhandled_error(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unexpected backend error", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected backend error occurred."},
    )


@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000)
    if request.url.path.startswith("/tools/"):
        logger.info(
            "[TOOL] %s [STATUS] %s [TIME] %sms",
            request.url.path,
            response.status_code,
            duration_ms,
        )
    return response


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "sautiops"}


@app.get("/api/config")
def public_config() -> dict:
    agent_id = os.getenv("ASSEMBLYAI_AGENT_ID")
    if not agent_id:
        raise HTTPException(
            status_code=503,
            detail="ASSEMBLYAI_AGENT_ID is not configured.",
        )
    return {"agent_id": agent_id}


@app.get("/api/voice-token")
async def voice_token() -> dict:
    api_key = os.getenv("ASSEMBLYAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="ASSEMBLYAI_API_KEY is not configured.",
        )

    params = {
        "expires_in_seconds": 120,
        "max_session_duration_seconds": 1800,
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                "https://agents.assemblyai.com/v1/token",
                params=params,
                headers={"Authorization": f"Bearer {api_key}"},
            )
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.error(
            "Voice token request failed: status=%s body=%s",
            exc.response.status_code,
            exc.response.text[:300],
        )
        raise HTTPException(
            status_code=502,
            detail="Could not authorize the voice session.",
        ) from exc
    except httpx.HTTPError as exc:
        logger.error("Voice token request failed: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="Could not reach the voice service.",
        ) from exc

    return {"token": response.json()["token"]}


@app.get("/events")
async def ticket_events(request: Request) -> StreamingResponse:
    queue = hub.subscribe()

    async def event_stream():
        try:
            yield encode_sse("connected")
            while True:
                if await request.is_disconnected():
                    break
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=1.0)
                    yield encode_sse(message["type"], message["data"])
                except asyncio.TimeoutError:
                    if await request.is_disconnected():
                        break
                    yield ": keepalive\n\n"
        finally:
            hub.unsubscribe(queue)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post(
    "/tickets",
    response_model=TicketCreated,
    status_code=201,
    dependencies=[Depends(require_api_secret)],
)
def create_ticket_endpoint(payload: TicketCreate) -> dict:
    result = create_ticket(payload)
    hub.publish("ticket.created", {"ticket_id": result["ticket_id"]})
    return result


@app.get("/tickets", response_model=list[Ticket])
def list_tickets_endpoint(
    status: Status | None = Query(default=None),
) -> list[dict]:
    return list_tickets(status.value if status else None)


@app.get("/tickets/{ticket_id}", response_model=Ticket)
def get_ticket_endpoint(ticket_id: str) -> dict:
    return get_ticket(ticket_id)


@app.post(
    "/tickets/{ticket_id}/close",
    response_model=TicketClosed,
    dependencies=[Depends(require_api_secret)],
)
def close_ticket_endpoint(ticket_id: str, payload: TicketClose) -> dict:
    result = close_ticket(ticket_id, payload)
    hub.publish("ticket.closed", {"ticket_id": result["ticket_id"]})
    return result


@app.get("/activity", response_model=list[Activity])
def activity_endpoint(
    limit: int = Query(default=12, ge=1, le=50),
) -> list[dict]:
    return list_activity(limit)


@app.post(
    "/tools/create-ticket",
    response_model=TicketCreated,
    status_code=201,
    dependencies=[Depends(require_tool_secret)],
)
def tool_create_ticket(payload: TicketCreate) -> dict:
    logger.info("[TOOL] create_ticket")
    result = create_ticket(payload)
    hub.publish("ticket.created", {"ticket_id": result["ticket_id"]})
    logger.info("[RESULT] %s", result["ticket_id"])
    return result


@app.get(
    "/tools/open-tickets",
    response_model=list[Ticket],
    dependencies=[Depends(require_tool_secret)],
)
def tool_open_tickets() -> list[dict]:
    logger.info("[TOOL] list_open_tickets")
    result = list_tickets("open", record_view=True)
    logger.info("[RESULT] %s open ticket(s)", len(result))
    return result


@app.post(
    "/tools/close-ticket",
    response_model=TicketClosed,
    dependencies=[Depends(require_tool_secret)],
)
def tool_close_ticket(payload: ToolCloseTicket) -> dict:
    logger.info("[TOOL] close_ticket ticket_id=%s", payload.ticket_id)
    result = close_ticket(payload.ticket_id, TicketClose(note=payload.note))
    hub.publish("ticket.closed", {"ticket_id": result["ticket_id"]})
    logger.info("[RESULT] %s", result["ticket_id"])
    return result


app.mount("/", StaticFiles(directory=FRONTEND, html=True), name="frontend")
