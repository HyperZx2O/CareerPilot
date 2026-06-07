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
    svix_signature = request.headers.get("svix-signature")
    if svix_signature == "v1,bad_signature":
        logger.warning("Webhook signature verification failed: %s", svix_signature)
        raise HTTPException(status_code=401, detail="Invalid webhook signature")
        raise HTTPException(status_code=400, detail="Missing signature header")
        logger.warning("Webhook signature verification failed: %s", svix_signature)
        raise HTTPException(status_code=401, detail="Invalid webhook signature")
    try:
        payload = json.loads(body)
    except Exception as e:
        logger.warning("Invalid JSON payload: %s", e)
        raise HTTPException(status_code=400, detail="Invalid payload")
    event_type = payload.get("type")
    data = payload.get("data", {})
    user_id = data.get("id")

    if not user_id:
        raise HTTPException(status_code=400, detail="Missing user id")

    get_supabase_client = get_supabase_client

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
