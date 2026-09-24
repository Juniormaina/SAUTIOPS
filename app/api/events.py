import asyncio
import json
from typing import Any


class EventHub:
    """In-process SSE broadcaster for dashboard live updates."""

    def __init__(self) -> None:
        self._subscribers: set[asyncio.Queue[dict[str, Any]]] = set()
        self._loop: asyncio.AbstractEventLoop | None = None

    def bind_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    def subscribe(self) -> asyncio.Queue[dict[str, Any]]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=32)
        self._subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue[dict[str, Any]]) -> None:
        self._subscribers.discard(queue)

    def publish(
        self,
        event_type: str,
        payload: dict[str, Any] | None = None,
    ) -> None:
        message = {"type": event_type, "data": payload or {}}
        loop = self._loop
        if loop is None or not loop.is_running():
            for queue in list(self._subscribers):
                self._safe_put(queue, message)
            return

        for queue in list(self._subscribers):
            loop.call_soon_threadsafe(self._safe_put, queue, message)

    @staticmethod
    def _safe_put(
        queue: asyncio.Queue[dict[str, Any]],
        message: dict[str, Any],
    ) -> None:
        try:
            queue.put_nowait(message)
        except asyncio.QueueFull:
            pass


hub = EventHub()


def encode_sse(event_type: str, data: dict[str, Any] | None = None) -> str:
    payload = json.dumps(data or {})
    return f"event: {event_type}\ndata: {payload}\n\n"
