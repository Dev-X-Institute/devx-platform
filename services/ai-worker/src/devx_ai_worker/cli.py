from __future__ import annotations

import asyncio
import json

from devx_ai_worker.workflow import AiTaskWorkflow


async def run_demo() -> None:
    workflow = AiTaskWorkflow(timeout=30, verbose=False)
    result = await workflow.run(
        task={
            "task_id": "local-demo-task",
            "created_by": "00000000-0000-4000-8000-000000000001",
            "app_id": "education-web",
            "feature_key": "lesson.explain",
            "schema_version": "v1",
            "payload": {
                "lesson_id": "offline-demo-lesson",
                "question": "What does sunlight help the plant do?",
            },
            "authorized_context": {
                "lesson_text": "Plants use sunlight, water, and carbon dioxide to make sugar."
            },
        }
    )
    print(json.dumps(result, indent=2))


def main() -> None:
    asyncio.run(run_demo())
