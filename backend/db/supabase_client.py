import os
from typing import Generator
from supabase import create_client, Client as SupabaseClient
from dotenv import load_dotenv

load_dotenv()

# Placeholder for SQLAlchemy Base - models.py/core_models.py still import it
# but they are no longer used for database operations (Supabase REST used instead)
Base = None

# Supabase connection settings from environment
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY", "")

# Singleton client instance
_supabase_client: SupabaseClient | None = None

def get_supabase_client() -> SupabaseClient:
    """Returns the singleton Supabase client instance."""
    global _supabase_client
    if _supabase_client is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_ANON_KEY) "
                "must be set in environment variables."
            )
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("[DB] Supabase REST client initialized")
    return _supabase_client


def get_db() -> Generator[SupabaseClient, None, None]:
    """
    FastAPI dependency yielding the Supabase client.
    Kept for backwards compatibility with existing endpoint signatures.
    """
    yield get_supabase_client()
