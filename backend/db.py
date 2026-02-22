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
    await db.notebook_memberships.create_index("member_id")
    await db.notebook_memberships.create_index("owner_id")
    await db.notebook_memberships.create_index("notebook_id")
    await db.notebook_memberships.create_index(
        [("notebook_id", 1), ("member_id", 1)],
        unique=True,
        partialFilterExpression={"revoked_at": None},
    )
    await db.notebook_invitations.create_index("notebook_id")
    await db.notebook_invitations.create_index("owner_id")
    await db.notebook_invitations.create_index("invitee_id")
    await db.notebook_invitations.create_index("status")
    await db.notebook_invitations.create_index("expires_at")
    await db.notebook_invitations.create_index("created_at")
    await db.notebook_invitations.create_index(
        [("notebook_id", 1), ("invitee_id", 1)],
        unique=True,
        partialFilterExpression={"status": "pending"},
    )
    await db.notifications.create_index("user_id")
    await db.notifications.create_index("created_at")
    await db.notifications.create_index(
        [("user_id", 1), ("is_read", 1), ("created_at", -1)]
    )
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
    quiz_progress_indexes = await db.quiz_level_progress.index_information()
    if "owner_id_1_level_id_1" in quiz_progress_indexes:
        await db.quiz_level_progress.drop_index("owner_id_1_level_id_1")
    await db.quiz_level_progress.create_index(
        [("owner_id", 1), ("notebook_id", 1), ("level_id", 1)], unique=True
    )
    await db.quiz_level_progress.create_index("notebook_id")
    await db.quiz_generation_jobs.create_index("job_id", unique=True)
    await db.quiz_generation_jobs.create_index("owner_id")
    await db.quiz_generation_jobs.create_index("notebook_id")
    await db.quiz_generation_jobs.create_index("status")
    await db.quiz_generation_jobs.create_index("created_at")
    await db.quiz_llm_payloads.create_index("notebook_id")
    await db.quiz_llm_payloads.create_index("owner_id")
    await db.quiz_llm_payloads.create_index("type")
    await db.quiz_llm_payloads.create_index("level_id")
    await db.quickstart_summaries.create_index(
        [("owner_id", 1), ("notebook_id", 1)], unique=True
    )
    await db.quickstart_summaries.create_index("updated_at")
    await db.quickstart_expansions.create_index(
        [
            ("owner_id", 1),
            ("notebook_id", 1),
            ("topic_id", 1),
            ("sources_fingerprint", 1),
        ],
        unique=True,
    )
    await db.quickstart_expansions.create_index("updated_at")
    await db.quickstart_topic_details.create_index(
        [
            ("owner_id", 1),
            ("notebook_id", 1),
            ("topic_id", 1),
            ("item_type", 1),
            ("item_text_normalized", 1),
            ("sources_fingerprint", 1),
        ],
        unique=True,
    )
    await db.quickstart_topic_details.create_index("updated_at")
    await db.quickstart_generation_jobs.create_index("job_id", unique=True)
    await db.quickstart_generation_jobs.create_index("owner_id")
    await db.quickstart_generation_jobs.create_index("notebook_id")
    await db.quickstart_generation_jobs.create_index("status")
    await db.quickstart_generation_jobs.create_index("created_at")
    await db.mindmap_maps.create_index(
        [("owner_id", 1), ("notebook_id", 1)], unique=True
    )
    await db.mindmap_maps.create_index("updated_at")
    await db.mindmap_maps.create_index("sources_fingerprint")
    await db.mindmap_generation_jobs.create_index("job_id", unique=True)
    await db.mindmap_generation_jobs.create_index("owner_id")
    await db.mindmap_generation_jobs.create_index("notebook_id")
    await db.mindmap_generation_jobs.create_index("status")
    await db.mindmap_generation_jobs.create_index("created_at")
    await db.mindmap_node_details.create_index(
        [
            ("owner_id", 1),
            ("notebook_id", 1),
            ("node_id", 1),
            ("sources_fingerprint", 1),
        ],
        unique=True,
    )
    await db.mindmap_node_details.create_index("updated_at")
    await db.flashcard_sets.create_index(
        [("owner_id", 1), ("notebook_id", 1)], unique=True
    )
    await db.flashcard_sets.create_index("owner_id")
    await db.flashcard_sets.create_index("notebook_id")
    await db.flashcard_sets.create_index("updated_at")
    await db.flashcard_sets.create_index("sources_fingerprint")
    await db.flashcard_generation_jobs.create_index("job_id", unique=True)
    await db.flashcard_generation_jobs.create_index("owner_id")
    await db.flashcard_generation_jobs.create_index("notebook_id")
    await db.flashcard_generation_jobs.create_index("status")
    await db.flashcard_generation_jobs.create_index("created_at")
    await db.flashcard_explanations.create_index(
        [("owner_id", 1), ("notebook_id", 1), ("card_id", 1), ("sources_fingerprint", 1)],
        unique=True,
    )
    await db.flashcard_explanations.create_index("updated_at")
    await db.password_resets.create_index("expires_at", expireAfterSeconds=0)
    await db.password_resets.create_index("token_hash", unique=True)
    await db.password_resets.create_index("user_id")
    await db.password_resets.create_index("email_normalized")
    await db.password_resets.create_index([("email_normalized", 1), ("created_at", -1)])
    await db.reports.create_index(
        [("owner_id", 1), ("notebook_id", 1), ("created_at", -1)]
    )
    await db.reports.create_index("owner_id")
    await db.reports.create_index("notebook_id")
    await db.reports.create_index("created_at")
    await db.reports.create_index("sources_fingerprint")
    await db.report_generation_jobs.create_index("job_id", unique=True)
    await db.report_generation_jobs.create_index("owner_id")
    await db.report_generation_jobs.create_index("notebook_id")
    await db.report_generation_jobs.create_index("status")
    await db.report_generation_jobs.create_index("created_at")
    await db.report_suggestion_generation_jobs.create_index("job_id", unique=True)
    await db.report_suggestion_generation_jobs.create_index("owner_id")
    await db.report_suggestion_generation_jobs.create_index("notebook_id")
    await db.report_suggestion_generation_jobs.create_index("status")
    await db.report_suggestion_generation_jobs.create_index("created_at")
    await db.report_suggestions.create_index(
        [("owner_id", 1), ("notebook_id", 1)], unique=True
    )
    await db.report_suggestions.create_index("sources_fingerprint")
    await db.report_suggestions.create_index("updated_at")
