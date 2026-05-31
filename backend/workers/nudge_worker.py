import asyncio
from .celery_app import celery
from backend.services.nudge import check_and_send_nudge

@celery.task(name="send_nudge")
def send_nudge(user_id: str):
    asyncio.run(check_and_send_nudge(user_id))
