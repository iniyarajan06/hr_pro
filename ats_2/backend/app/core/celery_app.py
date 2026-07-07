from celery import Celery
from app.core.config import settings

import ssl
broker_use_ssl = {'ssl_cert_reqs': ssl.CERT_NONE} if settings.REDIS_URL.startswith("rediss") else None
celery_app = Celery(
    "ats_worker", 
    broker=settings.REDIS_URL, 
    backend=settings.REDIS_URL, 
    broker_use_ssl=broker_use_ssl, 
    redis_backend_use_ssl=broker_use_ssl,
    include=[
        "app.tasks.parse_resume_task",
        "app.tasks.extract_zip_task",
        "app.tasks.score_task"
    ]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_routes={
        "app.tasks.parse_resume_task.parse_resume": {"queue": "parsing"},
        "app.tasks.extract_zip_task.extract_zip": {"queue": "parsing"},
        "app.tasks.score_task.score_batch": {"queue": "scoring"},
    }
)
