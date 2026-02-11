from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from ...db import db
from ...schemas.quiz import RoadmapLevelOut, RoadmapOut, RoadmapUnitOut

async def build_roadmap_response(
    roadmap: dict,
    user: dict,
    db_client: AsyncIOMotorDatabase | None = None,
) -> RoadmapOut:
    db_ref = db if db_client is None else db_client
    progress_cursor = db_ref.quiz_level_progress.find(
        {"owner_id": user["_id"], "notebook_id": roadmap["notebook_id"]}
    )
    progress_docs = [doc async for doc in progress_cursor]
    progress_by_level = {doc["level_id"]: doc for doc in progress_docs}

    units_out: list[RoadmapUnitOut] = []
    for unit in roadmap.get("units", []):
        levels_out: list[RoadmapLevelOut] = []
        for level in unit.get("levels", []):
            progress = progress_by_level.get(level["id"])
            status_value = progress["status"] if progress else "locked"
            best_score = progress.get("best_score") if progress else None
            questions_status = progress.get("questions_status") if progress else None
            if questions_status is None:
                questions_status = "idle"
            levels_out.append(
                RoadmapLevelOut(
                    id=level["id"],
                    unit_id=level["unit_id"],
                    title=level["title"],
                    type=level["type"],
                    order=level["order"],
                    passing_score=level["passing_score"],
                    status=status_value,
                    best_score=best_score,
                    questions_status=questions_status,
                )
            )
        units_out.append(
            RoadmapUnitOut(
                id=unit["id"],
                title=unit["title"],
                description=unit["description"],
                order=unit["order"],
                levels=levels_out,
            )
        )

    return RoadmapOut(
        id=str(roadmap["_id"]),
        notebook_id=str(roadmap["notebook_id"]),
        owner_id=str(roadmap["owner_id"]),
        title=roadmap["title"],
        units=units_out,
        created_at=roadmap["created_at"],
        updated_at=roadmap["updated_at"],
    )


async def unlock_next_levels(
    roadmap: dict, level: dict, user: dict, notebook_id: ObjectId
) -> list[str]:
    unlocked: list[str] = []
    unit_id = level["unit_id"]
    units = roadmap.get("units", [])
    unit_index = next(
        (index for index, item in enumerate(units) if item.get("id") == unit_id),
        None,
    )
    if unit_index is None:
        return unlocked

    target_levels: list[str] = []
    unit_levels = sorted(
        units[unit_index].get("levels", []), key=lambda item: item.get("order", 0)
    )

    if level["type"] == "lesson":
        current_index = next(
            (
                index
                for index, item in enumerate(unit_levels)
                if item.get("id") == level["id"]
            ),
            None,
        )
        if current_index is not None and current_index + 1 < len(unit_levels):
            target_levels.append(unit_levels[current_index + 1]["id"])
    else:
        if unit_index + 1 < len(units):
            next_unit_levels = sorted(
                units[unit_index + 1].get("levels", []),
                key=lambda item: item.get("order", 0),
            )
            if next_unit_levels:
                target_levels.append(next_unit_levels[0]["id"])

    now = datetime.now(timezone.utc)
    for level_id in target_levels:
        result = await db.quiz_level_progress.update_one(
            {
                "owner_id": user["_id"],
                "notebook_id": notebook_id,
                "level_id": level_id,
                "status": "locked",
            },
            {"$set": {"status": "unlocked", "updated_at": now}},
        )
        if result.modified_count:
            unlocked.append(level_id)

    return unlocked
