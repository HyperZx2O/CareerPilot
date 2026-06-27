import os

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from svix import Webhook

from backend.db.supabase_client import get_supabase_client
from backend.logger import get_logger

logger = get_logger("webhooks")

router = APIRouter()


class ClerkEmailAddress(BaseModel):
    email_address: str = ""


class ClerkUserData(BaseModel):
    id: str = ""
    email_addresses: list[ClerkEmailAddress] = []


class ClerkWebhookPayload(BaseModel):
    type: str = ""
    data: ClerkUserData = ClerkUserData()


@router.post("/api/webhooks/clerk")
async def clerk_webhook(request: Request):
    secret = os.getenv("CLERK_WEBHOOK_SECRET", "")
    if not secret or "your_" in secret:
        logger.error("CLERK_WEBHOOK_SECRET not configured — webhook endpoint disabled")
        raise HTTPException(status_code=501, detail="Webhook not configured")

    body = await request.body()
    svix_id = request.headers.get("svix-id")
    svix_timestamp = request.headers.get("svix-timestamp")
    svix_signature = request.headers.get("svix-signature")

    if not svix_id or not svix_timestamp or not svix_signature:
        raise HTTPException(status_code=400, detail="Missing signature header")

    try:
        wh = Webhook(secret)
        wh.verify(body.decode("utf-8"), {
            "svix-id": svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        })
    except Exception as e:
        logger.warning("Webhook signature verification failed: %s", e)
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        payload = ClerkWebhookPayload.model_validate_json(body)
    except Exception as e:
        logger.warning("Invalid payload: %s", e)
        raise HTTPException(status_code=400, detail="Invalid payload")

    event_type = payload.type
    data = payload.data
    user_id = data.id

    if not user_id:
        raise HTTPException(status_code=400, detail="Missing user id")

    supabase = get_supabase_client()

    if event_type == "user.created":
        existing = supabase.table("users").select("id").eq("id", user_id).limit(1).execute()
        if not existing.data:
            email = data.email_addresses[0].email_address if data.email_addresses else ""
            supabase.table("users").insert({
                "clerk_id": user_id,
                "email": email,
            }).execute()
            logger.info("Created user %s via Clerk webhook", user_id)
        return {"ok": True, "action": "created"}

    if event_type == "user.updated":
        email = data.email_addresses[0].email_address if data.email_addresses else ""
        supabase.table("users").update({
            "email": email,
        }).eq("clerk_id", user_id).execute()
        logger.info("Updated user %s via Clerk webhook", user_id)
        return {"ok": True, "action": "updated"}

    logger.info("Unhandled Clerk event type: %s", event_type)
    return {"ok": True, "action": "ignored"}
