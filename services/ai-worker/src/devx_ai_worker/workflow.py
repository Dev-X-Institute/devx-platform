from __future__ import annotations

from typing import Any

from llama_index.core.workflow import Event, StartEvent, StopEvent, Workflow, step  # pyright: ignore[reportMissingImports]

from devx_ai_worker.apps.education_web import HANDLERS
from devx_ai_worker.contracts import TaskEnvelope
from devx_ai_worker.providers.factory import create_provider


class ValidatedTask(Event):
    task: dict[str, Any]


class AiTaskWorkflow(Workflow):
    """Shared, bounded orchestration shell; app behavior lives in handlers."""

    @step
    async def validate_and_route(self, event: StartEvent) -> ValidatedTask:
        raw_task = event.task
        if not isinstance(raw_task, dict):
            raise ValueError("Workflow requires a task object")
        task = TaskEnvelope.from_mapping(raw_task)
        if task.schema_version != "v1":
            raise ValueError("Unsupported task schema version")
        if (task.app_id, task.feature_key) not in HANDLERS:
            raise ValueError("Unsupported app or feature")
        return ValidatedTask(task=raw_task)

    @step
    async def execute_feature(self, event: ValidatedTask) -> StopEvent:
        task = TaskEnvelope.from_mapping(event.task)
        handler = HANDLERS[(task.app_id, task.feature_key)]
        provider_request = handler.prepare(task)
        response = await create_provider().complete(provider_request)
        result = handler.parse_result(response)
        return StopEvent(
            result={
                "task_id": task.task_id,
                "app_id": task.app_id,
                "feature_key": task.feature_key,
                "status": "succeeded",
                "result": result,
            }
        )
