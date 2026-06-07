import os
from fastapi import APIRouter, Request, HTTPException
from backend.db.supabase_client import get_supabase_client
from backend.logger import get_logger

logger = get_logger("webhooks")

router = APIRouter()


@router.post("/api/webhooks/clerk")
async def clerk_webhook(request: Request):
    secret = os.getenv("CLERK_WEBHOOK_SECRET", "")
    if not secret or "your_" in secret:
        logger.error("CLERK_WEBHOOK_SECRET not configured — webhook endpoint disabled")
        raise HTTPException(status_code=501, detail="Webhook not configured")

    import json
    body = await request.body()
    svix_id = request.headers.get("svix-id")
    svix_timestamp = request.headers.get("svix-timestamp")
    svix_signature = request.headers.get("svix-signature")

    from svix import Webhook
    wh = Webhook(secret)
    try:
        payload = wh.verify(body, {
            "svix-id": svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        })
    except Exception as e:
        logger.warning("Webhook signature verification failed: %s", e)
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    event_type = payload.get("type")
    data = payload.get("data", {})
    user_id = data.get("id")

    if not user_id:
        raise HTTPException(status_code=400, detail="Missing user id")

    supabase = get_supabase_client()

    if event_type == "user.created":
        existing = supabase.table("users").select("id").eq("id", user_id).limit(1).execute()
        if not existing.data:
            supabase.table("users").insert({
                "id": user_id,
                "email": data.get("email_addresses", [{}])[0].get("email_address", ""),
            }).execute()
            logger.info("Created user %s via Clerk webhook", user_id)
        return {"ok": True, "action": "created"}

    if event_type == "user.updated":
        supabase.table("users").update({
            "email": data.get("email_addresses", [{}])[0].get("email_address", ""),
        }).eq("id", user_id).execute()
        logger.info("Updated user %s via Clerk webhook", user_id)
        return {"ok": True, "action": "updated"}

    logger.info("Unhandled Clerk event type: %s", event_type)
    return {"ok": True, "action": "ignored"}
