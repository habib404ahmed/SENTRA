"""
SENTRA Real-Time Alert Event Broadcaster (Server-Sent Events)

Provides near-real-time streaming of new threat alerts and status changes
to connected dashboard clients.
"""

import asyncio
import json
import logging
from typing import AsyncGenerator, Set
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class AlertBroadcaster:
    """
    Manages active SSE subscriber queues and broadcasts alert events.
    """

    def __init__(self):
        self._subscribers: Set[asyncio.Queue] = set()

    def subscribe(self) -> asyncio.Queue:
        q = asyncio.Queue(maxsize=100)
        self._subscribers.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        self._subscribers.discard(q)

    async def broadcast_alert(self, event_type: str, data: dict):
        """
        Dispatches an event to all connected dashboard SSE queues.
        """
        payload = {
            "event": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": data,
        }
        msg = f"event: {event_type}\ndata: {json.dumps(payload)}\n\n"

        for q in list(self._subscribers):
            try:
                q.put_nowait(msg)
            except asyncio.QueueFull:
                # Discard stale messages for slow consumers
                try:
                    q.get_nowait()
                    q.put_nowait(msg)
                except Exception:
                    pass
            except Exception as e:
                logger.warning(f"Broadcaster queue error: {e}")


broadcaster = AlertBroadcaster()


async def alert_event_generator(q: asyncio.Queue) -> AsyncGenerator[str, None]:
    """
    Asynchronous generator yielding SSE formatted events.
    Sends periodic keep-alive pings every 15 seconds.
    """
    try:
        # Initial greeting / connection ping
        yield f"event: connected\ndata: {json.dumps({'status': 'connected', 'timestamp': datetime.now(timezone.utc).isoformat()})}\n\n"

        while True:
            try:
                msg = await asyncio.wait_for(q.get(), timeout=15.0)
                yield msg
            except asyncio.TimeoutError:
                # Periodic keep-alive ping to prevent proxy disconnections
                yield ": keepalive\n\n"
    finally:
        broadcaster.unsubscribe(q)
