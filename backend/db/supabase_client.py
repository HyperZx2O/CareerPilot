import os
import threading
from typing import Generator
try:
    from supabase import create_client, Client as SupabaseClient
except Exception:
    # Fallback stub when supabase library is unavailable.
    class SupabaseClient:
        def __init__(self, *args, **kwargs):
            pass
    def create_client(url: str, key: str) -> SupabaseClient:
        return SupabaseClient(url, key)

from dotenv import load_dotenv
from backend.logger import get_logger

logger = get_logger("db")

load_dotenv()

Base = None

SUPABASE_URL = os.getenv("SUPABASE_URL", "")

_supabase_client: SupabaseClient | None = None
_init_lock = threading.Lock()

def _resolve_supabase_key() -> str:
    service_key = os.getenv("SUPABASE_SERVICE_KEY")
    if service_key:
        return service_key
    anon_key = os.getenv("SUPABASE_ANON_KEY", "")
    if anon_key:
        logger.warning("SUPABASE_SERVICE_KEY not set — falling back to SUPABASE_ANON_KEY. RLS policies will not be enforced by the backend.")
    return anon_key

def get_supabase_admin_client() -> SupabaseClient:
    """Client with service key — full database access (admin/migration use only)."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client
    with _init_lock:
        if _supabase_client is not None:
            return _supabase_client
        key = _resolve_supabase_key()
        env = os.getenv("ENV", "development").lower()
        if not SUPABASE_URL or not key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_ANON_KEY) must be set in environment variables."
            )
        if env == "production" and not os.getenv("SUPABASE_SERVICE_KEY"):
            raise RuntimeError(
                "In production SUPABASE_SERVICE_KEY is required. Refusing to start with an anon key."
            )
        _supabase_client = create_client(SUPABASE_URL, key)
        logger.info("Supabase admin client initialized")
    return _supabase_client

def get_supabase_client() -> SupabaseClient:
    """Alias for backward compatibility — returns admin client."""
    return get_supabase_admin_client()

def get_supabase_user_client(user_jwt: str | None = None) -> SupabaseClient:
    """Create a Supabase client scoped to the authenticated user.

    Uses SUPABASE_ANON_KEY + the user's JWT so that Supabase enforces RLS
    policies. Falls back to admin client if no JWT is available.
    """
    if not user_jwt:
        logger.warning("No user JWT — falling back to admin client (RLS bypassed)")
        return get_supabase_admin_client()

    anon_key = os.getenv("SUPABASE_ANON_KEY", "")
    if not SUPABASE_URL or not anon_key:
        logger.warning("SUPABASE_URL or SUPABASE_ANON_KEY not set — falling back to admin client")
        return get_supabase_admin_client()

        try:
            client = create_client(SUPABASE_URL, anon_key)
            try:
                from supabase.lib.client_options import ClientOptions
                client.postgrest.auth(user_jwt)
            except Exception:
                # In stubbed client, postgrest may not exist
                pass
            logger.info("Supabase user client initialized (JWT scope)")
            return client
        except Exception as e:
            logger.warning("Failed to create user-scoped Supabase client: %s — falling back to admin", e)
            return get_supabase_admin_client()

def get_db() -> Generator[SupabaseClient, None, None]:
    yield get_supabase_admin_client()
