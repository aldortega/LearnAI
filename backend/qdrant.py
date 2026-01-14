import logging

import httpx

from .config import settings

logger = logging.getLogger(__name__)


async def ensure_qdrant_collection() -> None:
    async with httpx.AsyncClient(base_url=settings.qdrant_url, timeout=10) as client:
        collection_name = settings.qdrant_collection_name
        response = await client.get(f"/collections/{collection_name}")
        if response.status_code == 404:
            create_response = await client.put(
                f"/collections/{collection_name}",
                json={
                    "vectors": {
                        "size": settings.qdrant_vector_size,
                        "distance": settings.qdrant_distance,
                    }
                },
            )
            if create_response.status_code not in (200, 201):
                raise RuntimeError(
                    "No se pudo crear la colección de Qdrant: "
                    f"{create_response.status_code} {create_response.text}"
                )
            logger.info("Colección Qdrant creada: %s", collection_name)
        elif response.status_code != 200:
            raise RuntimeError(
                "No se pudo validar la colección de Qdrant: "
                f"{response.status_code} {response.text}"
            )

        for field_name in ("notebook_id", "owner_id", "document_id"):
            await ensure_payload_index(client, collection_name, field_name)


async def ensure_payload_index(
    client: httpx.AsyncClient, collection_name: str, field_name: str
) -> None:
    response = await client.put(
        f"/collections/{collection_name}/index",
        json={"field_name": field_name, "field_schema": "keyword"},
    )
    if response.status_code in (200, 201):
        return
    if response.status_code == 409:
        return
    raise RuntimeError(
        "No se pudo crear el índice de payload en Qdrant: "
        f"{response.status_code} {response.text}"
    )
