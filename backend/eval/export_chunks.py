import argparse
import asyncio
from pathlib import Path

import httpx
from pydantic import BaseModel

from ..config import settings

RESULTS_DIR = Path(__file__).resolve().parent / "results" / "chunks"
SCROLL_PAGE_SIZE = 100


class ExportedChunk(BaseModel):
    document_id: str
    chunk_id: int
    file_name: str
    text: str


async def fetch_notebook_chunks(notebook_id: str) -> list[ExportedChunk]:
    chunks: list[ExportedChunk] = []
    offset: str | int | None = None
    async with httpx.AsyncClient(base_url=settings.qdrant_url, timeout=20) as client:
        while True:
            body: dict[str, object] = {
                "limit": SCROLL_PAGE_SIZE,
                "with_payload": ["document_id", "chunk_id", "file_name", "text"],
                "with_vector": False,
                "filter": {"must": [{"key": "notebook_id", "match": {"value": notebook_id}}]},
            }
            if offset is not None:
                body["offset"] = offset
            response = await client.post(
                f"/collections/{settings.qdrant_collection_name}/points/scroll", json=body
            )
            response.raise_for_status()
            result = response.json()["result"]
            chunks += [
                ExportedChunk(
                    document_id=str(point["payload"].get("document_id", "")),
                    chunk_id=int(point["payload"].get("chunk_id", 0)),
                    file_name=str(point["payload"].get("file_name", "")),
                    text=str(point["payload"].get("text", "")),
                )
                for point in result["points"]
            ]
            offset = result.get("next_page_offset")
            if offset is None:
                break
    return sorted(chunks, key=lambda chunk: (chunk.file_name, chunk.chunk_id))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Exporta los fragmentos indexados de un notebook para armar el dataset"
    )
    parser.add_argument("--notebook-id", required=True)
    return parser.parse_args()


async def main() -> None:
    args = parse_args()
    chunks = await fetch_notebook_chunks(args.notebook_id)
    if not chunks:
        raise SystemExit(f"El notebook no tiene fragmentos indexados: {args.notebook_id}")
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    output_path = RESULTS_DIR / f"{args.notebook_id}.jsonl"
    output_path.write_text(
        "".join(chunk.model_dump_json() + "\n" for chunk in chunks), encoding="utf-8"
    )
    print(f"{len(chunks)} fragmentos en {output_path}")


if __name__ == "__main__":
    asyncio.run(main())
