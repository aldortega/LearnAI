from motor.motor_asyncio import AsyncIOMotorClient

from .config import settings


client = AsyncIOMotorClient(settings.mongodb_uri)

db = client[settings.database_name]


async def ensure_indexes() -> None:
    await db.users.create_index("email_normalized", unique=True)
    await db.users.create_index("username", unique=True)
    await db.sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.sessions.create_index("user_id")
    await db.sessions.create_index("token_hash", unique=True)
    await db.notebooks.create_index("owner_id")
    await db.notebooks.create_index("created_at")
    await db.documents.create_index("owner_id")
    await db.documents.create_index("notebook_id")
    await db.documents.create_index("status")
    await db.documents.create_index("created_at")
    await db.ingestion_jobs.create_index("document_id")
    await db.ingestion_jobs.create_index("status")
    await db.ingestion_jobs.create_index("created_at")
    await db.rag_queries.create_index("notebook_id")
    await db.rag_queries.create_index("created_at")
    await db.rag_conversations.create_index(
        [("owner_id", 1), ("notebook_id", 1)], unique=True
    )
    await db.rag_conversations.create_index("created_at")
    await db.rag_messages.create_index("conversation_id")
    await db.rag_messages.create_index("notebook_id")
    await db.rag_messages.create_index("owner_id")
    await db.rag_messages.create_index("created_at")
    await db.quiz_roadmaps.create_index(
        [("owner_id", 1), ("notebook_id", 1)], unique=True
    )
    await db.quiz_questions.create_index("level_id")
    await db.quiz_questions.create_index("unit_id")
    await db.quiz_questions.create_index("notebook_id")
    await db.quiz_attempts.create_index("level_id")
    await db.quiz_attempts.create_index("question_id")
    await db.quiz_attempts.create_index("owner_id")
    await db.quiz_level_progress.create_index(
        [("owner_id", 1), ("level_id", 1)], unique=True
    )
    await db.quiz_level_progress.create_index("notebook_id")
    await db.quiz_llm_payloads.create_index("notebook_id")
    await db.quiz_llm_payloads.create_index("owner_id")
    await db.quiz_llm_payloads.create_index("type")
    await db.quiz_llm_payloads.create_index("level_id")
