from redis import Redis
from rq import Queue

from .config import settings

redis_client = Redis.from_url(settings.redis_url)
queue = Queue("ingestion", connection=redis_client)
