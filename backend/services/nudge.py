from datetime import datetime, timedelta
from backend.db.supabase_client import get_supabase_client

INACTIVITY_DAYS = 3

async def check_and_send_nudge(user_id: str) -> None:
    # Log nudge event via Supabase REST
    supabase = get_supabase_client()
    supabase.table("activity_log").insert({
        "user_id": user_id,
        "action": "nudge_sent"
    }).execute()
