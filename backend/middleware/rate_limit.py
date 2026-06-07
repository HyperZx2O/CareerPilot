import os
import time
import logging
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("rate_limit")

MAX_REQUESTS = int(os.getenv("RATE_LIMIT_MAX", "120"))
WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW", "60"))
REDIS_URL = os.getenv("REDIS_URL", "")

_request_log: dict[str, list[float]] = {}

_redis_client = None

def _get_redis():
    global _redis_client
    if _redis_client is None and REDIS_URL:
        try:
            import redis.asyncio as aioredis
            _redis_client = aioredis.from_url(
                REDIS_URL,
                socket_connect_timeout=1,
                socket_timeout=1,
                decode_responses=True,
            )
        except Exception as e:
            logger.warning("Redis unavailable, falling back to in-memory rate limiting: %s", e)
            _redis_client = False
    return _redis_client if _redis_client is not False else None

async def _check_rate_limit_redis(client_ip: str) -> bool:
    r = _get_redis()
    if r is None:
        return None
    key = f"ratelimit:{client_ip}"
    try:
        current = await r.get(key)
        if current is None:
            await r.setex(key, WINDOW_SECONDS, 1)
            return False
        count = int(current)
        if count >= MAX_REQUESTS:
            return True
        await r.incr(key)
        return False
    except Exception:
        return None

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        env = os.getenv("ENV", "development").lower()
        force_rate_limit = os.getenv("RATE_LIMIT_ENABLED", "").lower() in ("1", "true", "yes")
        if env != "production" and not force_rate_limit:
            return await call_next(request)
        client_ip = request.client.host if request.client else "unknown"

        limited = await _check_rate_limit_redis(client_ip)
        if limited is True:
            raise HTTPException(status_code=429, detail="Too many requests, please slow down.")
        if limited is None:
            now = time.time()
            timestamps = _request_log.get(client_ip, [])
            timestamps = [ts for ts in timestamps if now - ts < WINDOW_SECONDS]
            timestamps.append(now)
            _request_log[client_ip] = timestamps
            if len(timestamps) > MAX_REQUESTS:
                raise HTTPException(status_code=429, detail="Too many requests, please slow down.")

        response = await call_next(request)
        return response
