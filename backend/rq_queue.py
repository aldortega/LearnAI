from redis import Redis
from rq import Queue

from .config import settings

redis_client = Redis.from_url(settings.redis_url)
queue = Queue("ingestion", connection=redis_client)
quiz_queue = Queue("quiz", connection=redis_client)
quickstart_queue = Queue("quickstart", connection=redis_client)
reports_queue = Queue("reports", connection=redis_client)
presentations_queue = Queue("presentations", connection=redis_client)
mindmap_queue = Queue("mindmap", connection=redis_client)
flashcards_queue = Queue("flashcards", connection=redis_client)
audio_queue = Queue("audio", connection=redis_client)
