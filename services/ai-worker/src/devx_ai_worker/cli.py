from __future__ import annotations

import asyncio
import json

from devx_ai_worker.workflow import AiTaskWorkflow


async def run_demo() -> None:
    workflow = AiTaskWorkflow(timeout=30, verbose=False)
    result = await workflow.run(
        task={
            "task_id": "local-demo-task",
            "app_id": "education-web",
            "feature_key": "lesson.explain",
            "schema_version": "v1",
            "payload": {
                "lessonText": "Plants use sunlight, water, and carbon dioxide to make sugar.",
                "question": "What does sunlight help the plant do?",
            },
        }
    )
    print(json.dumps(result, indent=2))


def main() -> None:
    asyncio.run(run_demo())
