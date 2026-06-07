from celery import Celery
import os

REDIS_URL = os.getenv("REDIS_URL", os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0"))

celery = Celery(
    "careerpilot",
    broker=REDIS_URL,
    backend=REDIS_URL
)

# Basic production-friendly defaults. Users may override via env vars.
celery.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    result_expires=int(os.getenv("CELERY_RESULT_EXPIRES", "3600")),
    task_acks_late=bool(os.getenv("CELERY_ACKS_LATE", "True") == "True"),
    worker_max_tasks_per_child=int(os.getenv("CELERY_MAX_TASKS_PER_CHILD", "100")),
    task_time_limit=int(os.getenv("CELERY_TASK_TIME_LIMIT", "300")),
)
