from rq import SimpleWorker

from .rq_queue import redis_client


if __name__ == "__main__":
    worker = SimpleWorker(["ingestion", "quiz"], connection=redis_client)
    worker.work()
