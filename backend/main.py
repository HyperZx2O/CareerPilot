import sys
from pathlib import Path
import os
from dotenv import load_dotenv

# Load environment variables from the project root .env BEFORE any other imports
# that depend on os.getenv (e.g., supabase_client.py reads DATABASE_URL at import time)
_project_root = Path(__file__).resolve().parent.parent
load_dotenv(_project_root / ".env")

from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from backend.utils import is_placeholder

sentry_dsn = os.getenv("SENTRY_DSN", "")
if sentry_dsn and not is_placeholder(sentry_dsn):
    import sentry_sdk
    sentry_sdk.init(
        dsn=sentry_dsn,
        traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1")),
        environment=os.getenv("ENV", "development"),
    )

# Setup system paths to resolve submodules
_integrations_path = _project_root / "integrations"
for _p in (str(_project_root), str(_integrations_path)):
    if _p not in sys.path:
        sys.path.insert(0, _p)


from backend.middleware.rate_limit import RateLimitMiddleware

from backend.routers.tracker import router as tracker_router
from backend.routers.cv import router as cv_router
from backend.routers.chat import router as chat_router

try:
    from backend.routers.jobs import router as jobs_router
except ImportError:
    jobs_router = None  # integrations deps not installed

try:
    from backend.routers.roadmap import router as roadmap_router
except ImportError:
    roadmap_router = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    from backend.db.migrate import run_pending_migrations
    run_pending_migrations()
    yield

app = FastAPI(
    title="CareerPilot Backend API",
    description="FastAPI Backend for CareerPilot Job Hunting and RAG Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(RateLimitMiddleware)
origins = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


import asyncio

async def _check_supabase():
    try:
        from backend.db.supabase_client import get_supabase_client
        client = get_supabase_client()
        client.table("users").select("id").limit(1).execute()
        return True
    except Exception:
        return False

async def _check_pinecone():
    try:
        from pinecone import Pinecone
        api_key = os.getenv("PINECONE_API_KEY", "")
        if not api_key or is_placeholder(api_key):
            return None
        pc = Pinecone(api_key=api_key)
        pc.list_indexes()
        return True
    except Exception:
        return False

async def _check_groq():
    try:
        from groq import Groq
        key = os.getenv("GROQ_API_KEY", "")
        if not key or is_placeholder(key):
            return None
        client = Groq(api_key=key)
        client.models.list()
        return True
    except Exception:
        return False

@app.get("/health", tags=["system"])
async def health_check():
    supabase_ok, pinecone_ok, groq_ok = await asyncio.gather(
        _check_supabase(), _check_pinecone(), _check_groq(),
    )
    checks = {
        "supabase": supabase_ok,
        "pinecone": pinecone_ok,
        "groq": groq_ok,
    }
    all_ok = all(v is not False for v in checks.values())
    return {
        "status": "ok" if all_ok else "degraded",
        "environment": os.getenv("ENV", "development"),
        "checks": checks,
    }

from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "0"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

app.add_middleware(SecurityHeadersMiddleware)

MAX_BODY_SIZE = int(os.getenv("MAX_REQUEST_BODY_SIZE", "10_485_760"))  # 10 MB default

from starlette.responses import PlainTextResponse

class RequestBodySizeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        content_length_str = request.headers.get("content-length")
        if content_length_str:
            try:
                content_length = int(content_length_str)
                if content_length > MAX_BODY_SIZE:
                    return PlainTextResponse("Request body too large", status_code=413)
            except ValueError:
                pass
        response = await call_next(request)
        return response

app.add_middleware(RequestBodySizeMiddleware)

from backend.routers.webhooks import router as webhooks_router
from backend.routers.settings import router as settings_router

# Include Routers
if jobs_router is not None:
    app.include_router(jobs_router)
if roadmap_router is not None:
    app.include_router(roadmap_router)
app.include_router(tracker_router)
app.include_router(cv_router)
app.include_router(chat_router)
app.include_router(webhooks_router)
app.include_router(settings_router)

if __name__ == "__main__":
    import uvicorn
    # Only enable reload in non-production environments
    reload_flag = os.getenv("ENV", "development").lower() != "production"
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=reload_flag)
