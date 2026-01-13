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
