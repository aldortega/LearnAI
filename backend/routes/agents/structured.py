import asyncio
from collections.abc import Awaitable, Sequence
from typing import TypeVar

from langchain_core.messages import BaseMessage
from pydantic import BaseModel

from ...config import LLMProvider
from ..rag import create_llm

ModelT = TypeVar("ModelT", bound=BaseModel)
ResultT = TypeVar("ResultT")


async def invoke_structured(
    schema: type[ModelT], messages: list[BaseMessage], provider: LLMProvider
) -> ModelT:
    structured_llm = create_llm(provider).with_structured_output(
        schema=schema.model_json_schema(),
        method="json_schema",
    )
    payload = await asyncio.to_thread(structured_llm.invoke, messages)
    if isinstance(payload, BaseModel):
        payload = payload.model_dump()
    return schema.model_validate(payload)


async def gather_limited(
    tasks: Sequence[Awaitable[ResultT]], limit: int
) -> list[ResultT | BaseException]:
    semaphore = asyncio.Semaphore(max(1, limit))

    async def run(task: Awaitable[ResultT]) -> ResultT:
        async with semaphore:
            return await task

    return await asyncio.gather(*(run(task) for task in tasks), return_exceptions=True)
