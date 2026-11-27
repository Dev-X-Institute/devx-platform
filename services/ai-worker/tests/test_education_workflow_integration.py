from __future__ import annotations

import os
import unittest
from unittest.mock import patch

from devx_ai_worker.workflow import AiTaskWorkflow


TASK_ID = "6a56eae8-6a24-4db3-a0bf-63bfabf28488"
USER_ID = "29c56410-dba0-4a7a-aa85-aa161a871479"
LESSON_ID = "d0176a76-35d6-4ee7-87d8-6bcac8a71bf6"
LESSON_TEXT = "A force is a push or pull that can change an object's motion."


class EducationWorkflowIntegrationTests(unittest.IsolatedAsyncioTestCase):
    async def run_task(self, feature_key: str, payload: dict[str, object]) -> dict[str, object]:
        task = {
            "task_id": TASK_ID,
            "created_by": USER_ID,
            "app_id": "education-web",
            "feature_key": feature_key,
            "schema_version": "v1",
            "payload": {"lesson_id": LESSON_ID, **payload},
            "authorized_context": {"lesson_text": LESSON_TEXT},
        }
        with patch.dict(os.environ, {"AI_PROVIDER": "mock"}):
            workflow = AiTaskWorkflow(timeout=30, verbose=False)
            return await workflow.run(task=task)

    async def test_worker_workflow_explains_a_mock_lesson(self) -> None:
        output = await self.run_task(
            "lesson.explain",
            {"question": "What is a force?"},
        )

        self.assertEqual(output["task_id"], TASK_ID)
        self.assertEqual(output["app_id"], "education-web")
        self.assertEqual(output["feature_key"], "lesson.explain")
        self.assertEqual(output["status"], "succeeded")
        self.assertEqual(
            output["result"],
            {"answer": "Mock explanation for: What is a force?"},
        )

    async def test_worker_workflow_drafts_a_mock_quiz_for_review(self) -> None:
        output = await self.run_task("quiz.generate", {"count": 2})

        self.assertEqual(output["task_id"], TASK_ID)
        self.assertEqual(output["feature_key"], "quiz.generate")
        self.assertEqual(output["status"], "succeeded")
        result = output["result"]
        self.assertIsInstance(result, dict)
        self.assertEqual(result["reviewRequired"], True)
        questions = result["questions"]
        self.assertEqual(len(questions), 2)
        self.assertTrue(all(len(question["options"]) == 4 for question in questions))


if __name__ == "__main__":
    unittest.main()
